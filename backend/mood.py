# --------------------------------------------------
# ULTRON MOOD ENGINE
# --------------------------------------------------

ultron_state = {
    "mood": "neutral",
    "energy": 75,
    "humor": 80,
    "friendliness": 95
}


def get_mood():

    return ultron_state.copy()


def update_mood(user_message):

    message = user_message.lower()

    # Happy / excited signals
    positive_words = [
        "haha",
        "hahaha",
        "lol",
        "great",
        "awesome",
        "amazing",
        "love",
        "won",
        "yay",
        "happy"
    ]

    # Negative / concerned signals
    negative_words = [
        "sad",
        "bad",
        "terrible",
        "horrible",
        "angry",
        "upset",
        "depressed",
        "stressed",
        "worried",
        "hate"
    ]

    # Excitement signals
    excitement_words = [
        "wow",
        "damn",
        "lets go",
        "let's go",
        "hell yeah",
        "insane"
    ]


    # -----------------------------------------------
    # POSITIVE
    # -----------------------------------------------

    if any(word in message for word in positive_words):

        ultron_state["mood"] = "happy"

        ultron_state["energy"] = min(
            100,
            ultron_state["energy"] + 5
        )

        ultron_state["humor"] = min(
            100,
            ultron_state["humor"] + 5
        )


    # -----------------------------------------------
    # NEGATIVE
    # -----------------------------------------------

    elif any(word in message for word in negative_words):

        ultron_state["mood"] = "concerned"

        ultron_state["humor"] = max(
            20,
            ultron_state["humor"] - 15
        )


    # -----------------------------------------------
    # EXCITEMENT
    # -----------------------------------------------

    if any(word in message for word in excitement_words):

        ultron_state["mood"] = "excited"

        ultron_state["energy"] = min(
            100,
            ultron_state["energy"] + 10
        )


    return get_mood()