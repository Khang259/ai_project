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
#API_URL = "http://192.168.1.110:7000/ics/taskOrder/addTask"

TRACKING_API_URL = "http://192.168.50.39:6868/track-task"
DB_PATH = "../queues.db"  # relative to this script folder
# ORDER_ID_FILE = os.path.join(os.path.dirname(__file__), "order_id.txt")
TOPICS = ["stable_pairs", "stable_dual"]  # Subscribe to both topics
RETRY_DELAY_SECONDS = 5  # Delay between POST retries


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


def build_payload_from_pair_3_points(pair_id: str, start_slot: str, end_slot: str, end_slot_2: str, order_id: str) -> Dict[str, Any]:
    """
    Build payload cho stable_pairs với 3 điểm (3 QR codes)
    
    Format:
    {
        "modelProcessCode": "Cap_tra_xe_vat_lieu68",
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
        "modelProcessCode": "Cap_tra_xe_vat_lieu68",
        "priority": 6, 
        "fromSystem": "MES", 
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
          "modelProcessCode": "double_test",
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
            "modelProcessCode": "double_test",
            "priority": 6, 
            "fromSystem": "MES", 
            "orderId": order_id,
            "taskOrderDetail": [
                {
                    "taskPath": f"{start_slot},{end_slot}", "shelfNumber": "" 
                },
                {
                    "taskPath": f"{start_slot_2},{end_slot_2}", "shelfNumber": "" 
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
            "priority": 6, 
            "fromSystem": "MES",
            "orderId": order_id,
            "taskOrderDetail": [
                {
                    "taskPath": f"{start_slot},{end_slot}", "shelfNumber": ""
                }
            ]
        }


# # Backward compatibility
# def build_payload(pair_id: str, start_slot: str, end_slot: str, order_id: str) -> Dict[str, Any]:
#     """Backward compatibility cho regular pairs"""
#     return build_payload_from_pair(pair_id, start_slot, end_slot, order_id)


def send_tracking_api(order_id: str, end_qrs: str, logger: logging.Logger) -> bool:
    """
    Gửi tracking API cho task Cap_tra_xe_vat_lieu68 (3-point pair)
    
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
    
    headers = {
        "Content-Type": "application/json"
        }
    
    try:
        print(f"[TRACKING_API] Gửi tracking cho orderId={order_id}, end_qrs={end_qrs}")
        logger.info(f"TRACKING_API_START: orderId={order_id}, end_qrs={end_qrs}, url={TRACKING_API_URL}")
        logger.info(
            "TRACKING_API_PAYLOAD: orderId=%s, end_qrs=%s, payload=%s",
            order_id,
            end_qrs,
            json.dumps(tracking_payload, ensure_ascii=False),
        )
        
        resp = requests.post(TRACKING_API_URL, headers=headers, json=tracking_payload, timeout=60)
        resp_text = resp.text
        
        status_ok = (200 <= resp.status_code < 300)
        try:
            resp_body = resp.json()
        except ValueError:
            resp_body = {"raw": resp_text}
        logger.info(
            "TRACKING_API_RESPONSE: orderId=%s, end_qrs=%s, status=%s, body=%s",
            order_id,
            end_qrs,
            resp.status_code,
            json.dumps(resp_body, ensure_ascii=False),
        )
        
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

