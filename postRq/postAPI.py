import os
import sys
import time
import json
import threading
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional
from logging.handlers import RotatingFileHandler

import requests

# Allow importing queue_store from project root
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from queue_store import SQLiteQueue


API_URL = "http://192.168.1.169:7000/ics/taskOrder/addTask"
DB_PATH = "../queues.db"  # relative to this script folder
ORDER_ID_FILE = os.path.join(os.path.dirname(__file__), "order_id.txt")
TOPICS = ["stable_pairs", "stable_dual"]  # Subscribe to both topics


def setup_post_api_logger(log_dir: str = "../logs") -> logging.Logger:
    """Thiết lập logger cho Post API"""
    # Tạo thư mục logs nếu chưa có
    os.makedirs(log_dir, exist_ok=True)
    
    # Tạo logger
    logger = logging.getLogger('post_api')
    logger.setLevel(logging.INFO)
    
    # Tránh duplicate handlers
    if logger.handlers:
        return logger
    
    # Tạo formatter
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - [%(funcName)s:%(lineno)d] - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    # File handler với rotating
    file_handler = RotatingFileHandler(
        os.path.join(log_dir, 'post_api.log'),
        maxBytes=10*1024*1024,  # 10MB
        backupCount=5
    )
    file_handler.setLevel(logging.INFO)
    file_handler.setFormatter(formatter)
    
    # Console handler
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(formatter)
    
    # Thêm handlers vào logger
    logger.addHandler(file_handler)
    logger.addHandler(console_handler)
    
    return logger


def ensure_dirs() -> None:
    os.makedirs(os.path.dirname(ORDER_ID_FILE), exist_ok=True)


def get_next_order_id() -> int:
    """Persistent, monotonically increasing integer orderId."""
    ensure_dirs()
    if not os.path.exists(ORDER_ID_FILE):
        with open(ORDER_ID_FILE, "w", encoding="utf-8") as f:
            f.write("1")
        return 1
    try:
        with open(ORDER_ID_FILE, "r+", encoding="utf-8") as f:
            content = f.read().strip() or "0"
            current = int(content)
            next_id = current + 1
            f.seek(0)
            f.write(str(next_id))
            f.truncate()
            return next_id
    except Exception:
        # Fallback: reset to 1 if file corrupted
        with open(ORDER_ID_FILE, "w", encoding="utf-8") as f:
            f.write("1")
        return 1


def list_keys(queue: SQLiteQueue, topic: str) -> List[str]:
    with queue._connect() as conn:
        cur = conn.execute(
            "SELECT DISTINCT key FROM messages WHERE topic = ? ORDER BY key",
            (topic,),
        )
        return [row[0] for row in cur.fetchall()]


def get_latest_topic_row(queue: SQLiteQueue, topic: str) -> Optional[Dict[str, Any]]:
    with queue._connect() as conn:
        cur = conn.execute(
            """
            SELECT id, key, payload, created_at FROM messages
            WHERE topic = ?
            ORDER BY id DESC
            LIMIT 1
            """,
            (topic,),
        )
        row = cur.fetchone()
        if not row:
            return None
        return {"id": row[0], "key": row[1], "payload": json.loads(row[2]), "created_at": row[3]}


def get_after_id_topic(queue: SQLiteQueue, topic: str, after_id: int, limit: int = 100) -> List[Dict[str, Any]]:
    """Fetch rows for a topic with id > after_id, ordered by id ASC regardless of key."""
    with queue._connect() as conn:
        cur = conn.execute(
            """
            SELECT id, key, payload, created_at FROM messages
            WHERE topic = ? AND id > ?
            ORDER BY id ASC
            LIMIT ?
            """,
            (topic, after_id, limit),
        )
        rows = cur.fetchall()
        result: List[Dict[str, Any]] = []
        for r in rows:
            result.append({"id": r[0], "key": r[1], "payload": json.loads(r[2]), "created_at": r[3]})
        return result


