import os

from dotenv import load_dotenv
from groq import Groq


# --------------------------------------------------
# ENVIRONMENT
# --------------------------------------------------

load_dotenv()


# --------------------------------------------------
# GROQ CLIENT
# --------------------------------------------------

api_key = os.getenv("GROQ_API_KEY")

if not api_key:
    raise RuntimeError(
        "GROQ_API_KEY is missing from the .env file."
    )

client = Groq(
    api_key=api_key
)


# --------------------------------------------------
# GENERATE RESPONSE
# --------------------------------------------------

def generate_with_groq(prompt: str) -> str:

    response = client.chat.completions.create(
        model="openai/gpt-oss-120b",
        messages=[
            {
                "role": "user",
                "content": prompt
            }
        ]
    )

    reply = response.choices[0].message.content

    if not reply:
        raise RuntimeError(
            "Groq returned an empty response."
        )

    return reply