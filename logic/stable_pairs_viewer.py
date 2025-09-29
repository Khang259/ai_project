import time
import json
from typing import Dict, Any, List

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from queue_store import SQLiteQueue


def list_keys(queue: SQLiteQueue, topic: str) -> List[str]:
    with queue._connect() as conn:
        cur = conn.execute(
            "SELECT DISTINCT key FROM messages WHERE topic = ? ORDER BY key",
            (topic,),
        )
        return [row[0] for row in cur.fetchall()]


def main() -> int:
    topic = "stable_pairs"
    queue = SQLiteQueue("../queues.db")

    print(f"Viewer listening on topic: {topic}")

    # Discover existing keys and last ids
    last_id_by_key: Dict[str, int] = {}

    keys = list_keys(queue, topic)
    if not keys:
        print("Chưa có bản ghi nào. Chờ dữ liệu...")

    for key in keys:
        row = queue.get_latest_row(topic, key)
        if row:
            last_id_by_key[key] = row["id"]

    # Main loop: poll for new keys and new messages
    try:
        while True:
            # pick up new keys dynamically
            for key in list_keys(queue, topic):
                if key not in last_id_by_key:
                    row = queue.get_latest_row(topic, key)
                    if row:
                        last_id_by_key[key] = row["id"]

            # fetch new rows per key
            for key, last_id in list(last_id_by_key.items()):
                rows = queue.get_after_id(topic, key, last_id, limit=100)
                for r in rows:
                    payload = r["payload"]
                    last_id_by_key[key] = r["id"]

                    # Pretty print one line + JSON payload for debug
                    pair_id = payload.get("pair_id", key)
                    start_slot = payload.get("start_slot")
                    end_slot = payload.get("end_slot")
                    stable_since = payload.get("stable_since")

                    print(
                        f"[stable] {pair_id} | start={start_slot} -> end={end_slot} | since={stable_since}"
                    )
                    # Uncomment if want full JSON
                    # print(json.dumps(payload, ensure_ascii=False))

            time.sleep(0.2)
    except KeyboardInterrupt:
        print("\nViewer stopped.")
        return 0


if __name__ == "__main__":
    raise SystemExit(main())


