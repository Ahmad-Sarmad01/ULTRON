import re
from datetime import datetime

from providers.router import generate_response

from memory import get_memories


RECALL_PATTERNS = (
    re.compile(r"^what\s+do\s+you\s+remember(?:\s+about\s+(?P<subject>.+))?$", re.I),
    re.compile(r"^show\s+me\s+what\s+you\s+remember(?:\s+about\s+(?P<subject>.+))?$", re.I),
    re.compile(r"^do\s+you\s+remember\s+me\s+telling\s+you\s+about\s+(?P<subject>.+)$", re.I),
    re.compile(r"^do\s+you\s+remember(?:\s+what\s+i\s+told\s+you\s+about\s+)?(?P<subject>.+)$", re.I),
    re.compile(r"^remember\s+anything\s+about\s+(?P<subject>.+)$", re.I),
    re.compile(r"^what\s+did\s+i\s+tell\s+you\s+about\s+(?P<subject>.+)$", re.I),
    re.compile(r"^what\s+do\s+you\s+know\s+about\s+(?P<subject>.+)$", re.I),
    re.compile(r"^remind\s+me\s+what\s+you\s+know\s+about\s+(?P<subject>.+)$", re.I),
    re.compile(r"^tell\s+me\s+what\s+you\s+remember(?:\s+about\s+(?P<subject>.+))?$", re.I),
    re.compile(r"^recall(?:\s+my)?\s+(?P<subject>.+)$", re.I),
)

MISSION_EXCLUSIONS = (
    "remember to",
    "remind me to",
    "reminder",
    "mission",
    "task",
)

STOP_WORDS = {
    "a", "about", "and", "any", "anything", "are", "did", "do", "for",
    "i", "me", "my", "of", "on", "remember", "tell", "the", "to", "what",
    "you", "your",
}


def detect_memory_recall(message):
    normalized = re.sub(r"\s+", " ", message.strip().rstrip(".!?"))
    lowered = normalized.lower()

    if not normalized or any(exclusion in lowered for exclusion in MISSION_EXCLUSIONS):
        return None

    for pattern in RECALL_PATTERNS:
        match = pattern.fullmatch(normalized)
        if match:
            subject = (match.groupdict().get("subject") or "").strip(" ,.!?") or None
            if subject and subject.lower() in {"me", "anything"}:
                subject = None
            return {
                "query": message.strip(),
                "subject": subject,
            }

    return None


def _tokens(value):
    return {
        token
        for token in re.findall(r"[a-z0-9]+(?:'[a-z0-9]+)?", value.lower())
        if token not in STOP_WORDS and len(token) > 1
    }


def _recency_score(created_at):
    try:
        age_days = max((datetime.now() - datetime.fromisoformat(created_at)).days, 0)
    except (TypeError, ValueError):
        return 0
    return max(0, 1 - min(age_days / 365, 1))


def recall_memories(subject=None, limit=5):
    memories = get_memories()
    subject_tokens = _tokens(subject or "")
    scored = []

    for position, memory in enumerate(memories):
        content_tokens = _tokens(memory["content"])
        category_tokens = _tokens(memory.get("category", ""))
        if subject_tokens:
            overlap = subject_tokens & (content_tokens | category_tokens)
            if not overlap:
                continue
            score = len(overlap) / len(subject_tokens)
            if subject and subject.lower() in memory["content"].lower():
                score += 0.35
        else:
            score = 0.35

        score += _recency_score(memory.get("created_at")) * 0.15
        score += position / max(len(memories), 1) * 0.05
        scored.append((min(score, 1), memory))

    scored.sort(key=lambda item: item[0], reverse=True)
    return [
        {
            "content": memory["content"],
            "category": memory.get("category", "general"),
            "relevance": round(score, 2),
        }
        for score, memory in scored[:limit]
    ]


def build_memory_recall_response(matches, subject=None):
    if not matches:
        return "I don't have anything reliable stored about that yet."

    memory_lines = "\n".join(f"- {match['content']}" for match in matches)
    subject_label = f" about {subject}" if subject else ""
    prompt = f"""
You are ULTRON. Answer the user's memory-recall request{subject_label} naturally and concisely.
Use only the stored memories below. Do not infer, embellish, or invent anything.
If a memory is a complete user statement, preserve its meaning without claiming more than it says.
Start naturally with a phrase such as 'I remember' when appropriate.

STORED MEMORIES:
{memory_lines}
"""

    try:
        return generate_response(prompt).strip()
    except Exception:
        if len(matches) == 1:
            return f"I remember this: {matches[0]['content']}"
        return "I remember: " + "; ".join(match["content"] for match in matches) + "."


def recall_memory_query(query):
    intent = detect_memory_recall(query)
    if not intent:
        return None

    matches = recall_memories(intent["subject"])
    return {
        "query": intent["query"],
        "subject": intent["subject"],
        "matches": matches,
        "status": "found" if matches else "empty",
        "reply": build_memory_recall_response(matches, intent["subject"]),
    }
