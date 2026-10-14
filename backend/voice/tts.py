# ============================================================
# ULTRON — TEXT TO SPEECH ENGINE
# ============================================================

import asyncio
import os
import uuid
import edge_tts


# ============================================================
# CONFIGURATION
# ============================================================

VOICE_ENGLISH = "en-US-GuyNeural"
VOICE_URDU = "ur-PK-AsadNeural"

# ULTRON personality tuning
ENGLISH_RATE = "-8%"
URDU_RATE = "-12%"

ENGLISH_PITCH = "-12Hz"
URDU_PITCH = "-28Hz"

VOLUME = "+0%"


# ============================================================
# AUDIO DIRECTORY
# ============================================================

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

AUDIO_DIR = os.path.join(
    BASE_DIR,
    "generated_audio"
)

os.makedirs(
    AUDIO_DIR,
    exist_ok=True
)


# ============================================================
# LANGUAGE DETECTION
# ============================================================

def detect_language(text: str) -> str:

    if not text:
        return "en"

    # Urdu / Arabic-derived Unicode block
    urdu_characters = 0

    for char in text:

        code = ord(char)

        if (
            0x0600 <= code <= 0x06FF
            or
            0x0750 <= code <= 0x077F
            or
            0x08A0 <= code <= 0x08FF
        ):
            urdu_characters += 1

    # If enough Urdu-script characters exist,
    # treat the response as Urdu.
    if urdu_characters >= 2:
        return "ur"

    return "en"


# ============================================================
# VOICE SELECTION
# ============================================================

def get_voice_settings(language: str):

    if language == "ur":

        return {
            "voice": VOICE_URDU,
            "rate": URDU_RATE,
            "pitch": URDU_PITCH,
            "volume": VOLUME,
        }

    return {
        "voice": VOICE_ENGLISH,
        "rate": ENGLISH_RATE,
        "pitch": ENGLISH_PITCH,
        "volume": VOLUME,
    }


# ============================================================
# GENERATE SPEECH
# ============================================================

async def _generate_speech(
    text: str,
    output_file: str,
    language: str,
):

    settings = get_voice_settings(language)

    communicate = edge_tts.Communicate(
        text=text,
        voice=settings["voice"],
        rate=settings["rate"],
        volume=settings["volume"],
        pitch=settings["pitch"],
    )

    await communicate.save(output_file)


# ============================================================
# PUBLIC TTS FUNCTION
# ============================================================

def generate_speech(
    text: str,
    language: str | None = None,
) -> str:

    if not text or not text.strip():
        raise ValueError(
            "ULTRON TTS: Text cannot be empty."
        )

    text = text.strip()

    # Automatically determine language
    if language is None:
        language = detect_language(text)

    language = language.lower()

    if language not in ("en", "ur"):
        language = "en"

    # Unique filename
    filename = (
        f"ultron_{language}_"
        f"{uuid.uuid4().hex}.mp3"
    )

    output_file = os.path.join(
        AUDIO_DIR,
        filename
    )

    # Generate audio
    asyncio.run(
        _generate_speech(
            text,
            output_file,
            language
        )
    )

    print(
        f"ULTRON Voice: generated {language} speech:"
    )

    print(
        output_file
    )

    return output_file

# ============================================================
# ULTRON VOICE PROFILE TEST
# ============================================================

async def _generate_profile(
    text: str,
    output_file: str,
    voice: str,
    rate: str,
    pitch: str,
):
    """
    Generate a voice sample using a specific ULTRON profile.
    """

    communicate = edge_tts.Communicate(
        text=text,
        voice=voice,
        rate=rate,
        pitch=pitch,
        volume=VOLUME,
    )

    await communicate.save(output_file)


def generate_profile_sample(
    text: str,
    profile_name: str,
    voice: str,
    rate: str,
    pitch: str,
):
    """
    Generate a named test sample so we can compare
    different ULTRON voice personalities.
    """

    filename = (
        f"ultron_profile_{profile_name}.mp3"
    )

    output_file = os.path.join(
        AUDIO_DIR,
        filename,
    )

    asyncio.run(
        _generate_profile(
            text,
            output_file,
            voice,
            rate,
            pitch,
        )
    )

    print(
        f"Generated {profile_name}:"
    )

    print(
        output_file
    )

    return output_file


# ============================================================
# TEST
# ============================================================

if __name__ == "__main__":

    print(
        "=================================================="
    )

    print(
        "ULTRON VOICE PROFILE TEST"
    )

    print(
        "=================================================="
    )


    # --------------------------------------------------------
    # Urdu test sentence
    # --------------------------------------------------------

    urdu_text = (
        "السلام علیکم۔ "
        "میں الٹرون ہوں۔ "
        "آپ کے حکم کا انتظار کر رہا ہوں۔"
    )


    # --------------------------------------------------------
    # PROFILE 1 — BASE
    # --------------------------------------------------------
    #
    # Natural Asad voice with only a small amount
    # of ULTRON tuning.
    #

    print(
        "\n[1] Generating BASE profile..."
    )

    generate_profile_sample(
        text=urdu_text,
        profile_name="urdu_base",
        voice=VOICE_URDU,
        rate="-8%",
        pitch="-8Hz",
    )


    # --------------------------------------------------------
    # PROFILE 2 — DEEP
    # --------------------------------------------------------
    #
    # More noticeable depth while keeping the
    # pronunciation relatively natural.
    #

    print(
        "\n[2] Generating DEEP profile..."
    )

    generate_profile_sample(
        text=urdu_text,
        profile_name="urdu_deep",
        voice=VOICE_URDU,
        rate="-10%",
        pitch="-18Hz",
    )


    # --------------------------------------------------------
    # PROFILE 3 — ULTRON
    # --------------------------------------------------------
    #
    # Stronger deep / serious character.
    #

    print(
        "\n[3] Generating ULTRON profile..."
    )

    generate_profile_sample(
        text=urdu_text,
        profile_name="urdu_ultron",
        voice=VOICE_URDU,
        rate="-12%",
        pitch="-28Hz",
    )


    print(
        "\n=================================================="
    )

    print(
        "VOICE PROFILE TEST COMPLETE"
    )

    print(
        "=================================================="
    )

    print(
        "\nOpen the generated_audio folder and listen"
    )

    print(
        "to all three files:"
    )

    print(
        "  ultron_profile_urdu_base.mp3"
    )

    print(
        "  ultron_profile_urdu_deep.mp3"
    )

    print(
        "  ultron_profile_urdu_ultron.mp3"
    )