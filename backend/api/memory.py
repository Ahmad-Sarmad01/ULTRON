from fastapi import APIRouter
from pydantic import BaseModel

from memory import get_memories, save_memory
from memory_recall import recall_memory_query


router = APIRouter()


class MemoryRecallRequest(BaseModel):
    query: str


@router.post("/memory")
def create_memory(content: str):
    save_memory(content)
    return {
        "status": "saved",
        "memory": content,
    }


@router.get("/memories")
def memories():
    return {
        "memories": get_memories(),
    }


@router.post("/memory/recall")
def recall_memory(request: MemoryRecallRequest):
    result = recall_memory_query(request.query)
    if not result:
        return {
            "query": request.query,
            "status": "not_a_recall_request",
            "matches": [],
        }

    return {
        "query": result["query"],
        "subject": result["subject"],
        "status": result["status"],
        "matches": result["matches"],
        "reply": result["reply"],
    }