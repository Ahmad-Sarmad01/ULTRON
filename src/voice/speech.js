// ==================================================
// ULTRON — BACKEND SPEECH ENGINE
// ==================================================

let currentAudio = null;


// ==================================================
// SPEECH SUPPORT
// ==================================================

export function isSpeechSupported() {
  return "Audio" in window;
}


// ==================================================
// SPEAK
// ==================================================

export async function speak(
  text,
  onStart,
  onEnd,
  language = null
) {
  if (!isSpeechSupported()) {
    console.warn(
      "ULTRON Voice: Audio playback is not supported."
    );

    return null;
  }

  if (!text || !text.trim()) {
    return null;
  }


  // ------------------------------------------------
  // Stop previous ULTRON voice
  // ------------------------------------------------

  stopSpeaking();


  // ------------------------------------------------
  // Request generated ULTRON voice
  // ------------------------------------------------

  try {

    const response = await fetch(
      "http://127.0.0.1:8000/voice",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          text: text.trim(),
          language: language,
        }),
      }
    );


    // ------------------------------------------------
    // Check backend response
    // ------------------------------------------------

    if (!response.ok) {

      throw new Error(
        `Voice server returned ${response.status}`
      );

    }


    // ------------------------------------------------
    // Convert response to audio
    // ------------------------------------------------

    const audioBlob =
      await response.blob();


    const audioUrl =
      URL.createObjectURL(audioBlob);


    // ------------------------------------------------
    // Create audio player
    // ------------------------------------------------

    const audio =
      new Audio(audioUrl);


    currentAudio = audio;


    // ------------------------------------------------
    // AUDIO START
    // ------------------------------------------------

    audio.onplay = () => {

      console.log(
        "ULTRON Voice: Speaking..."
      );

      if (onStart) {
        onStart();
      }

    };


    // ------------------------------------------------
    // AUDIO END
    // ------------------------------------------------

    audio.onended = () => {

      console.log(
        "ULTRON Voice: Finished speaking."
      );

      URL.revokeObjectURL(audioUrl);

      currentAudio = null;

      if (onEnd) {
        onEnd();
      }

    };


    // ------------------------------------------------
    // AUDIO ERROR
    // ------------------------------------------------

    audio.onerror = (event) => {

      console.error(
        "ULTRON Voice playback error:",
        event
      );

      URL.revokeObjectURL(audioUrl);

      currentAudio = null;

      if (onEnd) {
        onEnd();
      }

    };


    // ------------------------------------------------
    // PLAY
    // ------------------------------------------------

    await audio.play();


    return audio;

  } catch (error) {

    console.error(
      "ULTRON Voice error:",
      error
    );

    currentAudio = null;

    if (onEnd) {
      onEnd();
    }

    return null;
  }
}


// ==================================================
// STOP SPEAKING
// ==================================================

export function stopSpeaking() {

  if (!currentAudio) {
    return;
  }


  try {

    currentAudio.pause();

    currentAudio.currentTime = 0;

  } catch (error) {

    console.warn(
      "ULTRON Voice: Could not stop audio.",
      error
    );

  }


  currentAudio = null;
}