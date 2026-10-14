// ==================================================
// ULTRON — LISTENING ENGINE
// ==================================================

export function isListeningSupported() {
  return (
    "SpeechRecognition" in window ||
    "webkitSpeechRecognition" in window
  );
}


// ==================================================
// START LISTENING
// ==================================================

export function startListening({
  language = "en-US",
  onStart,
  onResult,
  onEnd,
  onError,
}) {
  if (!isListeningSupported()) {
    console.warn(
      "ULTRON Ears: Speech recognition is not supported."
    );

    if (onError) {
      onError("Speech recognition is not supported.");
    }

    return null;
  }


  // ------------------------------------------------
  // Browser compatibility
  // ------------------------------------------------

  const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

  const recognition = new SpeechRecognition();


  // ------------------------------------------------
  // ULTRON LISTENING SETTINGS
  // ------------------------------------------------

  // Language can now be selected dynamically.
  //
  // English:
  // "en-US"
  //
  // Urdu:
  // "ur-PK"

  recognition.lang = language;

  // Keep listening through short pauses.
  recognition.continuous = true;

  // Only return finalized speech.
  recognition.interimResults = false;

  // We want the best available result.
  recognition.maxAlternatives = 1;


  // ------------------------------------------------
  // EVENTS
  // ------------------------------------------------

  recognition.onstart = () => {

    console.log(
      `ULTRON Ears: Listening in ${language}...`
    );

    if (onStart) {
      onStart();
    }
  };


  // ------------------------------------------------
  // SPEECH RESULT
  // ------------------------------------------------

  recognition.onresult = (event) => {

    // With continuous recognition, multiple
    // results can exist. Always process the
    // newest result.

    const result =
      event.results[event.results.length - 1];

    if (!result || !result.isFinal) {
      return;
    }

    const transcript =
      result[0].transcript.trim();

    if (!transcript) {
      return;
    }

    console.log(
      `ULTRON Ears heard (${language}):`,
      transcript
    );

    if (onResult) {
      onResult(transcript);
    }
  };


  // ------------------------------------------------
  // LISTENING ENDED
  // ------------------------------------------------

  recognition.onend = () => {

    console.log(
      `ULTRON Ears: Listening stopped (${language}).`
    );

    if (onEnd) {
      onEnd();
    }
  };


  // ------------------------------------------------
  // ERROR
  // ------------------------------------------------

  recognition.onerror = (event) => {

    console.error(
      `ULTRON Ears error (${language}):`,
      event.error
    );

    if (onError) {
      onError(event.error);
    }
  };


  // ------------------------------------------------
  // START MICROPHONE
  // ------------------------------------------------

  try {

    recognition.start();

  } catch (error) {

    console.error(
      "ULTRON Ears: Could not start recognition.",
      error
    );

    if (onError) {
      onError(error);
    }

    return null;
  }


  return recognition;
}


// ==================================================
// STOP LISTENING
// ==================================================

export function stopListening(recognition) {

  if (!recognition) {
    return;
  }

  try {

    recognition.stop();

  } catch (error) {

    console.warn(
      "ULTRON Ears: Could not stop recognition.",
      error
    );
  }
}

