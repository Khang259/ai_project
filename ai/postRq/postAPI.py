import os
import sys
import time
import json
import threading
import logging
import random
from datetime import datetime
from typing import Dict, Any, List, Optional
from logging.handlers import RotatingFileHandler

import requests

# Allow importing queue_store from project root
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from queue_store import SQLiteQueue


API_URL = "http://10.250.161.134:7000/ics/taskOrder/addTask"
TRACKING_API_URL = "http://192.168.1.7:8001/track-task"
DB_PATH = "../queues.db"  # relative to this script folder
ORDER_ID_FILE = os.path.join(os.path.dirname(__file__), "order_id.txt")
TOPICS = ["stable_pairs", "stable_dual"]  # Subscribe to both topics


def setup_post_api_logger(log_dir: str = "../logs") -> logging.Logger:
    """Thiết lập logger cho POST API operations"""
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
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
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
    
    # Thêm handlers vào logger
    logger.addHandler(file_handler)
    
    return logger


def ensure_dirs() -> None:
    os.makedirs(os.path.dirname(ORDER_ID_FILE), exist_ok=True)


def get_next_order_id() -> str:
    """
    Tạo orderId dựa trên timestamp + random salt.
    Format: {timestamp_ms}_{random_salt}
    
    Ví dụ: 1729085245123_7d3f
    
    Returns:
        str: orderId unique cho mỗi request
    """
    # Lấy timestamp hiện tại (milliseconds)
    timestamp_ms = int(time.time() * 1000)
    
    # Tạo random salt (4 ký tự hex = 16 bits entropy)
    random_salt = format(random.randint(0, 0xFFFF), '04x')
    
    # Tạo orderId
    order_id = f"{timestamp_ms}{random_salt}"
    
    return order_id


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


def build_payload_from_pair(pair_id: str, start_slot: str, end_slot: str, order_id: str) -> Dict[str, Any]:
    """
    Build payload cho regular stable_pairs (2 QR codes)
    
    Format:
    {
        "modelProcessCode": "Cap_phu_tung",
        "fromSystem": "ICS",
        "orderId": "...",
        "taskOrderDetail": [
            {
                "taskPath": "start_qr,end_qr"
            }
        ]
    }
    """
    task_path = f"{start_slot},{end_slot}"
    return {
        "modelProcessCode": "Cap_phu_tung",
        "fromSystem": "ICS",
        "orderId": order_id,
        "taskOrderDetail": [
            {
                "taskPath": task_path
            }
        ]
    }


def build_payload_from_pair_3_points(pair_id: str, start_slot: str, end_slot: str, end_slot_2: str, order_id: str) -> Dict[str, Any]:
    """
    Build payload cho stable_pairs với 3 điểm (3 QR codes)
    
    Format:
    {
        "modelProcessCode": "Cap_tra_xe_vat_lieu",
        "fromSystem": "ICS",
        "orderId": "...",
        "taskOrderDetail": [
            {
                "taskPath": "start_qr,end_qrs,end_qrs_2"
            }
        ]
    }
    """
    task_path = f"{start_slot},{end_slot},{end_slot_2}"
    return {
        "modelProcessCode": "Cap_tra_xe_vat_lieu",
        "fromSystem": "ICS",
        "orderId": order_id,
        "taskOrderDetail": [
            {
                "taskPath": task_path
            }
        ]
    }


def build_payload_from_dual(dual_payload: Dict[str, Any], order_id: str) -> Dict[str, Any]:
    """
    Build payload cho stable_dual (2-point hoặc 4-point)
    
    - Dual 2P (2 QR codes):
      {
          "modelProcessCode": "Cap_phu_tung",
          "taskOrderDetail": [
              { "taskPath": "start_qr,end_qrs" }
          ]
      }
    
    - Dual 4P (4 QR codes):
      {
          "modelProcessCode": "Cap_tra_phu_tung",
          "taskOrderDetail": [
              { "taskPath": "start_qr,end_qrs" },
              { "taskPath": "start_qr_2,end_qrs_2" }
          ]
      }
    """
    # Lấy các QR codes từ dual payload
    start_slot = dual_payload.get("start_slot", "")
    end_slot = dual_payload.get("end_slot", "")
    start_slot_2 = dual_payload.get("start_slot_2", "")
    end_slot_2 = dual_payload.get("end_slot_2", "")
    
    # Xác định đây là dual-2p hay dual-4p
    if start_slot_2 and end_slot_2:
        # ========================================
        # DUAL 4-POINT: 4 QR codes
        # ========================================
        # modelProcessCode = "Cap_tra_phu_tung"
        # taskOrderDetail = 2 objects (mỗi object 2 QR codes)
        return {
            "modelProcessCode": "Cap_tra_phu_tung",
            "fromSystem": "ICS",
            "orderId": order_id,
            "taskOrderDetail": [
                {
                    "taskPath": f"{start_slot},{end_slot}"  # Cặp 1: start_qr, end_qrs
                },
                {
                    "taskPath": f"{start_slot_2},{end_slot_2}"  # Cặp 2: start_qr_2, end_qrs_2
                }
            ]
        }
    else:
        # ========================================
        # DUAL 2-POINT: 2 QR codes
        # ========================================
        # modelProcessCode = "Cap_phu_tung"
        # taskOrderDetail = 1 object (2 QR codes)
        return {
            "modelProcessCode": "Cap_phu_tung",
            "fromSystem": "ICS",
            "orderId": order_id,
            "taskOrderDetail": [
                {
                    "taskPath": f"{start_slot},{end_slot}"
                }
            ]
        }


