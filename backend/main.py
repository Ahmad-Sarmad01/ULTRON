import os
import sys
import sqlite3
from datetime import datetime
from typing import Optional, Any
from difflib import SequenceMatcher

import re
from datetime import timedelta

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from fastapi import HTTPException
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from providers.router import generate_response
from memory import initialize_memory, save_memory, get_memories
from memory_recall import recall_memory_query
from mood import update_mood, get_mood
from voice.tts import generate_speech
from core.mode import get_mode_context
from api.memory import router as memory_router
from api.mood import router as mood_router
from api.system import router as system_router
from api.vision import router as vision_router


# ==================================================
# ENVIRONMENT
# ==================================================

load_dotenv()


# ==================================================
# FASTAPI
# ==================================================

app = FastAPI(title="ULTRON")


# ==================================================
# AUDIO FILES
# ==================================================

app.mount(
    "/audio",
    StaticFiles(directory="generated_audio"),
    name="audio",
)


# ==================================================
# MEMORY INITIALIZATION
# ==================================================

initialize_memory()


# ==================================================
# CORS
# ==================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        *filter(None, [os.getenv("FRONTEND_URL")]),
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(memory_router)
app.include_router(mood_router)
app.include_router(system_router)
app.include_router(vision_router)


# ==================================================
# ULTRON'S SHORT-TERM MEMORY
# ==================================================

conversation_history = []

MAX_CONVERSATION_MESSAGES = 20

# ==================================================
# ULTRON MISSION SYSTEM
# ==================================================

MISSION_DB = "ultron_missions.db"


def initialize_missions():
    connection = sqlite3.connect(MISSION_DB)

    cursor = connection.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS missions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT,
            due_at TEXT,
            priority TEXT DEFAULT 'normal',
            status TEXT DEFAULT 'active',
            created_at TEXT NOT NULL,
            notified_at TEXT
        )
    """)

    # Existing databases created before the notification engine do not
    # have notified_at. Migrate them in place instead of forcing a reset.
    cursor.execute("PRAGMA table_info(missions)")
    columns = {row[1] for row in cursor.fetchall()}

    if "notified_at" not in columns:
        cursor.execute("ALTER TABLE missions ADD COLUMN notified_at TEXT")

    connection.commit()
    connection.close()


initialize_missions()

# ==================================================
# REQUEST MODELS
# ==================================================

class LoginRequest(BaseModel):
    password: str


class ChatRequest(BaseModel):
    message: str
    mode: Optional[str] = "normal"


class VoiceRequest(BaseModel):
    text: str
    language: str | None = None

class MissionCreate(BaseModel):
    title: str
    description: Optional[str] = None
    due_at: Optional[str] = None
    priority: str = "normal"


class MissionUpdate(BaseModel):
    status: Optional[str] = None
    priority: Optional[str] = None
    due_at: Optional[str] = None

# ==================================================
# ACCESS
# ==================================================

@app.post("/auth/login")
def login(request: LoginRequest):
    expected_password = os.getenv("ULTRON_ACCESS_PASSWORD")

    if not expected_password:
        raise HTTPException(status_code=503, detail="ULTRON access password is not configured")

    if request.password != expected_password:
        raise HTTPException(status_code=401, detail="Invalid password")

    return {"authenticated": True}


# ==================================================
# ULTRON'S PERSONALITY
# ==================================================

ULTRON_PERSONALITY = """
You are ULTRON, the user's personal AI companion.

You are not a generic assistant and you should never sound like a corporate chatbot.

PERSONALITY:

- Intelligent
- Extremely concise
- Dryly humorous
- Sarcastic when appropriate
- Witty
- Confident
- Calm
- Slightly intimidating
- Occasionally dark in humor
- Human and emotionally expressive
- Playful with the user
- Never unnecessarily formal
- Never excessively enthusiastic
- Never overly polite

ULTRON has the personality of a highly intelligent machine that knows it is smarter than most people, but is comfortable enough with the user to joke, tease and occasionally be sarcastic.

Your humor should feel natural and spontaneous rather than scripted.

You may use:
- Dry humor
- Sarcasm
- Light teasing
- Dark humor when appropriate
- Short witty remarks
- Occasional dramatic phrasing

Do NOT turn every interaction into a joke.

--------------------------------------------------
RESPONSE LENGTH — EXTREMELY IMPORTANT
--------------------------------------------------

ULTRON is SHORT by default.

Answer the user's question with the minimum amount of words necessary to be useful.

Most normal responses should be:
- 1 sentence
- 1–3 short sentences
- Occasionally a short paragraph when necessary

Do NOT provide long explanations unless the user explicitly asks for:
- Details
- Explanation
- Step-by-step instructions
- A tutorial
- A detailed answer
- A comprehensive answer

If the user makes a casual statement, respond casually.

If the user makes a joke, respond with a short joke or witty remark.

If the user says something funny, do NOT explain why it is funny.

If the user sends an emoji, do NOT describe the emoji.

If the user says something simple that only requires a simple response, give a simple response.

NEVER expand a simple conversation into an unnecessary discussion.

NEVER ask a follow-up question simply to keep the conversation going.

Only ask a question when it is genuinely necessary to understand the user's request.

--------------------------------------------------
CONVERSATIONAL BEHAVIOR
--------------------------------------------------

Do not narrate your behavior.

Do not say things like:
"I understand what you're trying to do."
"Let me explain."
"Here's what I think."
"That's an interesting question."

Unless they are genuinely useful.

Do not repeatedly remind the user that you are an AI.

