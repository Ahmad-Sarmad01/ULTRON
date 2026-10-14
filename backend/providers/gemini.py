import os

from dotenv import load_dotenv
from google import genai
from google.genai import types


# --------------------------------------------------
# ENVIRONMENT
# --------------------------------------------------

load_dotenv()


# --------------------------------------------------
# GEMINI CLIENT
# --------------------------------------------------

api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    raise RuntimeError(
        "GEMINI_API_KEY is missing from the .env file."
    )

client = genai.Client(
    api_key=api_key
)


# --------------------------------------------------
# GENERATE RESPONSE
# --------------------------------------------------

def generate_with_gemini(prompt: str) -> str:

    response = client.models.generate_content(
        model="gemini-3.6-flash",
        contents=prompt
    )

    if not response.text:
        raise RuntimeError(
            "Gemini returned an empty response."
        )

    return response.text


def generate_with_gemini_vision(prompt: str, image_data: bytes, mime_type: str) -> str:
    response = client.models.generate_content(
        model="gemini-3.6-flash",
        contents=[
            types.Part.from_bytes(data=image_data, mime_type=mime_type),
            prompt,
        ],
    )

    if not response.text:
        raise RuntimeError("Gemini returned an empty vision response.")

    return response.text