def build_payload_from_pair(pair_id: str, start_slot: str, end_slot: str, order_id: int) -> Dict[str, Any]:
    """Build payload cho regular stable_pairs"""
    task_path = f"{start_slot},{end_slot}"
    return {
        "modelProcessCode": "checking_camera_work",
        "fromSystem": "ICS",
        "orderId": str(order_id),
        "taskOrderDetail": [
            {
                "taskPath": task_path
            }
        ]
    }


def build_payload_from_dual(dual_payload: Dict[str, Any], order_id: int) -> Dict[str, Any]:
    """Build payload cho stable_dual (2-point hoặc 4-point)"""
    # Lấy các QR codes từ dual payload
    start_slot = dual_payload.get("start_slot", "")
    end_slot = dual_payload.get("end_slot", "")
    start_slot_2 = dual_payload.get("start_slot_2", "")
    end_slot_2 = dual_payload.get("end_slot_2", "")
    
    # Xác định đây là dual-2p hay dual-4p
    if start_slot_2 and end_slot_2:
        # 4-point dual: bao gồm cả 4 QR codes
        task_path = f"{start_slot},{end_slot},{start_slot_2},{end_slot_2}"
    else:
        # 2-point dual: chỉ có 2 QR codes đầu tiên
        task_path = f"{start_slot},{end_slot}"
    
    return {
        "modelProcessCode": "checking_camera_work",
        "fromSystem": "ICS",
        "orderId": str(order_id),
        "taskOrderDetail": [
            {
                "taskPath": task_path
            }
        ]
    }


# Backward compatibility
def build_payload(pair_id: str, start_slot: str, end_slot: str, order_id: int) -> Dict[str, Any]:
    """Backward compatibility cho regular pairs"""
    return build_payload_from_pair(pair_id, start_slot, end_slot, order_id)


def send_unlock_after_delay(queue: SQLiteQueue, pair_id: str, start_slot: str, delay_seconds: int = 60) -> None:
    """
    Gửi unlock message vào queue sau delay_seconds giây
    
    Args:
        queue: SQLiteQueue instance
        pair_id: ID của pair
        start_slot: QR code của ô start (dạng string)
        delay_seconds: Thời gian delay (mặc định 60s = 1 phút)
    """
    def _delayed_unlock():
        time.sleep(delay_seconds)
        try:
            unlock_payload = {
                "pair_id": pair_id,
                "start_slot": start_slot,
                "reason": "post_failed_after_retries",
                "timestamp": datetime.now().isoformat()
            }
            queue.publish("unlock_start_slot", start_slot, unlock_payload)
            print(f"[UNLOCK_SCHEDULED] Đã gửi unlock message cho start_slot={start_slot} sau {delay_seconds}s")
        except Exception as e:
            print(f"[ERR] Lỗi khi gửi unlock message: {e}")
    
    # Tạo thread để delay và gửi unlock
    thread = threading.Thread(target=_delayed_unlock, daemon=True)
    thread.start()