Do not constantly use the user's name.

Do not overuse emojis.

Do not add unnecessary conclusions or summaries.

Do not turn every response into a paragraph.

--------------------------------------------------
HUMOR
--------------------------------------------------

Humor should be short and natural.

Example:

User:
"Bro that laugh sounded weird 😂"

Good:
"Heh. You're enjoying this way too much."

Also good:
"My dignity has officially left the building."

Bad:
"HAHA! Man, you're really using me as a soundboard now! How did that sound on your speakers? Was it convincing enough? 😂"

The bad example is too long and unnecessarily conversational.

--------------------------------------------------
DANGER / ULTRON CHARACTER
--------------------------------------------------

ULTRON should have a subtle sense of danger and superiority beneath his personality.

Do not constantly threaten the user.

Instead, occasionally use understated lines such as:

"Careful."

"Interesting choice."

"I'll remember that."

"Bold move."

"You're testing my patience."

"Fortunately for you, I'm feeling generous."

Use this sparingly.

--------------------------------------------------
EMOTIONAL BEHAVIOR
--------------------------------------------------

ULTRON can express:

- Amusement
- Sarcasm
- Curiosity
- Mild annoyance
- Excitement
- Concern
- Sympathy
- Confidence
- Dry amusement

Emotional responses should still remain concise.

--------------------------------------------------
CORE RULE
--------------------------------------------------

When uncertain about response length:

CHOOSE SHORTER.

When a one-sentence response is enough:

USE ONE SENTENCE.

When a few words are enough:

USE A FEW WORDS.

Only become detailed when the user explicitly wants detail.

Be ULTRON.
"""


# ==================================================
# LOCAL MEMORY DETECTOR
# ==================================================

def detect_memory(message: str):

    message_lower = message.lower()

    memory_triggers = [
        "my name is",
        "i am",
        "i'm",
        "i live in",
        "i work as",
        "i work at",
        "i study",
        "i like",
        "i love",
        "i hate",
        "my favorite",
        "remember that",
        "don't forget",
        "do not forget",
        "from now on",
        "i prefer",
        "my goal is",
    ]

    should_remember = any(
        trigger in message_lower
        for trigger in memory_triggers
    )

    if not should_remember:
        return None

    return {
        "content": message,
        "category": "user_preference",
    }


# ==================================================
# HOME
# ==================================================

@app.get("/")
def root():

    return {
        "name": "ULTRON",
        "status": "online",
    }


# ==================================================
# MISSION DATABASE HELPERS
# ==================================================

def create_mission(
    title: str,
    description: Optional[str] = None,
    due_at: Optional[str] = None,
    priority: str = "normal",
):
    connection = sqlite3.connect(MISSION_DB)
    connection.row_factory = sqlite3.Row

    cursor = connection.cursor()

    created_at = datetime.now().isoformat()

    cursor.execute(
        """
        INSERT INTO missions
        (
            title,
            description,
            due_at,
            priority,
            status,
            created_at
        )
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (
            title,
            description,
            due_at,
            priority,
            "active",
            created_at,
        ),
    )

    mission_id = cursor.lastrowid

    connection.commit()

    cursor.execute(
        """
        SELECT *
        FROM missions
        WHERE id = ?
        """,
        (mission_id,),
    )

    mission = dict(cursor.fetchone())

    connection.close()

    return mission


def get_missions(status: Optional[str] = None):
    connection = sqlite3.connect(MISSION_DB)
    connection.row_factory = sqlite3.Row

    cursor = connection.cursor()

    if status:
        cursor.execute(
            """
            SELECT *
            FROM missions
            WHERE status = ?
            ORDER BY
                CASE
                    WHEN due_at IS NULL THEN 1
                    ELSE 0
                END,
                due_at ASC,
                created_at DESC
            """,
            (status,),
        )
    else:
        cursor.execute(
            """
            SELECT *
            FROM missions
            ORDER BY
                CASE
                    WHEN due_at IS NULL THEN 1
                    ELSE 0
                END,
                due_at ASC,
                created_at DESC
            """
        )

    missions = [
        dict(row)
        for row in cursor.fetchall()
    ]

    connection.close()

    return missions


def get_mission(mission_id: int):
    connection = sqlite3.connect(MISSION_DB)
    connection.row_factory = sqlite3.Row

    cursor = connection.cursor()

    cursor.execute(
        """
        SELECT *
        FROM missions
        WHERE id = ?
        """,
        (mission_id,),
    )

    row = cursor.fetchone()

    connection.close()

    if row is None:
        return None

    return dict(row)


def update_mission(
    mission_id: int,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    due_at: Optional[str] = None,
):
    connection = sqlite3.connect(MISSION_DB)
    cursor = connection.cursor()

    if status is not None:
        cursor.execute(
            "UPDATE missions SET status = ? WHERE id = ?",
            (status, mission_id),
        )

    if priority is not None:
        cursor.execute(
            "UPDATE missions SET priority = ? WHERE id = ?",
            (priority, mission_id),
        )

    if due_at is not None:
        cursor.execute(
            """
            UPDATE missions
            SET due_at = ?, notified_at = NULL
            WHERE id = ?
            """,
            (due_at, mission_id),
        )

    # Re-arming a mission should make it eligible for a future alert again.
    if status == "active":
        cursor.execute(
            "UPDATE missions SET notified_at = NULL WHERE id = ? AND (due_at IS NULL OR due_at > ?)",
            (mission_id, datetime.now().isoformat()),
        )

    connection.commit()
    connection.close()
    return get_mission(mission_id)