# Backward compatibility
def build_payload(pair_id: str, start_slot: str, end_slot: str, order_id: str) -> Dict[str, Any]:
    """Backward compatibility cho regular pairs"""
    return build_payload_from_pair(pair_id, start_slot, end_slot, order_id)


def send_tracking_api(order_id: str, end_qrs: str, logger: logging.Logger) -> bool:
    """
    Gửi tracking API cho task Cap_tra_xe_vat_lieu (3-point pair)
    
    Args:
        order_id: OrderID của task chính
        end_qrs: QR code của điểm end (điểm thứ 2 trong 3 điểm)
        logger: Logger instance
    
    Returns:
        bool: True nếu gửi thành công, False nếu thất bại
    """
    tracking_payload = {
        "orderId": order_id,
        "end_qrs": end_qrs
    }
    
    headers = {"Content-Type": "application/json"}
    
    try:
        print(f"[TRACKING_API] Gửi tracking cho orderId={order_id}, end_qrs={end_qrs}")
        logger.info(f"TRACKING_API_START: orderId={order_id}, end_qrs={end_qrs}, url={TRACKING_API_URL}")
        
        resp = requests.post(TRACKING_API_URL, headers=headers, json=tracking_payload, timeout=5)
        
        status_ok = (200 <= resp.status_code < 300)
        
        if status_ok:
            print(f"[TRACKING_API] ✓ Thành công | Status: {resp.status_code}")
            logger.info(f"TRACKING_API_SUCCESS: orderId={order_id}, end_qrs={end_qrs}, status_code={resp.status_code}")
            return True
        else:
            print(f"[TRACKING_API] ✗ Thất bại | Status: {resp.status_code}")
            logger.warning(f"TRACKING_API_FAILED: orderId={order_id}, end_qrs={end_qrs}, status_code={resp.status_code}")
            return False
            
    except requests.exceptions.Timeout:
        print(f"[TRACKING_API] ✗ Timeout sau 5s")
        logger.error(f"TRACKING_API_TIMEOUT: orderId={order_id}, end_qrs={end_qrs}")
        return False
    except Exception as e:
        print(f"[TRACKING_API] ✗ Lỗi: {e}")
        logger.error(f"TRACKING_API_ERROR: orderId={order_id}, end_qrs={end_qrs}, error={str(e)}")
        return False


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


