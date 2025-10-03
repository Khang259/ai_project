import argparse
import json
import os
import sys
import time
from typing import List

from queue_store import SQLiteQueue


def list_topics(queue: SQLiteQueue) -> List[str]:
    with queue._connect() as conn:
        cur = conn.execute("SELECT DISTINCT topic FROM messages ORDER BY topic")
        return [row[0] for row in cur.fetchall()]


def list_keys(queue: SQLiteQueue, topic: str) -> List[str]:
    with queue._connect() as conn:
        cur = conn.execute(
            "SELECT DISTINCT key FROM messages WHERE topic = ? ORDER BY key",
            (topic,),
        )
        return [row[0] for row in cur.fetchall()]


def cmd_list(args: argparse.Namespace) -> int:
    queue = SQLiteQueue(args.db)
    topics = list_topics(queue)
    if not topics:
        print("Chưa có topic nào trong DB")
        return 0
    print("Topics:")
    for t in topics:
        print(f"  - {t}")
    return 0


def cmd_keys(args: argparse.Namespace) -> int:
    queue = SQLiteQueue(args.db)
    keys = list_keys(queue, args.topic)
    if not keys:
        print(f"Topic '{args.topic}' chưa có key nào")
        return 0
    print(f"Keys trong topic '{args.topic}':")
    for k in keys:
        print(f"  - {k}")
    return 0


def cmd_latest(args: argparse.Namespace) -> int:
    queue = SQLiteQueue(args.db)
    row = queue.get_latest_row(args.topic, args.key)
    if not row:
        print("Không có bản ghi nào")
        return 0
    print(f"id={row['id']} created_at={row['created_at']}")
    print(json.dumps(row["payload"], ensure_ascii=False, indent=2))
    return 0


def cmd_tail(args: argparse.Namespace) -> int:
    queue = SQLiteQueue(args.db)
    last_row = queue.get_latest_row(args.topic, args.key)
    last_id = last_row["id"] if last_row else 0
    try:
        while True:
            rows = queue.get_after_id(args.topic, args.key, last_id, limit=100)
            if rows:
                for r in rows:
                    last_id = r["id"]
                    print(f"[{r['created_at']}] id={r['id']}")
                    if args.pretty:
                        print(json.dumps(r["payload"], ensure_ascii=False, indent=2))
                    else:
                        print(json.dumps(r["payload"], ensure_ascii=False))
                    print("-")
            time.sleep(args.interval)
    except KeyboardInterrupt:
        print("\nDừng tail.")
        return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Viewer cho queues.db (topics/keys/latest/tail)",
    )
    parser.add_argument(
        "--db",
        default="queues.db",
        help="Đường dẫn tới file queues.db (mặc định: queues.db ở thư mục gốc)",
    )

    sub = parser.add_subparsers(dest="cmd", required=True)

    p_list = sub.add_parser("list", help="Liệt kê tất cả topics")
    p_list.set_defaults(func=cmd_list)

    p_keys = sub.add_parser("keys", help="Liệt kê tất cả keys của một topic")
    p_keys.add_argument("topic", help="Tên topic")
    p_keys.set_defaults(func=cmd_keys)

    p_latest = sub.add_parser("latest", help="Hiển thị bản ghi mới nhất theo topic/key")
    p_latest.add_argument("topic", help="Tên topic")
    p_latest.add_argument("key", help="Key")
    p_latest.set_defaults(func=cmd_latest)

    p_tail = sub.add_parser("tail", help="Theo dõi luồng bản ghi mới theo topic/key")
    p_tail.add_argument("topic", help="Tên topic")
    p_tail.add_argument("key", help="Key")
    p_tail.add_argument("--pretty", action="store_true", help="In JSON đẹp, có thụt lề")
    p_tail.add_argument("--interval", type=float, default=0.5, help="Chu kỳ polling (giây)")
    p_tail.set_defaults(func=cmd_tail)

    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())


