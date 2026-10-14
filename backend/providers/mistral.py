import os

from dotenv import load_dotenv
from mistralai.client import Mistral


# --------------------------------------------------
# ENVIRONMENT
# --------------------------------------------------

load_dotenv()


# --------------------------------------------------
# MISTRAL API KEY
# --------------------------------------------------

api_key = os.getenv("MISTRAL_API_KEY")

if not api_key:
    raise RuntimeError(
        "MISTRAL_API_KEY is missing from the .env file."
    )


# --------------------------------------------------
# MISTRAL CLIENT
# --------------------------------------------------

client = Mistral(
    api_key=api_key
)


# --------------------------------------------------
# GENERATE RESPONSE
# --------------------------------------------------

def generate_with_mistral(prompt: str) -> str:

    response = client.chat.complete(
        model="mistral-small-latest",
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
            "Mistral returned an empty response."
        )

    return reply