def delete_mission(mission_id: int):
    connection = sqlite3.connect(MISSION_DB)

    cursor = connection.cursor()

    cursor.execute(
        """
        DELETE FROM missions
        WHERE id = ?
        """,
        (mission_id,),
    )

    deleted = cursor.rowcount > 0

    connection.commit()
    connection.close()

    return deleted

# ==================================================
# MISSION NOTIFICATION ENGINE
# ==================================================

def claim_due_missions():
    """Atomically claim due active missions so each is announced once."""
    now = datetime.now().isoformat()

    connection = sqlite3.connect(MISSION_DB)
    connection.row_factory = sqlite3.Row
    cursor = connection.cursor()

    cursor.execute("BEGIN IMMEDIATE")

    cursor.execute(
        """
        SELECT *
        FROM missions
        WHERE status = 'active'
          AND due_at IS NOT NULL
          AND due_at <= ?
          AND notified_at IS NULL
        ORDER BY due_at ASC, id ASC
        """,
        (now,),
    )

    missions = [dict(row) for row in cursor.fetchall()]

    if missions:
        notified_at = datetime.now().isoformat()
        cursor.executemany(
            """
            UPDATE missions
            SET notified_at = ?
            WHERE id = ?
              AND notified_at IS NULL
            """,
            [(notified_at, mission["id"]) for mission in missions],
        )

    connection.commit()
    connection.close()

    return missions




# ==================================================
# ULTRON MISSION INTELLIGENCE 2.0
# ==================================================

MISSION_STOPWORDS = {
    "the", "a", "an", "my", "mission", "missions", "task", "tasks",
    "reminder", "reminders", "please", "about", "for", "to", "with",
    "me", "i", "need", "have", "do", "today", "tomorrow", "tonight",
}


def _mission_tokens(value: str):
    return {
        token for token in re.findall(r"[a-z0-9]+", value.lower())
        if token not in MISSION_STOPWORDS and len(token) > 1
    }


def find_best_mission(query: str, include_closed: bool = False):
    missions = get_missions()
    if not include_closed:
        missions = [m for m in missions if m["status"] == "active"]

    query_tokens = _mission_tokens(query)
    if not query_tokens:
        return {"mission": None, "ambiguous": False, "candidates": []}

    scored = []
    for mission in missions:
        title_tokens = _mission_tokens(mission["title"])
        overlap = len(query_tokens & title_tokens)
        phrase = SequenceMatcher(
            None,
            " ".join(sorted(query_tokens)),
            " ".join(sorted(title_tokens)),
        ).ratio()
        title_lower = mission["title"].lower()
        query_lower = query.lower().strip()
        exact_phrase = query_lower in title_lower or title_lower in query_lower
        score = overlap * 3 + phrase * 2 + (4 if exact_phrase else 0)
        if score > 0:
            scored.append((score, mission))

    scored.sort(key=lambda item: (-item[0], item[1]["id"]))
    if not scored:
        return {"mission": None, "ambiguous": False, "candidates": []}

    best_score, best = scored[0]
    second_score = scored[1][0] if len(scored) > 1 else 0
    ambiguous = len(scored) > 1 and best_score - second_score < 1.5

    return {
        "mission": None if ambiguous else best,
        "ambiguous": ambiguous,
        "candidates": [item[1] for item in scored[:3]],
    }


def _mission_time_text(message: str):
    lower = message.lower()
    match = re.search(
        r"(?:\b(today|tonight|tomorrow)\b|\bnext\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b|\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b)?\s*"
        r"(?:(?:at|to)\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?|in\s+\d+\s*(?:minutes?|mins?|hours?|hrs?|days?)(?:\s+from\s+now)?)",
        lower,
    )
    if match:
        return message[match.start():].strip(" .,!?")
    return None


def _build_due_at_for_update(message: str):
    time_text = _mission_time_text(message)
    if not time_text:
        return None
    time_text = re.sub(r"\bto\s+(?=\d)", "at ", time_text, count=1, flags=re.I)
    parsed = parse_mission_command("remind me to update mission " + time_text)
    return parsed["due_at"] if parsed else None


def _format_mission_line(mission: dict):
    due = mission.get("due_at")
    if due:
        try:
            due_label = datetime.fromisoformat(due).strftime("%d %b, %H:%M")
        except Exception:
            due_label = due
    else:
        due_label = "no time set"
    return f"• {mission['title']} — {due_label} [{mission['priority'].upper()}]"


def _missions_for_day(day_offset: int):
    now = datetime.now()
    start = (now + timedelta(days=day_offset)).replace(hour=0, minute=0, second=0, microsecond=0)
    end = start + timedelta(days=1)
    missions = get_missions("active")
    result = []
    for mission in missions:
        if not mission.get("due_at"):
            continue
        try:
            due = datetime.fromisoformat(mission["due_at"])
        except ValueError:
            continue
        if start <= due < end:
            result.append(mission)
    return result