def send_post(payload: Dict[str, Any], logger: logging.Logger) -> bool:
    headers = {"Content-Type": "application/json"}
    
    # Log payload details
    order_id = payload.get('orderId', 'N/A')
    
    # Xử lý taskPath cho cả 1 object (2 QR) và 2 objects (4 QR)
    task_order_detail = payload.get('taskOrderDetail', [])
    if len(task_order_detail) == 1:
        # Regular Pair hoặc Dual 2P (2 QR codes)
        task_path = task_order_detail[0].get('taskPath', 'N/A')
    elif len(task_order_detail) == 2:
        # Dual 4P (4 QR codes) - Hiển thị cả 2 taskPath
        task_path_1 = task_order_detail[0].get('taskPath', 'N/A')
        task_path_2 = task_order_detail[1].get('taskPath', 'N/A')
        task_path = f"{task_path_1} | {task_path_2}"
    else:
        task_path = 'N/A'
    
    # Log request details
    logger.info(f"POST_REQUEST_START: orderId={order_id}, taskPath={task_path}, url={API_URL}")
    
    print(f"=== POST REQUEST ===")
    print(f"URL: {API_URL}")
    print(f"OrderID: {order_id}")
    print(f"TaskPath: {task_path}")
    
    try:
        payload_json = json.dumps(payload)
        print(f"Sending JSON ({len(payload_json)} bytes)")
        
        resp = requests.post(API_URL, headers=headers, data=payload_json, timeout=10)
        
        # Log response details
        print(f"=== POST RESPONSE ===")
        print(f"Status Code: {resp.status_code}")
        
        status_ok = (200 <= resp.status_code < 300)
        try:
            body = resp.json()
            print(f"Response Body: {json.dumps(body, ensure_ascii=False)}")
            
            # Log response body details
            logger.info(f"POST_RESPONSE_RECEIVED: orderId={order_id}, status_code={resp.status_code}, response_body={json.dumps(body, ensure_ascii=False)}")
        except Exception as e:
            body = {"raw": resp.text}
            print(f"Failed to parse JSON response: {e}")
            print(f"Response Body (Raw): {resp.text}")
            
            # Log raw response
            logger.warning(f"POST_RESPONSE_PARSE_FAILED: orderId={order_id}, status_code={resp.status_code}, raw_response={resp.text}")

        if status_ok:
            # If API has code=1000 convention, consider it success; else accept 2xx
            code = body.get("code") if isinstance(body, dict) else None
            # if code is None or code == 1000:
            if code is None or code == 1000:
                success_msg = f"[SUCCESS] ✓ POST thành công | OrderID: {payload['orderId']} | TaskPath: {task_path} | Code: {code}"
                print(success_msg)
                
                # Log success
                logger.info(f"POST_REQUEST_SUCCESS: orderId={order_id}, taskPath={task_path}, response_code={code}")
                return True
            else:
                warn_msg = f"[WARNING] ⚠ POST 2xx nhưng code không hợp lệ | OrderID: {payload['orderId']} | Expected: 1000, Got: {code}"
                print(warn_msg)
                
                # Log warning
                logger.warning(f"POST_REQUEST_INVALID_CODE: orderId={order_id}, taskPath={task_path}, expected_code=1000, actual_code={code}")
                return False
        else:
            error_msg = f"[ERROR] ✗ HTTP {resp.status_code} | OrderID: {payload['orderId']} | TaskPath: {task_path}"
            print(error_msg)
            
            # Log HTTP error
            logger.error(f"POST_REQUEST_HTTP_ERROR: orderId={order_id}, taskPath={task_path}, status_code={resp.status_code}, response_body={json.dumps(body, ensure_ascii=False)}")
            return False
    except requests.exceptions.Timeout:
        timeout_msg = f"[ERROR] ✗ Request timeout sau 10s | OrderID: {payload['orderId']}"
        print(timeout_msg)
        
        # Log timeout
        logger.error(f"POST_REQUEST_TIMEOUT: orderId={order_id}, taskPath={task_path}, timeout=10s")
        return False
    except requests.exceptions.ConnectionError as e:
        conn_msg = f"[ERROR] ✗ Connection error | OrderID: {payload['orderId']} | Error: {e}"
        print(conn_msg)
        
        # Log connection error
        logger.error(f"POST_REQUEST_CONNECTION_ERROR: orderId={order_id}, taskPath={task_path}, error={str(e)}")
        return False
    except Exception as e:
        error_msg = f"[ERROR] ✗ Unexpected exception | OrderID: {payload['orderId']} | Error: {e}"
        print(error_msg)
        
        # Log unexpected error
        logger.error(f"POST_REQUEST_UNEXPECTED_ERROR: orderId={order_id}, taskPath={task_path}, error={str(e)}")
        return False


