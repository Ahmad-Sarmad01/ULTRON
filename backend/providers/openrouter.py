import os

from dotenv import load_dotenv
from openai import OpenAI


# --------------------------------------------------
# ENVIRONMENT
# --------------------------------------------------

load_dotenv()


# --------------------------------------------------
# OPENROUTER API KEY
# --------------------------------------------------

api_key = os.getenv("OPENROUTER_API_KEY")

if not api_key:
    raise RuntimeError(
        "OPENROUTER_API_KEY is missing from the .env file."
    )


# --------------------------------------------------
# OPENROUTER CLIENT
# --------------------------------------------------

client = OpenAI(
    api_key=api_key,
    base_url="https://openrouter.ai/api/v1"
)


# --------------------------------------------------
# GENERATE RESPONSE
# --------------------------------------------------

def generate_with_openrouter(prompt: str) -> str:

    response = client.chat.completions.create(
        model="openrouter/free",
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
            "OpenRouter returned an empty response."
        )

    return reply