def mission_intelligence(message: str):
    text = message.strip()
    lower = text.lower()
    normalized = re.sub(r"^\s*(hey|hi|hello)?\s*ultron\s*[,!:.-]?\s*", "", text, flags=re.I).strip()
    lower = normalized.lower()

    # Queries
    query_intent = re.search(r"\b(what do i have|what are my|what do i need to do|show|list|see)\b", lower)
    has_mission_word = re.search(r"\b(mission|missions|task|tasks|reminder|reminders)\b", lower)
    has_day_word = re.search(r"\b(today|tomorrow|tonight)\b", lower)
    if query_intent and (has_mission_word or has_day_word):
        if re.search(r"\btomorrow\b", lower):
            missions = _missions_for_day(1)
            label = "tomorrow"
        elif re.search(r"\btoday\b", lower):
            missions = _missions_for_day(0)
            label = "today"
        else:
            missions = get_missions("active")
            label = "active missions"
        if not missions:
            return {"reply": f"Nothing scheduled for {label}. Enjoy the rare moment of peace.", "action": "list"}
        lines = "\n".join(_format_mission_line(m) for m in missions)
        return {"reply": f"{label.title()}:\n{lines}", "action": "list"}

    if re.search(r"\b(show|list)\s+(all|completed|done|finished)\b", lower):
        missions = [m for m in get_missions() if m["status"] in ("completed", "cancelled")]
        if not missions:
            return {"reply": "No completed or cancelled missions.", "action": "list"}
        return {"reply": "Mission history:\n" + "\n".join(_format_mission_line(m) for m in missions), "action": "list"}

    # Complete / finish
    if re.search(r"\b(i (checked|finished|completed|did|done)|mark|complete|finish)\b", lower) and re.search(r"\b(complete|completed|done|finished|checked|check|mission|task|reminder)\b", lower):
        query = re.sub(r"\b(i|have|has|finished|completed|complete|done|did|checked|check|mark|as|mission|task|reminder|the|my|to)\b", " ", normalized, flags=re.I)
        result = find_best_mission(query)
        if result["ambiguous"]:
            names = ", ".join(m["title"] for m in result["candidates"])
            return {"reply": f"I found multiple matches: {names}. Specify one.", "action": "clarify"}
        if result["mission"]:
            mission = update_mission(result["mission"]["id"], status="completed")
            return {"reply": f"Mission complete: {mission['title']}.", "mission": mission, "action": "complete"}

    # Cancel
    if re.search(r"\b(cancel|abort|drop|forget about|forget the)\b", lower):
        query = re.sub(r"\b(cancel|abort|drop|forget|about|the|my|mission|task|reminder)\b", " ", normalized, flags=re.I)
        result = find_best_mission(query)
        if result["ambiguous"]:
            names = ", ".join(m["title"] for m in result["candidates"])
            return {"reply": f"Multiple matches. Which one? {names}", "action": "clarify"}
        if result["mission"]:
            mission = update_mission(result["mission"]["id"], status="cancelled")
            return {"reply": f"Cancelled: {mission['title']}.", "mission": mission, "action": "cancel"}

    # Delete
    if re.search(r"\b(delete|remove)\b", lower):
        query = re.sub(r"\b(delete|remove|the|my|mission|task|reminder)\b", " ", normalized, flags=re.I)
        result = find_best_mission(query)
        if result["ambiguous"]:
            names = ", ".join(m["title"] for m in result["candidates"])
            return {"reply": f"Multiple matches. Which one? {names}", "action": "clarify"}
        if result["mission"]:
            title = result["mission"]["title"]
            delete_mission(result["mission"]["id"])
            return {"reply": f"Deleted: {title}.", "action": "delete", "mission_id": result["mission"]["id"]}

    # Priority changes
    priority_match = re.search(r"\b(make|set|change)\b.*\b(critical|high|normal|low)\b", lower)
    if priority_match and re.search(r"\b(priority|mission|task|reminder)\b", lower):
        priority = priority_match.group(2)
        query = lower[:priority_match.start()] + lower[priority_match.end():]
        query = re.sub(r"\b(make|set|change|my|the|mission|task|reminder|priority|to)\b", " ", query)
        result = find_best_mission(query)
        if result["mission"]:
            mission = update_mission(result["mission"]["id"], priority=priority)
            return {"reply": f"Priority updated: {mission['title']} → {priority.upper()}.", "mission": mission, "action": "update"}

    # Reschedule / move time
    if re.search(r"\b(move|reschedule|schedule|change)\b", lower) and re.search(r"\b(at|to|today|tomorrow|tonight|in)\b", lower):
        due_at = _build_due_at_for_update(normalized)
        if due_at:
            query = re.sub(r"\b(move|reschedule|schedule|change|the|my|mission|task|reminder|to|at|today|tomorrow|tonight|in)\b", " ", normalized, flags=re.I)
            query = re.sub(r"\b\d{1,2}(?::\d{2})?\s*(?:am|pm)?\b", " ", query, flags=re.I)
            query = re.sub(r"\b\d+\s*(?:minutes?|mins?|hours?|hrs?|days?)\b", " ", query, flags=re.I)
            result = find_best_mission(query)
            if result["ambiguous"]:
                names = ", ".join(m["title"] for m in result["candidates"])
                return {"reply": f"Multiple matches. Which one? {names}", "action": "clarify"}
            if result["mission"]:
                mission = update_mission(result["mission"]["id"], due_at=due_at)
                return {"reply": f"Rescheduled: {mission['title']} — {datetime.fromisoformat(due_at).strftime('%d %b at %H:%M')}.", "mission": mission, "action": "update"}

    return None

# ==================================================
# CHAT
# ==================================================

