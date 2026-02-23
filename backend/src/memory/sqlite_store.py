import sqlite3
import json
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any, Optional
import uuid

class SQLiteStore:
    def __init__(self, db_path: str = "./data/sessions.db"):
        self.db_path = Path(db_path)
        # Ensure the directory exists
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()

    def _init_db(self):
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS sessions (
                    session_id TEXT PRIMARY KEY,
                    title TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS messages (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id TEXT,
                    role TEXT,
                    content TEXT,
                    model_type TEXT,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(session_id) REFERENCES sessions(session_id)
                )
            ''')
            conn.commit()

    def create_session(self, session_id: Optional[str] = None, title: Optional[str] = None) -> str:
        if not session_id:
            session_id = str(uuid.uuid4())
        
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            # Insert or ignore to allow specifying a previously unknown session_id
            cursor.execute(
                'INSERT OR IGNORE INTO sessions (session_id, title) VALUES (?, ?)',
                (session_id, title)
            )
            # update title if it was provided and we didn't just create it
            if title:
                cursor.execute(
                    'UPDATE sessions SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE session_id = ?',
                    (title, session_id)
                )
            conn.commit()
        return session_id

    def list_sessions(self) -> List[Dict[str, Any]]:
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT session_id, title, created_at, updated_at 
                FROM sessions 
                ORDER BY updated_at DESC
            ''')
            rows = cursor.fetchall()
            
            sessions = []
            for row in rows:
                sessions.append({
                    "session_id": row[0],
                    "title": row[1] or "New Chat",
                    "created_at": row[2],
                    "updated_at": row[3]
                })
            return sessions

    def get_session_history(self, session_id: str) -> List[Dict[str, Any]]:
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT role, content, model_type, timestamp 
                FROM messages 
                WHERE session_id = ? 
                ORDER BY timestamp ASC, id ASC
            ''', (session_id,))
            rows = cursor.fetchall()
            
            messages = []
            for row in rows:
                messages.append({
                    "role": row[0],
                    "content": row[1],
                    "model_type": row[2],
                    "timestamp": row[3]
                })
            return messages

    def add_message(self, session_id: str, role: str, content: str, model_type: Optional[str] = None):
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            # Ensure session exists
            cursor.execute(
                'INSERT OR IGNORE INTO sessions (session_id) VALUES (?)',
                (session_id,)
            )
            
            cursor.execute('''
                INSERT INTO messages (session_id, role, content, model_type) 
                VALUES (?, ?, ?, ?)
            ''', (session_id, role, content, model_type))
            
            # Update session's updated_at
            cursor.execute('''
                UPDATE sessions 
                SET updated_at = CURRENT_TIMESTAMP 
                WHERE session_id = ?
            ''', (session_id,))
            conn.commit()