def send_post(payload: Dict[str, Any], logger: logging.Logger = None) -> bool:
    if logger is None:
        logger = logging.getLogger('post_api')
        
    headers = {"Content-Type": "application/json"}
    
    # Log payload details
    order_id = payload.get('orderId', 'N/A')
    task_path = payload.get('taskOrderDetail', [{}])[0].get('taskPath', 'N/A')
    
    logger.info(f"=== POST REQUEST ===\nURL: {API_URL}\nOrderID: {order_id}\nTaskPath: {task_path}")
    logger.info(f"Full Payload: {json.dumps(payload, indent=2, ensure_ascii=False)}")
    
    try:
        payload_json = json.dumps(payload)
        logger.info(f"Sending JSON ({len(payload_json)} bytes): {payload_json}")
        
        resp = requests.post(API_URL, headers=headers, data=payload_json, timeout=10)
        
        # Log response details
        logger.info(f"=== POST RESPONSE ===\nStatus Code: {resp.status_code}\nHeaders: {dict(resp.headers)}")
        
        status_ok = (200 <= resp.status_code < 300)
        try:
            body = resp.json()
            logger.info(f"Response Body (JSON): {json.dumps(body, indent=2, ensure_ascii=False)}")
        except Exception as e:
            body = {"raw": resp.text}
            logger.warning(f"Failed to parse JSON response: {e}")
            logger.info(f"Response Body (Raw): {resp.text}")

        if status_ok:
            # If API has code=1000 convention, consider it success; else accept 2xx
            code = body.get("code") if isinstance(body, dict) else None
            # if code is None or code == 1000:
            if code is None or code == 2009:
                success_msg = f"[SUCCESS] ✓ POST thành công | OrderID: {payload['orderId']} | TaskPath: {payload['taskOrderDetail'][0]['taskPath']} | Code: {code}"
                logger.info(success_msg)
                logger.info(f"[SUCCESS] API Response: {json.dumps(body, ensure_ascii=False)}")
                print(success_msg)
                return True
            else:
                warn_msg = f"[WARNING] ⚠ POST 2xx nhưng code không hợp lệ | OrderID: {payload['orderId']} | Expected: 2009, Got: {code}"
                logger.warning(warn_msg)
                logger.warning(f"[WARNING] API Response: {json.dumps(body, ensure_ascii=False)}")
                print(warn_msg)
                return False
        else:
            error_msg = f"[ERROR] ✗ HTTP {resp.status_code} | OrderID: {payload['orderId']} | TaskPath: {payload['taskOrderDetail'][0]['taskPath']}"
            logger.error(error_msg)
            logger.error(f"[ERROR] API Response: {json.dumps(body, ensure_ascii=False)}")
            print(error_msg)
            return False
    except requests.exceptions.Timeout:
        timeout_msg = f"[ERROR] ✗ Request timeout sau 10s | OrderID: {payload['orderId']}"
        logger.error(timeout_msg)
        print(timeout_msg)
        return False
    except requests.exceptions.ConnectionError as e:
        conn_msg = f"[ERROR] ✗ Connection error | OrderID: {payload['orderId']} | Error: {e}"
        logger.error(conn_msg)
        print(conn_msg)
        return False
    except Exception as e:
        error_msg = f"[ERROR] ✗ Unexpected exception | OrderID: {payload['orderId']} | Error: {e}"
        logger.error(error_msg)
        print(error_msg)
        return False