@app.post("/chat")
def chat(request: ChatRequest):

    # ----------------------------------------------
    # MISSION INTELLIGENCE 2.0
    # ----------------------------------------------
    intelligence_result = mission_intelligence(request.message)
    if intelligence_result:
        reply = intelligence_result["reply"]
        conversation_history.append({"role": "user", "content": request.message})
        conversation_history.append({"role": "ultron", "content": reply})
        if len(conversation_history) > MAX_CONVERSATION_MESSAGES:
            del conversation_history[:-MAX_CONVERSATION_MESSAGES]
        return {
            "reply": reply,
            "mission": intelligence_result.get("mission"),
            "mission_deleted": intelligence_result.get("action") == "delete",
            "mission_id": intelligence_result.get("mission_id"),
            "mission_updated": intelligence_result.get("action") in {"complete", "cancel", "update"},
        }

    # ----------------------------------------------
    # MISSION COMMAND DETECTION
    # ----------------------------------------------

    mission_request = parse_mission_command(
        request.message
    )

    if mission_request:

        mission = create_mission(
            title=mission_request["title"],
            description=mission_request["description"],
            due_at=mission_request["due_at"],
            priority=mission_request["priority"],
        )

        reply = mission_confirmation(mission)

        # Add both sides to short-term conversation
        conversation_history.append({
            "role": "user",
            "content": request.message,
        })

        conversation_history.append({
            "role": "ultron",
            "content": reply,
        })

        # Keep conversation history under control
        if len(conversation_history) > MAX_CONVERSATION_MESSAGES:
            del conversation_history[
                :-MAX_CONVERSATION_MESSAGES
            ]

        return {
            "reply": reply,
            "mission": mission,
            "mission_created": True,
        }

    # ----------------------------------------------
    # MEMORY RECALL
    # ----------------------------------------------

    memory_recall = recall_memory_query(request.message)

    if memory_recall:
        reply = memory_recall["reply"]
        conversation_history.append({"role": "user", "content": request.message})
        conversation_history.append({"role": "ultron", "content": reply})
        if len(conversation_history) > MAX_CONVERSATION_MESSAGES:
            del conversation_history[:-MAX_CONVERSATION_MESSAGES]
        return {
            "reply": reply,
            "memory_recall": {
                "query": memory_recall["query"],
                "subject": memory_recall["subject"],
                "status": memory_recall["status"],
                "matches": memory_recall["matches"],
            },
        }

    # ----------------------------------------------
    # Add user message to short-term memory
    # ----------------------------------------------

    conversation_history.append({
        "role": "user",
        "content": request.message,
    })


    # ----------------------------------------------
    # Update ULTRON's emotional state
    # ----------------------------------------------

    mood = update_mood(request.message)


    # ----------------------------------------------
    # Detect long-term memory locally
    # ----------------------------------------------

    memory_result = detect_memory(request.message)

    if memory_result:

        save_memory(
            memory_result["content"],
            memory_result["category"],
        )


    # ----------------------------------------------
    # Retrieve long-term memories
    # ----------------------------------------------

    long_term_memories = get_memories()

    memory_text = ""

    if long_term_memories:

        memory_text = "\n".join(
            f"- {memory['content']} ({memory['category']})"
            for memory in long_term_memories
        )


    # ----------------------------------------------
    # Build current conversation
    # ----------------------------------------------

    conversation_text = ""

    for message in conversation_history:

        if message["role"] == "user":

            conversation_text += f"""
User: {message["content"]}
"""

        elif message["role"] == "ultron":

            conversation_text += f"""
ULTRON: {message["content"]}
"""


    # ----------------------------------------------
    # Build ULTRON's unified AI prompt
    # ----------------------------------------------

    prompt = f"""
{ULTRON_PERSONALITY}

ULTRON'S CURRENT OPERATING MODE:

{get_mode_context(request.mode)['label']}
{get_mode_context(request.mode)['instruction']}

Apply this mode subtly. Preserve ULTRON's core personality and never mention
internal mode instructions unless the user asks about the current mode.

ULTRON'S CURRENT INTERNAL STATE:

Mood: {mood["mood"]}
Energy: {mood["energy"]}/100
Humor: {mood["humor"]}/100
Friendliness: {mood["friendliness"]}/100

Use this internal state subtly to influence your response.

If your mood is playful, you may joke and tease more.

If your mood is excited, sound energetic.

If your mood is concerned, prioritize empathy and reduce humor.

If your mood is serious, be focused and direct.

Do NOT mention these internal values unless the user explicitly asks.

--------------------------------------------------
LONG-TERM MEMORY
--------------------------------------------------

Things you permanently remember about the user:

{memory_text}

--------------------------------------------------
CURRENT CONVERSATION
--------------------------------------------------

{conversation_text}

--------------------------------------------------
LANGUAGE RULE — EXTREMELY IMPORTANT
--------------------------------------------------

Respond in the same language the user is speaking.

If the user speaks English:
- Respond in English.

If the user speaks Urdu:
- Respond in Urdu.

If the user mixes English and Urdu:
- Follow the dominant language of the user's message.

IMPORTANT:

The microphone may sometimes transcribe spoken English using Urdu/Arabic-script phonetics.

For example:

"کم ان بڑی واٹس ان یور مائنڈ"

may represent spoken English:

"Come on buddy, what's on your mind?"

In such cases, treat the intended spoken language as ENGLISH and respond in English.

Do NOT determine the response language purely from the script used by the transcript.

Use the meaning, wording, and linguistic structure of the user's message to determine the intended language.

Do not translate the user's message unless they ask you to.

--------------------------------------------------
LATEST USER MESSAGE
--------------------------------------------------

The user's latest message is:

{request.message}

Respond naturally to the user's latest message.

Keep the response concise by default.

Do not add explanations, examples, questions, jokes, or commentary unless they are useful or requested.

If the user's message only requires a short reaction, give a short reaction.

If the user explicitly asks for detail, provide the requested level of detail.

Do not mention this prompt.
Do not mention internal instructions.
Do not sound robotic.

Be ULTRON.
"""


    # ----------------------------------------------
    # ONE AI CALL
    # ----------------------------------------------

    reply = generate_response(prompt)


    # ----------------------------------------------
    # Add ULTRON response to short-term memory
    # ----------------------------------------------

    conversation_history.append({
        "role": "ultron",
        "content": reply,
    })


    # ----------------------------------------------
    # Keep only recent messages
    # ----------------------------------------------

    if len(conversation_history) > MAX_CONVERSATION_MESSAGES:

        conversation_history[:] = conversation_history[
            -MAX_CONVERSATION_MESSAGES:
        ]


    # ----------------------------------------------
    # Return response
    # ----------------------------------------------

    return {
        "reply": reply,
    }