######Send POST request without session#####
# def send_post(payload: Dict[str, Any], logger: logging.Logger) -> bool:
    """
    Gửi POST request giả lập hành vi của Postman 100%:
    - Compact JSON (không khoảng trắng thừa).
    - Thêm ký tự \t ở cuối (theo quan sát đặc thù).
    - Fake User-Agent và tự tính Content-Length.
    """
    
    # 1. Chuẩn bị dữ liệu để log
    order_id = payload.get('orderId', 'N/A')
    
    # Lấy taskPath để log cho dễ nhìn
    task_order_detail = payload.get('taskOrderDetail', [])
    if len(task_order_detail) == 1:
        task_path = task_order_detail[0].get('taskPath', 'N/A')
    elif len(task_order_detail) >= 2:
        paths = [t.get('taskPath', 'N/A') for t in task_order_detail]
        task_path = " | ".join(paths)
    else:
        task_path = 'N/A'

    logger.info(f"POST_START: orderId={order_id}, taskPath={task_path}")
    print(f"\n=== GỬI POST (Postman Mode) ===")
    print(f"OrderID: {order_id} | TaskPath: {task_path}")

    try:
        # 2. Xử lý Payload: Compact JSON + Encode UTF-8
        # separators=(",", ":") loại bỏ khoảng trắng sau dấu phẩy và dấu hai chấm
        body_str = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
        
        # --- QUAN TRỌNG: Thêm ký tự Tab \t như bạn phát hiện trong Postman ---
        # Một số server cũ dùng cái này làm cờ ngắt buffer
        body_str = body_str + "\t"
        
        # Chuyển sang bytes để tính độ dài chính xác
        body_bytes = body_str.encode("utf-8")
        
        # 3. Giả lập Headers của Postman
        headers = {
            "Content-Type": "application/json",
            "User-Agent": "PostmanRuntime/7.37.3",  # Fake version mới
            "Accept": "*/*",
            "Accept-Encoding": "gzip, deflate, br",
            "Connection": "keep-alive",
            # Tính thủ công Content-Length cho chính xác với body_bytes
            "Content-Length": str(len(body_bytes)) 
        }

        # Debug: In ra độ dài và một phần nội dung để kiểm tra
        print(f"Payload Size: {len(body_bytes)} bytes")
        # print(f"Raw Body Preview: {body_str[:100]}...") 

        # 4. Gửi Request
        # timeout=90s: Đủ lâu cho server xử lý blocking (nếu có)
        resp = requests.post(
            API_URL, 
            data=body_bytes,      # Gửi raw bytes thay vì để requests tự xử lý json
            headers=headers, 
            timeout=60            
        )

        # 5. Xử lý Response
        # Đọc hết content để giải phóng socket buffer
        _ = resp.content  

        print(f"HTTP Status: {resp.status_code}")
        
        try:
            body = resp.json()
            # Log body gọn gàng
            logger.info(f"POST_RESPONSE: orderId={order_id}, status={resp.status_code}, body={json.dumps(body, ensure_ascii=False)}")
            print(f"Response Body: {json.dumps(body, ensure_ascii=False)}")
        except Exception:
            # Nếu server trả về text không phải json
            body = {"raw": resp.text}
            logger.warning(f"POST_RESPONSE_RAW: orderId={order_id}, status={resp.status_code}, raw={resp.text}")
            print(f"Response Raw: {resp.text}")

        # 6. Kiểm tra kết quả
        # Chấp nhận HTTP 200-299 VÀ code logic = 1000
        if 200 <= resp.status_code < 400:
            server_code = body.get("code")
            
            # Logic kiểm tra code 1000
            if server_code == 1000:
                print(f"[SUCCESS] ✓ Gửi thành công.")
                return True
            else:
                msg = body.get("message", "Unknown error")
                print(f"[WARNING] ⚠ HTTP OK nhưng Server Code lỗi. Code: {server_code}, Msg: {msg}")
                # Lưu ý: Nếu server báo Pre-occupied ở đây thì tức là fail logic
                return False
        else:
            print(f"[ERROR] ✗ HTTP Error: {resp.status_code}")
            return False

    except requests.exceptions.Timeout:
        print(f"[TIMEOUT] ✗ Quá thời gian chờ 90s.")
        logger.error(f"POST_TIMEOUT: orderId={order_id}")
        # Tùy chọn: return True nếu bạn tin là server vẫn chạy ngầm, 
        # nhưng an toàn nhất là return False để log lỗi.
        return False
        
    except Exception as e:
        print(f"[EXCEPTION] ✗ Lỗi không xác định: {e}")
        logger.error(f"POST_EXCEPTION: orderId={order_id}, error={str(e)}")
        return False