def main() -> int:
    # Thiết lập logger
    logger = setup_post_api_logger()
    
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
            print(start_msg)
        else:
            last_global_ids[topic] = 0
            wait_msg = f"No existing rows for {topic}. Waiting for new data..."
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
                    print(f"\n{'='*60}")
                    print(f"XỬ LÝ MESSAGE MỚI | Topic: {topic} | ID: {r['id']}")
                    print(f"{'='*60}")
                    
                    # Xử lý dựa trên topic type
                    is_3_point_pair = False  # Flag để track nếu là 3-point pair (cần gửi tracking API)
                    
                    if topic == "stable_pairs":
                        # Xử lý regular stable pairs (có thể 2 hoặc 3 điểm)
                        pair_id = payload.get("pair_id", r.get("key", ""))
                        start_slot = str(payload.get("start_slot", ""))
                        end_slot = str(payload.get("end_slot", ""))
                        end_slot_2 = payload.get("end_slot_2", "")
                        
                        if not start_slot or not end_slot:
                            print(f"[SKIP] Invalid pair payload: {payload}")
                            continue
                        
                        order_id = get_next_order_id()
                        
                        # Kiểm tra nếu có 3 điểm
                        if end_slot_2:
                            # Xử lý pair với 3 điểm
                            body = build_payload_from_pair_3_points(pair_id, start_slot, end_slot, str(end_slot_2), order_id)
                            task_path = f"{start_slot},{end_slot},{end_slot_2}"
                            is_3_point_pair = True  # Đánh dấu để gửi tracking API
                            print(f"Bắt đầu xử lý pair 3 điểm: {pair_id}, orderId={order_id}, taskPath={task_path}")
                        else:
                            # Xử lý pair với 2 điểm
                            body = build_payload_from_pair(pair_id, start_slot, end_slot, order_id)
                            task_path = f"{start_slot},{end_slot}"
                            print(f"Bắt đầu xử lý pair 2 điểm: {pair_id}, orderId={order_id}, taskPath={task_path}")
                        
                    elif topic == "stable_dual":
                        # Xử lý dual pairs (2-point hoặc 4-point)
                        dual_id = payload.get("dual_id", r.get("key", ""))
                        start_slot = str(payload.get("start_slot", ""))
                        end_slot = str(payload.get("end_slot", ""))
                        start_slot_2 = payload.get("start_slot_2", "")
                        end_slot_2 = payload.get("end_slot_2", "")
                        
                        if not start_slot or not end_slot:
                            print(f"[SKIP] Invalid dual payload: {payload}")
                            continue
                        
                        # Xác định loại dual
                        dual_type = "4-point" if start_slot_2 and end_slot_2 else "2-point"
                        
                        order_id = get_next_order_id()
                        body = build_payload_from_dual(payload, order_id)
                        
                        # Lấy taskPath đúng cho cả 2P và 4P
                        task_order_detail = body["taskOrderDetail"]
                        if len(task_order_detail) == 1:
                            # Dual 2P
                            task_path = task_order_detail[0]["taskPath"]
                        else:
                            # Dual 4P - Hiển thị cả 2 taskPath
                            task_path = f"{task_order_detail[0]['taskPath']} | {task_order_detail[1]['taskPath']}"
                        
                        print(f"Bắt đầu xử lý {dual_type} dual: {dual_id}, orderId={order_id}, taskPath={task_path}")
                        
                        # Sử dụng dual_id làm pair_id cho unlock logic
                        pair_id = dual_id
                    
                    else:
                        print(f"Unknown topic: {topic}")
                        continue
                    
                    # Common retry logic for both types
                    ok = False
                    print(f"Bắt đầu retry logic cho OrderID: {order_id}")
                    
                    for attempt in range(3):
                        print(f"\n--- Lần thử {attempt + 1}/3 cho OrderID: {order_id} ---")
                        if send_post(body, logger):
                            ok = True
                            success_complete_msg = f"\n✓ HOÀN THÀNH THÀNH CÔNG | {topic} | OrderID: {order_id} | Attempt: {attempt + 1}/3"
                            print(success_complete_msg)
                            
                            # Nếu là 3-point pair (Cap_tra_xe_vat_lieu), gửi tracking API
                            if is_3_point_pair:
                                print(f"\n[3-POINT PAIR] Gửi tracking API cho orderId={order_id}")
                                send_tracking_api(order_id, end_slot, logger)
                            
                            break
                        else:
                            retry_msg = f"⚠ Lần thử {attempt + 1} thất bại, {2 if attempt < 2 else 0} giây trước khi thử lại..."
                            print(retry_msg)
                            if attempt < 2:  # Don't sleep after last attempt
                                time.sleep(2)
                    
                    if not ok:
                        fail_msg = f"\n✗ THẤT BẠI HOÀN TOÀN | {topic}={pair_id} | OrderID: {order_id} | Đã thử 3 lần"
                        print(fail_msg)
                        
                        # CHỈ unlock cho dual pairs (blocking required), KHÔNG unlock cho normal pairs
                        if topic == "stable_dual":
                            # Gửi unlock message sau 1 phút (sử dụng start_slot) - CHỈ CHO DUAL
                            unlock_msg = f"[UNLOCK_SCHEDULE] Sẽ unlock start_slot={start_slot} sau 60 giây do POST thất bại (DUAL ONLY)"
                            print(unlock_msg)
                            send_unlock_after_delay(queue, pair_id, start_slot, delay_seconds=60)
                        else:
                            # Normal pairs không block → không cần unlock
                            no_unlock_msg = f"[NO_UNLOCK] Normal pairs không block → không cần unlock mechanism"
                            print(no_unlock_msg)
                    
                    # End of message processing
                    print(f"{'='*60}\nKẾT THÚC XỬ LÝ MESSAGE | ID: {r['id']} | Status: {'SUCCESS' if ok else 'FAILED'}\n{'='*60}\n")
                    print(f"--- Message {r['id']} hoàn tất: {'THÀNH CÔNG' if ok else 'THẤT BẠI'} ---\n")
            
            time.sleep(0.5)
    except KeyboardInterrupt:
        stop_msg = "\nStopped by user."
        print(stop_msg)
        return 0
    except Exception as e:
        error_msg = f"Unexpected error in main loop: {e}"
        print(error_msg)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())

