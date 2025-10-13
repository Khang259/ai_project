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


def display_stable_pair(payload: Dict[str, Any], key: str) -> None:
    """Display stable_pairs message"""
    pair_id = payload.get("pair_id", key)
    start_slot = payload.get("start_slot")
    end_slot = payload.get("end_slot")
    stable_since = payload.get("stable_since")
    
    print(
        f"[PAIR] {pair_id} | start={start_slot} -> end={end_slot} | since={stable_since}"
    )


def display_stable_dual(payload: Dict[str, Any], key: str) -> None:
    """Display stable_dual message"""
    dual_id = payload.get("dual_id", key)
    start_slot = payload.get("start_slot")
    end_slot = payload.get("end_slot")
    start_slot_2 = payload.get("start_slot_2")
    end_slot_2 = payload.get("end_slot_2")
    stable_since = payload.get("stable_since")
    
    if start_slot_2 and end_slot_2:
        # 4-point dual
        print(
            f"[DUAL-4P] {dual_id} | start1={start_slot} -> end1={end_slot} | start2={start_slot_2} -> end2={end_slot_2} | since={stable_since}"
        )
    else:
        # 2-point dual
        print(
            f"[DUAL-2P] {dual_id} | start={start_slot} -> end={end_slot} | since={stable_since}"
        )


def main() -> int:
    topics = ["stable_pairs", "stable_dual"]
    queue = SQLiteQueue("../queues.db")

    print(f"Viewer listening on topics: {topics}")

    # Discover existing keys and last ids for each topic
    last_id_by_topic_key: Dict[str, Dict[str, int]] = {}
    
    for topic in topics:
        last_id_by_topic_key[topic] = {}
        keys = list_keys(queue, topic)
        if not keys:
            print(f"Chưa có bản ghi nào cho topic '{topic}'. Chờ dữ liệu...")
        
        for key in keys:
            row = queue.get_latest_row(topic, key)
            if row:
                last_id_by_topic_key[topic][key] = row["id"]

    # Main loop: poll for new keys and new messages
    try:
        while True:
            for topic in topics:
                # pick up new keys dynamically
                for key in list_keys(queue, topic):
                    if key not in last_id_by_topic_key[topic]:
                        row = queue.get_latest_row(topic, key)
                        if row:
                            last_id_by_topic_key[topic][key] = row["id"]

                # fetch new rows per key
                for key, last_id in list(last_id_by_topic_key[topic].items()):
                    rows = queue.get_after_id(topic, key, last_id, limit=100)
                    for r in rows:
                        payload = r["payload"]
                        last_id_by_topic_key[topic][key] = r["id"]

                        # Display based on topic type
                        if topic == "stable_pairs":
                            display_stable_pair(payload, key)
                        elif topic == "stable_dual":
                            display_stable_dual(payload, key)

            time.sleep(0.2)
    except KeyboardInterrupt:
        print("\nViewer stopped.")
        return 0


if __name__ == "__main__":
    raise SystemExit(main())