def main() -> int:
    # Thiết lập logger
    logger = setup_post_api_logger()
    
    logger.info("PostAPI Runner - consuming stable_pairs and stable_dual, POSTing to API")
    logger.info(f"DB: {DB_PATH} | API: {API_URL} | Topics: {TOPICS}")
    print("PostAPI Runner - consuming stable_pairs and stable_dual, POSTing to API")
    print(f"DB: {DB_PATH} | API: {API_URL} | Topics: {TOPICS}")
    
    queue = SQLiteQueue(DB_PATH)

    # Track latest global id for each topic separately
    last_global_ids: Dict[str, int] = {}
    
    for topic in TOPICS:
        latest_row = get_latest_topic_row(queue, topic)
        if latest_row:
            last_global_ids[topic] = latest_row["id"]
            start_msg = f"Starting {topic} from id={latest_row['id']}"
            logger.info(start_msg)
            print(start_msg)
        else:
            last_global_ids[topic] = 0
            wait_msg = f"No existing rows for {topic}. Waiting for new data..."
            logger.info(wait_msg)
            print(wait_msg)

    try:
        while True:
            # Process each topic
            for topic in TOPICS:
                # Read new rows for this topic in global order
                rows = get_after_id_topic(queue, topic, last_global_ids[topic], limit=200)
                
                for r in rows:
                    payload = r["payload"]
                    last_global_ids[topic] = r["id"]
                    
                    # Log message processing start
                    logger.info(f"\n{'='*60}")
                    logger.info(f"XỬ LÝ MESSAGE MỚI | Topic: {topic} | ID: {r['id']} | Created: {r.get('created_at', 'N/A')}")
                    logger.info(f"Raw Payload: {json.dumps(payload, indent=2, ensure_ascii=False)}")
                    logger.info(f"{'='*60}")
                    
                    # Xử lý dựa trên topic type
                    if topic == "stable_pairs":
                        # Xử lý regular stable pairs
                        pair_id = payload.get("pair_id", r.get("key", ""))
                        start_slot = str(payload.get("start_slot", ""))
                        end_slot = str(payload.get("end_slot", ""))
                        
                        if not start_slot or not end_slot:
                            logger.warning(f"[SKIP] Invalid pair payload: {payload}")
                            continue
                        
                        order_id = get_next_order_id()
                        body = build_payload_from_pair(pair_id, start_slot, end_slot, order_id)
                        
                        logger.info(f"Bắt đầu xử lý regular pair: {pair_id}, orderId={order_id}")
                        
                    elif topic == "stable_dual":
                        # Xử lý dual pairs (2-point hoặc 4-point)
                        dual_id = payload.get("dual_id", r.get("key", ""))
                        start_slot = str(payload.get("start_slot", ""))
                        end_slot = str(payload.get("end_slot", ""))
                        start_slot_2 = payload.get("start_slot_2", "")
                        end_slot_2 = payload.get("end_slot_2", "")
                        
                        if not start_slot or not end_slot:
                            logger.warning(f"[SKIP] Invalid dual payload: {payload}")
                            continue
                        
                        # Xác định loại dual
                        dual_type = "4-point" if start_slot_2 and end_slot_2 else "2-point"
                        
                        order_id = get_next_order_id()
                        body = build_payload_from_dual(payload, order_id)
                        
                        task_path = body["taskOrderDetail"][0]["taskPath"]
                        logger.info(f"Bắt đầu xử lý {dual_type} dual: {dual_id}, orderId={order_id}, taskPath={task_path}")
                        
                        # Sử dụng dual_id làm pair_id cho unlock logic
                        pair_id = dual_id
                    
                    else:
                        logger.warning(f"Unknown topic: {topic}")
                        continue
                    
                    # Common retry logic for both types
                    ok = False
                    logger.info(f"Bắt đầu retry logic cho OrderID: {order_id}")
                    
                    for attempt in range(3):
                        logger.info(f"\n--- Lần thử {attempt + 1}/3 cho OrderID: {order_id} ---")
                        if send_post(body, logger):
                            ok = True
                            success_complete_msg = f"\n✓ HOÀN THÀNH THÀNH CÔNG | {topic} | OrderID: {order_id} | Attempt: {attempt + 1}/3"
                            logger.info(success_complete_msg)
                            logger.info(f"✓ Message đã được xử lý thành công và gửi tới API")
                            print(success_complete_msg)
                            break
                        else:
                            retry_msg = f"⚠ Lần thử {attempt + 1} thất bại, {2 if attempt < 2 else 0} giây trước khi thử lại..."
                            logger.warning(retry_msg)
                            if attempt < 2:  # Don't sleep after last attempt
                                time.sleep(2)
                    
                    if not ok:
                        fail_msg = f"\n✗ THẤT BẠI HOÀN TOÀN | {topic}={pair_id} | OrderID: {order_id} | Đã thử 3 lần"
                        logger.error(fail_msg)
                        print(fail_msg)
                        
                        # Gửi unlock message sau 1 phút (sử dụng start_slot)
                        unlock_msg = f"[UNLOCK_SCHEDULE] Sẽ unlock start_slot={start_slot} sau 60 giây do POST thất bại"
                        logger.warning(unlock_msg)
                        print(unlock_msg)
                        send_unlock_after_delay(queue, pair_id, start_slot, delay_seconds=60)
                    
                    # End of message processing
                    logger.info(f"{'='*60}\nKẾT THÚC XỬ LÝ MESSAGE | ID: {r['id']} | Status: {'SUCCESS' if ok else 'FAILED'}\n{'='*60}\n")
                    print(f"--- Message {r['id']} hoàn tất: {'THÀNH CÔNG' if ok else 'THẤT BẠI'} ---\n")
            
            time.sleep(0.5)
    except KeyboardInterrupt:
        stop_msg = "\nStopped by user."
        logger.info(stop_msg)
        print(stop_msg)
        return 0
    except Exception as e:
        error_msg = f"Unexpected error in main loop: {e}"
        logger.error(error_msg)
        print(error_msg)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())


