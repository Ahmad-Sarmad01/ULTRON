from providers.gemini import generate_with_gemini
from providers.groq import generate_with_groq
from providers.openrouter import generate_with_openrouter
from providers.mistral import generate_with_mistral


def generate_response(prompt: str) -> str:

    # ----------------------------------------------
    # Try Gemini
    # ----------------------------------------------

    try:

        print("ULTRON AI Router: Trying Gemini...")

        response = generate_with_gemini(prompt)

        print("ULTRON AI Router: Gemini succeeded.")

        return response

    except Exception as gemini_error:

        print("ULTRON AI Router: Gemini failed.")
        print(f"Gemini error: {gemini_error}")


    # ----------------------------------------------
    # Try Groq
    # ----------------------------------------------

    try:

        print("ULTRON AI Router: Trying Groq...")

        response = generate_with_groq(prompt)

        print("ULTRON AI Router: Groq succeeded.")

        return response

    except Exception as groq_error:

        print("ULTRON AI Router: Groq failed.")
        print(f"Groq error: {groq_error}")


    # ----------------------------------------------
    # Try OpenRouter
    # ----------------------------------------------

    try:

        print("ULTRON AI Router: Trying OpenRouter...")

        response = generate_with_openrouter(prompt)

        print("ULTRON AI Router: OpenRouter succeeded.")

        return response

    except Exception as openrouter_error:

        print("ULTRON AI Router: OpenRouter failed.")
        print(f"OpenRouter error: {openrouter_error}")


    # ----------------------------------------------
    # Try Mistral
    # ----------------------------------------------

    try:

        print("ULTRON AI Router: Trying Mistral...")

        response = generate_with_mistral(prompt)

        print("ULTRON AI Router: Mistral succeeded.")

        return response

    except Exception as mistral_error:

        print("ULTRON AI Router: Mistral failed.")
        print(f"Mistral error: {mistral_error}")


    # ----------------------------------------------
    # Nothing worked
    # ----------------------------------------------

    return (
        "Uh... Houston, we have a problem. "
        "All of my AI providers are currently unavailable."
    )