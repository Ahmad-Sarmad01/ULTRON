from fastapi import APIRouter

from mood import get_mood


router = APIRouter()


@router.get("/mood")
def mood():
    return {
        "mood": get_mood(),
    }