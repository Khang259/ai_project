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
TOPIC = "stable_pairs"


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


def build_payload(pair_id: str, start_slot: str, end_slot: str, order_id: int) -> Dict[str, Any]:
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
    logger.info(f"Gửi POST request - orderId: {payload.get('orderId')}, taskPath: {payload.get('taskOrderDetail', [{}])[0].get('taskPath')}")
    
    try:
        resp = requests.post(API_URL, headers=headers, data=json.dumps(payload), timeout=10)
        status_ok = (200 <= resp.status_code < 300)
        try:
            body = resp.json()
        except Exception:
            body = {"raw": resp.text}

        if status_ok:
            # If API has code=1000 convention, consider it success; else accept 2xx
            code = body.get("code") if isinstance(body, dict) else None
            # if code is None or code == 1000:
            if code is None or code == 2009:
                success_msg = f"[OK] POST success | orderId={payload['orderId']} | taskPath={payload['taskOrderDetail'][0]['taskPath']} | resp={body}"
                logger.info(success_msg)
                print(success_msg)
                return True
            else:
                warn_msg = f"[WARN] POST 2xx but code={code} | resp={body}"
                logger.warning(warn_msg)
                print(warn_msg)
                return False
        else:
            error_msg = f"[ERR] HTTP {resp.status_code} | orderId={payload['orderId']} | resp={body}"
            logger.error(error_msg)
            print(error_msg)
            return False
    except Exception as e:
        error_msg = f"[ERR] POST exception: {e}"
        logger.error(error_msg)
        print(error_msg)
        return False


def main() -> int:
    # Thiết lập logger
    logger = setup_post_api_logger()
    
    logger.info("PostAPI Runner - consuming stable_pairs and POSTing to API")
    logger.info(f"DB: {DB_PATH} | API: {API_URL}")
    print("PostAPI Runner - consuming stable_pairs and POSTing to API")
    print(f"DB: {DB_PATH} | API: {API_URL}")
    
    queue = SQLiteQueue(DB_PATH)

    # Track latest global id for the topic to preserve global order
    last_global_id: int = 0
    latest_row = get_latest_topic_row(queue, TOPIC)
    if latest_row:
        last_global_id = latest_row["id"]
        start_msg = f"Starting from latest existing id={last_global_id} (no backlog)"
        logger.info(start_msg)
        print(start_msg)
    else:
        wait_msg = "No existing rows. Waiting for new stable_pairs..."
        logger.info(wait_msg)
        print(wait_msg)

    try:
        while True:
            # Read new rows for the topic in global order
            rows = get_after_id_topic(queue, TOPIC, last_global_id, limit=200)
            for r in rows:
                payload = r["payload"]
                last_global_id = r["id"]

                pair_id = payload.get("pair_id", r.get("key", ""))
                start_slot = str(payload.get("start_slot", ""))
                end_slot = str(payload.get("end_slot", ""))
                if not start_slot or not end_slot:
                    print(f"[SKIP] Invalid pair payload: {payload}")
                    continue

                order_id = get_next_order_id()
                body = build_payload(pair_id, start_slot, end_slot, order_id)

                # Simple retry 3 times
                ok = False
                logger.info(f"Bắt đầu xử lý pair_id={pair_id}, orderId={order_id}")
                
                for attempt in range(3):
                    logger.info(f"Lần thử {attempt + 1}/3 cho orderId={order_id}")
                    if send_post(body, logger):
                        ok = True
                        break
                    time.sleep(2)
                    
                if not ok:
                    fail_msg = f"[FAIL] Could not POST after retries | pair_id={pair_id}"
                    logger.error(fail_msg)
                    print(fail_msg)
                    
                    # Gửi unlock message sau 1 phút
                    unlock_msg = f"[UNLOCK_SCHEDULE] Sẽ unlock start_slot={start_slot} sau 60 giây do POST thất bại"
                    logger.warning(unlock_msg)
                    print(unlock_msg)
                    send_unlock_after_delay(queue, pair_id, start_slot, delay_seconds=60)

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


