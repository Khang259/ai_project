import json
import os
import sqlite3
import threading
from datetime import datetime
from typing import Any, Dict, Optional


class SQLiteQueue:
    """
    Hàng đợi đơn giản dựa trên SQLite với 2 topic:
    - raw_detection (key = camera_id)
    - roi_config (key = camera_id)

    Lưu message theo dạng (topic, key, payload_json, created_at).
    Cung cấp publish() và tiện ích đọc gần nhất để debug.
    """

    def __init__(self, db_path: str = "queues.db") -> None:
        self._db_path = db_path
        self._lock = threading.Lock()
        os.makedirs(os.path.dirname(db_path) or ".", exist_ok=True)
        self._init_db()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self._db_path, check_same_thread=False)
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.execute("PRAGMA synchronous=NORMAL;")
        return conn

    def _init_db(self) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS messages (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    topic TEXT NOT NULL,
                    key TEXT NOT NULL,
                    payload TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );
                """
            )
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_messages_topic_key_time ON messages(topic, key, created_at);"
            )

    def publish(self, topic: str, key: str, payload: Dict[str, Any]) -> None:
        now_iso = datetime.utcnow().isoformat() + "Z"
        record = (topic, key, json.dumps(payload, ensure_ascii=False), now_iso)
        with self._lock:
            with self._connect() as conn:
                conn.execute(
                    "INSERT INTO messages(topic, key, payload, created_at) VALUES (?, ?, ?, ?)",
                    record,
                )

    def get_latest(self, topic: str, key: str) -> Optional[Dict[str, Any]]:
        with self._connect() as conn:
            cur = conn.execute(
                """
                SELECT payload FROM messages
                WHERE topic = ? AND key = ?
                ORDER BY id DESC
                LIMIT 1
                """,
                (topic, key),
            )
            row = cur.fetchone()
            if row is None:
                return None
            return json.loads(row[0])

    def get_latest_row(self, topic: str, key: str) -> Optional[Dict[str, Any]]:
        with self._connect() as conn:
            cur = conn.execute(
                """
                SELECT id, payload, created_at FROM messages
                WHERE topic = ? AND key = ?
                ORDER BY id DESC
                LIMIT 1
                """,
                (topic, key),
            )
            row = cur.fetchone()
            if row is None:
                return None
            return {"id": row[0], "payload": json.loads(row[1]), "created_at": row[2]}

    def get_after_id(self, topic: str, key: str, after_id: int, limit: int = 50) -> list[Dict[str, Any]]:
        with self._connect() as conn:
            cur = conn.execute(
                """
                SELECT id, payload, created_at FROM messages
                WHERE topic = ? AND key = ? AND id > ?
                ORDER BY id ASC
                LIMIT ?
                """,
                (topic, key, after_id, limit),
            )
            rows = cur.fetchall()
            result = []
            for r in rows:
                result.append({"id": r[0], "payload": json.loads(r[1]), "created_at": r[2]})
            return result


__all__ = ["SQLiteQueue"]


