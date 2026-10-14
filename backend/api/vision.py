import base64
import binascii
import re

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from providers.gemini import generate_with_gemini_vision


router = APIRouter(prefix="/vision", tags=["vision"])

MAX_IMAGE_BYTES = 8 * 1024 * 1024
SUPPORTED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}
DATA_URL_PATTERN = re.compile(r"^data:(?P<mime>image/[a-z0-9.+-]+);base64,(?P<data>.+)$", re.I | re.S)


class VisionRequest(BaseModel):
    image: str
    prompt: str | None = None


def _decode_image(data_url: str):
    match = DATA_URL_PATTERN.fullmatch(data_url.strip())
    if not match:
        raise HTTPException(status_code=400, detail="invalid_image")

    mime_type = match.group("mime").lower()
    if mime_type not in SUPPORTED_MIME_TYPES:
        raise HTTPException(status_code=415, detail="unsupported_image_type")

    try:
        image_data = base64.b64decode(match.group("data"), validate=True)
    except (binascii.Error, ValueError):
        raise HTTPException(status_code=400, detail="invalid_image") from None

    if not image_data or len(image_data) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="image_too_large")

    return image_data, mime_type


@router.post("/analyze")
def analyze_vision(request: VisionRequest):
    image_data, mime_type = _decode_image(request.image)
    prompt = (request.prompt or "Analyze this image and describe the most relevant visible information.").strip()
    prompt = (
        "Inspect only the supplied image. Answer the user's request concisely. "
        "Do not invent objects, text, people, or context. Clearly state uncertainty "
        "when something cannot be determined from the frame. User request: "
        f"{prompt}"
    )

    try:
        analysis = generate_with_gemini_vision(prompt, image_data, mime_type)
    except Exception as error:
        safe_error = str(error).lower()
        if "api" in safe_error or "key" in safe_error or "gemini" in safe_error:
            raise HTTPException(status_code=503, detail="vision_unavailable") from None
        raise HTTPException(status_code=502, detail="vision_analysis_failed") from None

    return {
        "success": True,
        "analysis": analysis,
        "provider": "gemini",
        "status": "complete",
    }