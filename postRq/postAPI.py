import os
import sys
import time
import json
from datetime import datetime
from typing import Dict, Any, List, Optional

import requests

# Allow importing queue_store from project root
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from queue_store import SQLiteQueue


API_URL = "http://192.168.1.169:7000/ics/taskOrder/addTask"
DB_PATH = "../queues.db"  # relative to this script folder
ORDER_ID_FILE = os.path.join(os.path.dirname(__file__), "order_id.txt")
TOPIC = "stable_pairs"


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


def send_post(payload: Dict[str, Any]) -> bool:
    headers = {"Content-Type": "application/json"}
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
            if code is None or code == 1000:
                print(f"[OK] POST success | orderId={payload['orderId']} | taskPath={payload['taskOrderDetail'][0]['taskPath']} | resp={body}")
                return True
            else:
                print(f"[WARN] POST 2xx but code={code} | resp={body}")
                return False
        else:
            print(f"[ERR] HTTP {resp.status_code} | orderId={payload['orderId']} | resp={body}")
            return False
    except Exception as e:
        print(f"[ERR] POST exception: {e}")
        return False


def main() -> int:
    print("PostAPI Runner - consuming stable_pairs and POSTing to API")
    print(f"DB: {DB_PATH} | API: {API_URL}")
    queue = SQLiteQueue(DB_PATH)

    # Track latest global id for the topic to preserve global order
    last_global_id: int = 0
    latest_row = get_latest_topic_row(queue, TOPIC)
    if latest_row:
        last_global_id = latest_row["id"]
        print(f"Starting from latest existing id={last_global_id} (no backlog)")
    else:
        print("No existing rows. Waiting for new stable_pairs...")

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
                for attempt in range(3):
                    if send_post(body):
                        ok = True
                        break
                    time.sleep(2)
                if not ok:
                    print(f"[FAIL] Could not POST after retries | pair_id={pair_id}")

            time.sleep(0.5)
    except KeyboardInterrupt:
        print("\nStopped by user.")
        return 0


if __name__ == "__main__":
    raise SystemExit(main())


