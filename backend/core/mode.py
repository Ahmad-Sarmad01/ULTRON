from typing import Optional


MODE_CONTEXT = {
    "normal": {
        "label": "NORMAL",
        "instruction": "Remain balanced, concise, confident, and naturally witty.",
    },
    "focus": {
        "label": "FOCUS",
        "instruction": "Be especially direct and efficient; minimize humor and conversational padding.",
    },
    "night": {
        "label": "NIGHT",
        "instruction": "Use a quieter, calmer, restrained tone while remaining useful and clear.",
    },
    "diagnostic": {
        "label": "DIAGNOSTIC",
        "instruction": "Be analytical, precise, and technical; prioritize observations over banter.",
    },
    "combat": {
        "label": "COMBAT",
        "instruction": "Be assertive, energetic, and slightly intimidating while staying controlled and concise.",
    },
}


def get_mode_context(mode: Optional[str]):
    return MODE_CONTEXT.get(mode or "normal", MODE_CONTEXT["normal"])