#####Send POST request with session#####
def send_post(payload: Dict[str, Any], logger: logging.Logger) -> bool:
    """
    Gửi POST request sử dụng SESSION để giả lập hành vi Keep-Alive của Postman.
    Kết hợp với việc format JSON thủ công và thêm Tab.
    """
    
    # 1. Chuẩn bị log
    order_id = payload.get('orderId', 'N/A')
    
    # Lấy taskPath để hiển thị
    task_order_detail = payload.get('taskOrderDetail', [])
    if len(task_order_detail) == 1:
        task_path = task_order_detail[0].get('taskPath', 'N/A')
    elif len(task_order_detail) >= 2:
        paths = [t.get('taskPath', 'N/A') for t in task_order_detail]
        task_path = " | ".join(paths)
    else:
        task_path = 'N/A'

    logger.info(f"POST_START (Session): orderId={order_id}, taskPath={task_path}")
    print(f"\n=== GỬI POST (Session Mode) ===")
    print(f"OrderID: {order_id} | TaskPath: {task_path}")

    # 2. Khởi tạo Session
    session = requests.Session()

    try:
        # 3. Xử lý Payload (Compact + Tab + Bytes)
        body_str = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
        body_str = body_str + "\t" 
        body_bytes = body_str.encode("utf-8")
        
        # 4. Thiết lập Headers cho Session
        # Lưu ý: Session tự động xử lý Connection: keep-alive và Cookies
        headers = {
            "Content-Type": "application/json",
            "User-Agent": "PostmanRuntime/7.37.3",
            "Accept": "*/*",
            "Accept-Encoding": "gzip, deflate, br",
            "Content-Length": str(len(body_bytes))
        }
        
        # Cập nhật header vào session
        session.headers.update(headers)

        # ===== LOG ĐẦY ĐỦ REQUEST GỬI ĐI =====
        logger.info(f"POST_REQUEST_FULL: url={API_URL}, orderId={order_id}")
        logger.info(f"POST_REQUEST_HEADERS: orderId={order_id}, headers={json.dumps(headers, ensure_ascii=False)}")
        logger.info(f"POST_REQUEST_PAYLOAD: orderId={order_id}, payload={json.dumps(payload, ensure_ascii=False)}")
        logger.info(f"POST_REQUEST_BODY_SIZE: orderId={order_id}, size={len(body_bytes)} bytes")

        # 5. Gửi Request qua Session
        print(f"Payload Size: {len(body_bytes)} bytes")
        
        resp = session.post(
            API_URL, 
            data=body_bytes, 
            # timeout=None       
        )

        # 6. Xử lý Response
        response_content = resp.content # Đọc hết stream
        response_text = resp.text

        # ===== LOG ĐẦY ĐỦ RESPONSE NHẬN VỀ =====
        logger.info(f"POST_RESPONSE_STATUS: orderId={order_id}, status_code={resp.status_code}, reason={resp.reason}")
        logger.info(f"POST_RESPONSE_HEADERS: orderId={order_id}, headers={json.dumps(dict(resp.headers), ensure_ascii=False)}")
        logger.info(f"POST_RESPONSE_SIZE: orderId={order_id}, content_length={len(response_content)} bytes")
        
        print(f"HTTP Status: {resp.status_code}")
        
        try:
            body = resp.json()
            logger.info(f"POST_RESPONSE_BODY: orderId={order_id}, body={json.dumps(body, ensure_ascii=False)}")
            print(f"Response Body: {json.dumps(body, ensure_ascii=False)}")
        except Exception as json_err:
            body = {"raw": response_text}
            logger.warning(f"POST_RESPONSE_NOT_JSON: orderId={order_id}, error={str(json_err)}")
            logger.info(f"POST_RESPONSE_RAW_TEXT: orderId={order_id}, text={response_text}")
            print(f"Response Raw: {response_text}")

        # 7. Kiểm tra kết quả
        if 200 <= resp.status_code < 400:
            server_code = body.get("code")
            if server_code == 1000:
                logger.info(f"POST_SUCCESS: orderId={order_id}, server_code={server_code}")
                print(f"[SUCCESS] ✓ Gửi thành công (Session).")
                return True
            else:
                msg = body.get("message", "Unknown error")
                logger.warning(f"POST_FAILED_SERVER_CODE: orderId={order_id}, server_code={server_code}, message={msg}")
                print(f"[WARNING] ⚠ Code lỗi từ Server: {server_code} | {msg}")
                return False
        else:
            logger.error(f"POST_HTTP_ERROR: orderId={order_id}, status_code={resp.status_code}, response_body={json.dumps(body, ensure_ascii=False)}")
            print(f"[ERROR] ✗ HTTP Error: {resp.status_code}")
            return False

    except requests.exceptions.Timeout:
        print(f"[TIMEOUT] ✗ Quá thời gian chờ 90s.")
        logger.error(f"POST_TIMEOUT: orderId={order_id}, url={API_URL}")
        return False
        
    except Exception as e:
        print(f"[EXCEPTION] ✗ Lỗi: {e}")
        logger.error(f"POST_EXCEPTION: orderId={order_id}, error={str(e)}, error_type={type(e).__name__}")
        import traceback
        logger.error(f"POST_EXCEPTION_TRACEBACK: orderId={order_id}, traceback={traceback.format_exc()}")
        return False
        
    finally:
        # Quan trọng: Đóng session sau khi dùng xong để giải phóng socket
        # Trong code tối ưu hơn, ta nên tạo session ở hàm main() và truyền vào đây,
        # nhưng để fix nhanh thì tạo-dùng-đóng tại chỗ cũng tốt hơn requests.post thường.
        session.close()


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
                    
                    payload_builder = None  # type: ignore
                    if topic == "stable_pairs":
                        # Xử lý regular stable pairs (có thể 2 hoặc 3 điểm)
                        pair_id = payload.get("pair_id", r.get("key", ""))
                        start_slot = str(payload.get("start_slot", ""))
                        end_slot = str(payload.get("end_slot", ""))
                        end_slot_2 = payload.get("end_slot_2", "")
                        
                        if not start_slot or not end_slot:
                            print(f"[SKIP] Invalid pair payload: {payload}")
                            continue
                        
                        # Kiểm tra nếu có 3 điểm
                        if end_slot_2:
                            # Xử lý pair với 3 điểm
                            task_path = f"{start_slot},{end_slot},{end_slot_2}"
                            is_3_point_pair = True  # Đánh dấu để gửi tracking API
                            print(f"Bắt đầu xử lý pair 3 điểm: {pair_id}, taskPath={task_path}")
                            
                            def payload_builder(order_id: str, pair_id=pair_id, start_slot=start_slot, end_slot=end_slot, end_slot_2=end_slot_2):
                                return build_payload_from_pair_3_points(pair_id, start_slot, end_slot, str(end_slot_2), order_id)
                        else:
                            # Xử lý pair với 2 điểm
                            task_path = f"{start_slot},{end_slot}"
                            print(f"Bắt đầu xử lý pair 2 điểm: {pair_id}, taskPath={task_path}")
                            
                            def payload_builder(order_id: str, pair_id=pair_id, start_slot=start_slot, end_slot=end_slot):
                                return build_payload_from_pair(pair_id, start_slot, end_slot, order_id)
                        
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
                        task_path = (
                            f"{start_slot},{end_slot} | {start_slot_2},{end_slot_2}"
                            if dual_type == "4-point"
                            else f"{start_slot},{end_slot}"
                        )
                        print(f"Bắt đầu xử lý {dual_type} dual: {dual_id}, taskPath={task_path}")

                        def payload_builder(order_id: str, dual_payload=payload):
                            return build_payload_from_dual(dual_payload, order_id)
                        
                        # Sử dụng dual_id làm pair_id cho unlock logic
                        pair_id = dual_id
                    
                    else:
                        print(f"Unknown topic: {topic}")
                        continue
                    
                    # Common retry logic for both types
                    ok = False
                    last_order_id: Optional[str] = None
                    print("Bắt đầu retry logic cho message hiện tại")
                    
                    for attempt in range(3):
                        current_order_id = get_next_order_id()
                        last_order_id = current_order_id
                        body = payload_builder(current_order_id)
                        
                        print(f"\n--- Lần thử {attempt + 1}/3 | OrderID: {current_order_id} ---")
                        if send_post(body, logger):
                            ok = True
                            success_complete_msg = f"\n✓ HOÀN THÀNH THÀNH CÔNG | {topic} | OrderID: {current_order_id} | Attempt: {attempt + 1}/3"
                            print(success_complete_msg)
                            
                            # Nếu là 3-point pair (Cap_tra_xe_vat_lieu68), gửi tracking API
                            if is_3_point_pair:
                                print(f"\n[3-POINT PAIR] Gửi tracking API cho orderId={current_order_id}")
                                send_tracking_api(current_order_id, end_slot, logger)
                            
                            break
                        else:
                            if attempt < 2:  # Don't sleep after last attempt
                                retry_msg = f"⚠ Lần thử {attempt + 1} thất bại, chờ {RETRY_DELAY_SECONDS} giây trước khi thử lại..."
                                print(retry_msg)
                                time.sleep(RETRY_DELAY_SECONDS)
                    
                    if not ok:
                        fail_order_id = last_order_id or "N/A"
                        fail_msg = f"\n✗ THẤT BẠI HOÀN TOÀN | {topic}={pair_id} | OrderID cuối: {fail_order_id} | Đã thử 3 lần"
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