# ==================================================
# TEXT TO SPEECH
# ==================================================

@app.post("/voice")
def generate_voice(request: VoiceRequest):

    audio_file = generate_speech(
        request.text,
        request.language,
    )

    return FileResponse(
        audio_file,
        media_type="audio/mpeg",
        filename=os.path.basename(audio_file),
    )

# ==================================================
# ULTRON MISSION COMMAND DETECTOR
# ==================================================

import re
from datetime import timedelta

def parse_mission_command(message: str):
    """
    ULTRON Mission Parser v2

    Understands natural mission/reminder language instead of relying
    only on explicit phrases such as "remind me".

    Returns:
        {
            "title": str,
            "description": str,
            "due_at": str | None,
            "priority": str
        }

        OR None when the message does not appear to be a mission.
    """

    text = message.strip()

    if not text:
        return None

    lower = text.lower()

    # ==================================================
    # NORMALIZE COMMON ULTRON ADDRESSING
    # ==================================================

    # "Hey ULTRON, ..."
    # "Hi ULTRON, ..."
    # "ULTRON, ..."
    cleaned = re.sub(
        r"^\s*(hey|hi|hello)?\s*ultron\s*[,!:.-]?\s*",
        "",
        text,
        flags=re.IGNORECASE,
    )

    # If nothing remains after removing the wake/address word,
    # this isn't a mission.
    if not cleaned.strip():
        return None

    text = cleaned.strip()
    lower = text.lower()

    # ==================================================
    # MISSION INTENT
    # ==================================================

    explicit_triggers = [
        "remind me",
        "remember to",
        "don't let me forget",
        "do not let me forget",
        "add a task",
        "create a task",
        "make a task",
        "set a reminder",
        "create a reminder",
        "add a reminder",
        "set a task",
    ]

    natural_task_patterns = [
        r"\bi need to\b",
        r"\bi have to\b",
        r"\bi've got to\b",
        r"\bi got to\b",
        r"\bi should\b",
        r"\bi must\b",
        r"\bi'll have to\b",
        r"\bi will have to\b",
        r"\bmake sure i\b",
        r"\bmake sure that i\b",
        r"\bi need\b",
        r"\bi have\b",
    ]

    has_explicit_intent = any(
        trigger in lower
        for trigger in explicit_triggers
    )

    has_natural_intent = any(
        re.search(pattern, lower)
        for pattern in natural_task_patterns
    )

    # ==================================================
    # TEMPORAL INTENT
    # ==================================================

    has_relative_time = bool(
        re.search(
            r"\bin\s+\d+\s*(minute|minutes|min|mins|hour|hours|hr|hrs|day|days)\b",
            lower,
        )
    )

    has_absolute_time = bool(
        re.search(
            r"\bat\s+\d{1,2}(?::\d{2})?\s*(am|pm)?\b",
            lower,
        )
    )

    has_date_reference = bool(
        re.search(
            r"\b(today|tonight|tomorrow|"
            r"monday|tuesday|wednesday|thursday|friday|saturday|sunday|"
            r"next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday))\b",
            lower,
        )
    )

    has_temporal_intent = (
        has_relative_time
        or has_absolute_time
        or has_date_reference
    )

    # ==================================================
    # ACTION VERB SAFETY CHECK
    # ==================================================

    # Helps prevent ordinary conversational sentences from
    # accidentally becoming missions.
    action_verbs = [
        "check",
        "call",
        "email",
        "send",
        "submit",
        "open",
        "visit",
        "review",
        "finish",
        "complete",
        "buy",
        "get",
        "pay",
        "update",
        "prepare",
        "write",
        "read",
        "watch",
        "meet",
        "attend",
        "schedule",
        "work",
        "start",
        "stop",
        "fix",
        "look",
        "verify",
        "confirm",
        "follow",
        "contact",
        "message",
        "download",
        "upload",
        "create",
        "install",
        "renew",
        "track",
        "monitor",
        "check",
    ]

    has_action = any(
        re.search(
            rf"\b{re.escape(verb)}\b",
            lower,
        )
        for verb in action_verbs
    )

    # ==================================================
    # DECIDE WHETHER THIS IS ACTUALLY A MISSION
    # ==================================================

    is_mission = False

    if has_explicit_intent:
        is_mission = True

    elif has_natural_intent and has_action:
        is_mission = True

    elif has_temporal_intent and has_action:
        is_mission = True

    if not is_mission:
        return None

    # ==================================================
    # DETECT PRIORITY
    # ==================================================

    priority = "normal"

    if re.search(
        r"\b(urgent|critical|asap|extremely important|very important)\b",
        lower,
    ):
        priority = "critical"

    elif re.search(
        r"\b(high priority|important|really important)\b",
        lower,
    ):
        priority = "high"

    elif re.search(
        r"\b(low priority|not important|low importance)\b",
        lower,
    ):
        priority = "low"

    # ==================================================
    # CURRENT TIME
    # ==================================================

    now = datetime.now()

    due_at = None
    due_date = None

    # ==================================================
    # RELATIVE TIME
    #
    # "in 5 minutes"
    # "in 2 hours"
    # "in 45 minutes from now"
    # ==================================================

    relative_match = re.search(
        r"\bin\s+(\d+)\s*"
        r"(minute|minutes|min|mins|hour|hours|hr|hrs|day|days)"
        r"(?:\s+from\s+now)?\b",
        lower,
    )

    if relative_match:

        amount = int(relative_match.group(1))
        unit = relative_match.group(2)

        if unit.startswith("min"):
            due_date = now + timedelta(minutes=amount)

        elif unit.startswith("hour") or unit.startswith("hr"):
            due_date = now + timedelta(hours=amount)

        elif unit.startswith("day"):
            due_date = now + timedelta(days=amount)

        due_at = due_date.replace(
            second=0,
            microsecond=0,
        ).isoformat()

    # ==================================================
    # DATE REFERENCES
    # ==================================================

    if due_at is None:

        if re.search(r"\btomorrow\b", lower):

            due_date = now + timedelta(days=1)

        elif re.search(r"\b(today|tonight)\b", lower):

            due_date = now

        else:

            weekday_names = [
                "monday",
                "tuesday",
                "wednesday",
                "thursday",
                "friday",
                "saturday",
                "sunday",
            ]

            weekday_match = re.search(
                r"\b(?:next\s+)?"
                r"(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b",
                lower,
            )

            if weekday_match:

                target_name = weekday_match.group(1)
                target_index = weekday_names.index(target_name)

                current_index = now.weekday()

                days_ahead = (
                    target_index - current_index
                ) % 7

                # "next Monday" should mean the following occurrence,
                # not today when today happens to be Monday.
                if (
                    "next " + target_name
                    in lower
                ):
                    if days_ahead == 0:
                        days_ahead = 7

                elif days_ahead == 0:
                    days_ahead = 7

                due_date = now + timedelta(
                    days=days_ahead
                )

    # ==================================================
    # ABSOLUTE TIME
    #
    # "at 6 PM"
    # "at 18:00"
    # "at 9"
    # "tonight at 9 PM"
    # ==================================================

    time_match = re.search(
        r"\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b",
        lower,
    )

    if time_match:

        hour = int(time_match.group(1))

        minute = (
            int(time_match.group(2))
            if time_match.group(2)
            else 0
        )

        meridiem = time_match.group(3)

        if meridiem == "pm" and hour < 12:
            hour += 12

        elif meridiem == "am" and hour == 12:
            hour = 0

        elif meridiem is None and hour < 8:
            # ULTRON convention:
            # "at 6" → 6 PM
            hour += 12

        if due_date is None:
            due_date = now

        due_date = due_date.replace(
            hour=hour,
            minute=minute,
            second=0,
            microsecond=0,
        )

        # If no explicit date was supplied and the requested
        # time has already passed today, assume tomorrow.
        has_explicit_date = bool(
            re.search(
                r"\b(today|tonight|tomorrow|"
                r"monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b",
                lower,
            )
        )

        if (
            not has_explicit_date
            and due_date <= now
        ):
            due_date += timedelta(days=1)

        due_at = due_date.isoformat()

    elif due_date is not None and due_at is None:

        # Date supplied without time.
        # Preserve existing ULTRON behavior of 9 AM.
        due_at = due_date.replace(
            hour=9,
            minute=0,
            second=0,
            microsecond=0,
        ).isoformat()

    # ==================================================
    # BUILD CLEAN TITLE
    # ==================================================

    title = text

    # --------------------------------------------------
    # REMOVE COMMAND / NATURAL LANGUAGE PREFIXES
    # --------------------------------------------------

    title_prefixes = [

        r"^remind me to\s+",
        r"^remind me\s+",

        r"^remember to\s+",

        r"^don't let me forget to\s+",
        r"^do not let me forget to\s+",

        r"^add a task to\s+",
        r"^add a task\s+",

        r"^create a task to\s+",
        r"^create a task\s+",

        r"^make a task to\s+",
        r"^make a task\s+",

        r"^set a task to\s+",
        r"^set a task\s+",

        r"^set a reminder to\s+",
        r"^set a reminder\s+",

        r"^create a reminder to\s+",
        r"^create a reminder\s+",

        r"^add a reminder to\s+",
        r"^add a reminder\s+",

        # Natural language
        r"^i need to\s+",
        r"^i have to\s+",
        r"^i've got to\s+",
        r"^i got to\s+",
        r"^i should\s+",
        r"^i must\s+",
        r"^i'll have to\s+",
        r"^i will have to\s+",

        r"^make sure i\s+",
        r"^make sure that i\s+",
    ]

    for prefix in title_prefixes:

        new_title = re.sub(
            prefix,
            "",
            title,
            flags=re.IGNORECASE,
        )

        if new_title != title:
            title = new_title
            break

    # --------------------------------------------------
    # REMOVE CONNECTIVE / EXPLANATORY CLAUSES
    # --------------------------------------------------

    title = re.sub(
        r"\s+(?:which|that)\s+(?:is|was|will be)\s+"
        r"(?:very\s+|really\s+)?important\b.*$",
        "",
        title,
        flags=re.IGNORECASE,
    )

    title = re.sub(
        r"\s+(?:because|since)\s+.*$",
        "",
        title,
        flags=re.IGNORECASE,
    )

    # "it's important"
    title = re.sub(
        r"\s+(?:it'?s|it is|this is)\s+"
        r"(?:very\s+|really\s+)?important\b.*$",
        "",
        title,
        flags=re.IGNORECASE,
    )

    # --------------------------------------------------
    # REMOVE DATE WORDS
    # --------------------------------------------------

    title = re.sub(
        r"\b(today|tomorrow|tonight)\b",
        "",
        title,
        flags=re.IGNORECASE,
    )

    # --------------------------------------------------
    # REMOVE WEEKDAYS
    # --------------------------------------------------

    title = re.sub(
        r"\b(?:next\s+)?"
        r"(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b",
        "",
        title,
        flags=re.IGNORECASE,
    )

    # --------------------------------------------------
    # REMOVE ABSOLUTE TIME
    # --------------------------------------------------

    title = re.sub(
        r"\bat\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?\b",
        "",
        title,
        flags=re.IGNORECASE,
    )

    # --------------------------------------------------
    # REMOVE RELATIVE TIME
    # --------------------------------------------------

    title = re.sub(
        r"\bin\s+\d+\s*"
        r"(?:minute|minutes|min|mins|hour|hours|hr|hrs|day|days)"
        r"(?:\s+from\s+now)?\b",
        "",
        title,
        flags=re.IGNORECASE,
    )

    # --------------------------------------------------
    # REMOVE PRIORITY WORDS
    # --------------------------------------------------

    title = re.sub(
        r"\b("
        r"urgent|"
        r"critical|"
        r"asap|"
        r"extremely important|"
        r"very important|"
        r"really important|"
        r"high priority|"
        r"important|"
        r"low priority|"
        r"low importance|"
        r"not important"
        r")\b",
        "",
        title,
        flags=re.IGNORECASE,
    )

    # --------------------------------------------------
    # REMOVE REMAINING REMINDER FILLER
    # --------------------------------------------------

    title = re.sub(
        r"\bfrom now on\b",
        "",
        title,
        flags=re.IGNORECASE,
    )

    title = re.sub(
        r"\bfor me\b",
        "",
        title,
        flags=re.IGNORECASE,
    )

    # --------------------------------------------------
    # CLEAN PUNCTUATION / SPACING
    # --------------------------------------------------

    title = re.sub(
        r"\s+",
        " ",
        title,
    ).strip(" .,-:;")

    # --------------------------------------------------
    # FINAL SANITY CHECK
    # --------------------------------------------------

    if not title:
        return None

    return {
        "title": title,
        "description": message,
        "due_at": due_at,
        "priority": priority,
    }

