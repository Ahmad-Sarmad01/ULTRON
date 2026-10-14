import os
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

from mood import get_mood


BASE_DIR = Path(__file__).resolve().parent.parent
MEMORY_DATABASE = BASE_DIR / "ultron_memory.db"
MISSION_DATABASE = BASE_DIR / "ultron_missions.db"


def _database_status(path: Path, table: str):
    try:
        with sqlite3.connect(path) as connection:
            connection.execute(f"SELECT 1 FROM {table} LIMIT 1")
        return {"status": "online"}
    except sqlite3.Error as error:
        return {"status": "degraded", "detail": type(error).__name__}


def _provider_status():
    providers = {
        "gemini": "GEMINI_API_KEY",
        "groq": "GROQ_API_KEY",
        "openrouter": "OPENROUTER_API_KEY",
        "mistral": "MISTRAL_API_KEY",
    }
    configured = [name for name, key in providers.items() if os.getenv(key)]
    if not configured:
        return {"status": "unavailable", "configured": []}
    return {
        "status": "online",
        "configured": configured,
        "provider": configured[0],
    }


def run_system_scan():
    memory = _database_status(MEMORY_DATABASE, "memories")
    missions = _database_status(MISSION_DATABASE, "missions")
    database_status = "online" if memory["status"] == "online" and missions["status"] == "online" else "degraded"

    try:
        mood = get_mood()
        mood_result = {"status": "online", "mood": mood["mood"]}
    except Exception as error:
        mood_result = {"status": "degraded", "detail": type(error).__name__}

    try:
        import edge_tts  # noqa: F401
        voice_result = {"status": "online"}
    except ImportError:
        voice_result = {"status": "unavailable"}

    systems = {
        "backend": {"status": "online"},
        "ai": _provider_status(),
        "memory": memory,
        "missions": missions,
        "voice": voice_result,
        "mood": mood_result,
        "database": {"status": database_status},
    }
    degraded = [system for system in systems.values() if system["status"] not in {"online", "available"}]

    return {
        "status": "degraded" if degraded else "operational",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "systems": systems,
        "integrity": round((len(systems) - len(degraded)) / len(systems) * 100),
    }