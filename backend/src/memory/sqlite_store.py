import sqlite3
import json
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any, Optional
import uuid


class SQLiteStore:
    def __init__(self, db_path: str = "./data/sessions.db"):
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()

    def _conn(self):
        conn = sqlite3.connect(self.db_path)
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA foreign_keys=ON")
        return conn

    def _init_db(self):
        with self._conn() as conn:
            c = conn.cursor()

            # Models registry
            c.execute('''
                CREATE TABLE IF NOT EXISTS models (
                    id TEXT PRIMARY KEY,
                    name TEXT UNIQUE NOT NULL,
                    gguf_path TEXT NOT NULL,
                    file_size_bytes INTEGER,
                    is_default INTEGER DEFAULT 0,
                    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_used_at TIMESTAMP
                )
            ''')

            # Chat sessions
            c.execute('''
                CREATE TABLE IF NOT EXISTS sessions (
                    session_id TEXT PRIMARY KEY,
                    title TEXT,
                    active_model_id TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(active_model_id) REFERENCES models(id)
                        ON DELETE SET NULL
                )
            ''')

            # Messages with model tracking
            c.execute('''
                CREATE TABLE IF NOT EXISTS messages (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id TEXT NOT NULL,
                    role TEXT NOT NULL,
                    content TEXT NOT NULL,
                    model_id TEXT,
                    model_name TEXT,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(session_id) REFERENCES sessions(session_id)
                        ON DELETE CASCADE,
                    FOREIGN KEY(model_id) REFERENCES models(id)
                        ON DELETE SET NULL
                )
            ''')

            conn.commit()

        # Auto-migrate old schema if needed
        self._migrate_if_needed()

    def _migrate_if_needed(self):
        """Migrate from old schema (model_type TEXT) to new schema."""
        with self._conn() as conn:
            c = conn.cursor()
            # Check if old columns exist
            c.execute("PRAGMA table_info(messages)")
            columns = {row[1] for row in c.fetchall()}

            if "model_type" in columns and "model_id" not in columns:
                # Old schema detected — add new columns
                c.execute("ALTER TABLE messages ADD COLUMN model_id TEXT")
                c.execute("ALTER TABLE messages ADD COLUMN model_name TEXT")
                # Copy model_type → model_name for existing rows
                c.execute("UPDATE messages SET model_name = model_type WHERE model_type IS NOT NULL")
                conn.commit()

            # Check sessions table for active_model_id
            c.execute("PRAGMA table_info(sessions)")
            session_cols = {row[1] for row in c.fetchall()}
            if "active_model_id" not in session_cols:
                c.execute("ALTER TABLE sessions ADD COLUMN active_model_id TEXT")
                conn.commit()

    # ── model registry ────────────────────────────────────────────

    def register_model(self, model_id: str, name: str, gguf_path: str, file_size_bytes: int):
        with self._conn() as conn:
            conn.execute(
                "INSERT INTO models (id, name, gguf_path, file_size_bytes) VALUES (?, ?, ?, ?)",
                (model_id, name, gguf_path, file_size_bytes)
            )
            conn.commit()

    def unregister_model(self, model_id: str):
        with self._conn() as conn:
            conn.execute("DELETE FROM models WHERE id = ?", (model_id,))
            conn.commit()

    def list_models(self) -> List[Dict[str, Any]]:
        with self._conn() as conn:
            c = conn.cursor()
            c.execute("SELECT id, name, gguf_path, file_size_bytes, is_default, registered_at, last_used_at FROM models ORDER BY name")
            return [
                {
                    "id": r[0], "name": r[1], "gguf_path": r[2],
                    "file_size_bytes": r[3], "is_default": bool(r[4]),
                    "registered_at": r[5], "last_used_at": r[6],
                }
                for r in c.fetchall()
            ]

    def get_model(self, model_id: str) -> Optional[Dict[str, Any]]:
        with self._conn() as conn:
            c = conn.cursor()
            c.execute("SELECT id, name, gguf_path, file_size_bytes, is_default FROM models WHERE id = ?", (model_id,))
            r = c.fetchone()
            if not r:
                return None
            return {"id": r[0], "name": r[1], "gguf_path": r[2], "file_size_bytes": r[3], "is_default": bool(r[4])}

    def set_default_model(self, model_id: str):
        with self._conn() as conn:
            conn.execute("UPDATE models SET is_default = 0")
            conn.execute("UPDATE models SET is_default = 1 WHERE id = ?", (model_id,))
            conn.commit()

    def get_default_model(self) -> Optional[Dict[str, Any]]:
        with self._conn() as conn:
            c = conn.cursor()
            c.execute("SELECT id, name, gguf_path, file_size_bytes FROM models WHERE is_default = 1 LIMIT 1")
            r = c.fetchone()
            if not r:
                return None
            return {"id": r[0], "name": r[1], "gguf_path": r[2], "file_size_bytes": r[3]}

    def touch_model_used(self, model_id: str):
        with self._conn() as conn:
            conn.execute("UPDATE models SET last_used_at = CURRENT_TIMESTAMP WHERE id = ?", (model_id,))
            conn.commit()

    # ── sessions ──────────────────────────────────────────────────

    def create_session(self, session_id: Optional[str] = None, title: Optional[str] = None, model_id: Optional[str] = None) -> str:
        if not session_id:
            session_id = str(uuid.uuid4())

        with self._conn() as conn:
            c = conn.cursor()
            c.execute(
                "INSERT OR IGNORE INTO sessions (session_id, title, active_model_id) VALUES (?, ?, ?)",
                (session_id, title, model_id)
            )
            if title:
                c.execute(
                    "UPDATE sessions SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE session_id = ?",
                    (title, session_id)
                )
            conn.commit()
        return session_id

    def update_session_model(self, session_id: str, model_id: str):
        with self._conn() as conn:
            conn.execute(
                "UPDATE sessions SET active_model_id = ?, updated_at = CURRENT_TIMESTAMP WHERE session_id = ?",
                (model_id, session_id)
            )
            conn.commit()

    def list_sessions(self) -> List[Dict[str, Any]]:
        with self._conn() as conn:
            c = conn.cursor()
            c.execute('''
                SELECT s.session_id, s.title, s.created_at, s.updated_at,
                       s.active_model_id, m.name as model_name
                FROM sessions s
                LEFT JOIN models m ON s.active_model_id = m.id
                ORDER BY s.updated_at DESC
            ''')
            return [
                {
                    "session_id": r[0],
                    "title": r[1] or "New Chat",
                    "created_at": r[2],
                    "updated_at": r[3],
                    "active_model_id": r[4],
                    "model_name": r[5],
                }
                for r in c.fetchall()
            ]

    def get_session_history(self, session_id: str) -> List[Dict[str, Any]]:
        with self._conn() as conn:
            c = conn.cursor()
            c.execute('''
                SELECT role, content, model_id, model_name, timestamp
                FROM messages
                WHERE session_id = ?
                ORDER BY timestamp ASC, id ASC
            ''', (session_id,))
            return [
                {
                    "role": r[0], "content": r[1],
                    "model_id": r[2], "model_name": r[3],
                    "timestamp": r[4],
                }
                for r in c.fetchall()
            ]

    # ── messages ──────────────────────────────────────────────────

    def add_message(self, session_id: str, role: str, content: str,
                    model_id: Optional[str] = None, model_name: Optional[str] = None):
        with self._conn() as conn:
            c = conn.cursor()
            # Ensure session exists
            c.execute("INSERT OR IGNORE INTO sessions (session_id) VALUES (?)", (session_id,))

            c.execute('''
                INSERT INTO messages (session_id, role, content, model_id, model_name)
                VALUES (?, ?, ?, ?, ?)
            ''', (session_id, role, content, model_id, model_name))

            c.execute(
                "UPDATE sessions SET updated_at = CURRENT_TIMESTAMP WHERE session_id = ?",
                (session_id,)
            )
            conn.commit()