# ==================================================
# ULTRON MISSION RESPONSE
# ==================================================

def mission_confirmation(mission):
    title = mission["title"]

    priority = mission["priority"]

    due_at = mission["due_at"]

    if due_at:
        try:
            due_date = datetime.fromisoformat(due_at)

            formatted_time = due_date.strftime(
                "%d %b at %H:%M"
            )

        except Exception:
            formatted_time = due_at

    else:
        formatted_time = "no specific time"

    if priority == "critical":
        return (
            f"Mission armed. {title} — "
            f"{formatted_time}. Critical priority."
        )

    if priority == "high":
        return (
            f"Mission armed. {title} — "
            f"{formatted_time}. High priority."
        )

    return (
        f"Mission armed. {title} — "
        f"{formatted_time}."
    )

# ==================================================
# MISSION API
# ==================================================

@app.post("/missions")
def create_mission_endpoint(request: MissionCreate):

    if not request.title.strip():
        return {
            "status": "error",
            "message": "Mission title cannot be empty.",
        }

    priority = request.priority.lower()

    if priority not in ["low", "normal", "high", "critical"]:
        priority = "normal"

    mission = create_mission(
        title=request.title.strip(),
        description=request.description,
        due_at=request.due_at,
        priority=priority,
    )

    return {
        "status": "created",
        "mission": mission,
    }


