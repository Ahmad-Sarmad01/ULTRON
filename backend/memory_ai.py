from google import genai
import json


def analyze_memory(client, user_message):

    prompt = f"""
You are ULTRON's memory analyzer.

Your job is to determine whether a user's message contains
information worth remembering about the user.

Remember things such as:

- Name
- Personal preferences
- Favorite things
- Hobbies
- Important projects
- Goals
- Skills
- Relationships
- Important personal facts
- Long-term plans

Do NOT remember:

- Casual conversation
- Temporary questions
- Greetings
- Jokes
- Random facts
- Things that will probably become irrelevant quickly

Return ONLY valid JSON.

If the message contains something worth remembering:

{{
    "remember": true,
    "memory": "A concise statement describing what should be remembered.",
    "category": "profile"
}}

Otherwise:

{{
    "remember": false,
    "memory": "",
    "category": ""
}}

Possible categories:

profile
preference
project
goal
skill
relationship
hobby
general

User message:

{user_message}
"""

    response = client.models.generate_content(
        model="gemini-3.6-flash",
        contents=prompt
    )

    try:
        return json.loads(response.text)
    except json.JSONDecodeError:
        return {
            "remember": False,
            "memory": "",
            "category": ""
        }