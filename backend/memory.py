import sqlite3
from datetime import datetime


DATABASE = "ultron_memory.db"


def get_connection():
    return sqlite3.connect(DATABASE)


def initialize_memory():
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS memories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            content TEXT NOT NULL,
            category TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
    """)

    connection.commit()
    connection.close()


def save_memory(content, category="general"):
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute(
        """
        INSERT INTO memories (content, category, created_at)
        VALUES (?, ?, ?)
        """,
        (
            content,
            category,
            datetime.now().isoformat()
        )
    )

    connection.commit()
    connection.close()


def get_memories():
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        SELECT id, content, category, created_at
        FROM memories
        ORDER BY id ASC
    """)

    memories = cursor.fetchall()

    connection.close()

    return [
        {
            "id": memory[0],
            "content": memory[1],
            "category": memory[2],
            "created_at": memory[3]
        }
        for memory in memories
    ]