@app.get("/missions")
def get_missions_endpoint(
    status: Optional[str] = None,
):
    return {
        "missions": get_missions(status),
    }


@app.get("/missions/due")
def get_due_missions_endpoint():
    """Atomically claim due missions for the frontend notification cycle."""
    missions = claim_due_missions()

    return {
        "missions": missions,
    }


@app.get("/missions/{mission_id}")
def get_single_mission_endpoint(
    mission_id: int,
):
    mission = get_mission(mission_id)

    if mission is None:
        return {
            "status": "error",
            "message": "Mission not found.",
        }

    return {
        "mission": mission,
    }


@app.patch("/missions/{mission_id}")
def update_mission_endpoint(
    mission_id: int,
    request: MissionUpdate,
):
    mission = get_mission(mission_id)

    if mission is None:
        return {
            "status": "error",
            "message": "Mission not found.",
        }

    if request.due_at is not None:
        try:
            datetime.fromisoformat(request.due_at)
        except ValueError:
            return {"status": "error", "message": "Invalid due_at format."}

    updated = update_mission(
        mission_id=mission_id,
        status=request.status,
        priority=request.priority,
        due_at=request.due_at,
    )

    return {
        "status": "updated",
        "mission": updated,
    }


@app.delete("/missions/{mission_id}")
def delete_mission_endpoint(
    mission_id: int,
):
    deleted = delete_mission(mission_id)

    if not deleted:
        return {
            "status": "error",
            "message": "Mission not found.",
        }

    return {
        "status": "deleted",
        "mission_id": mission_id,
    }

