import { useCallback, useState } from "react";
import UltronCore3D from "../core/UltronCore3D";
import { INTERFACE_MODES, setInterfaceMode } from "../../state/interfaceMode";
import "./UltronModeScreen.css";

function UltronModeScreen() {
  const [gestureEnabled, setGestureEnabled] = useState(false);
  const [gestureStatus, setGestureStatus] = useState("disabled");
  const [gestureDebug, setGestureDebug] = useState(null);
  const handleGestureStatus = useCallback((status) => {
    setGestureStatus(status);
    if (status === "disabled" || status === "denied" || status === "error") setGestureDebug(null);
  }, []);

  return (
    <main className="ultron-mode-screen">
      <div className="ultron-mode-void" />

      <section className="ultron-mode-frame">
        <button
          type="button"
          className="ultron-mode-assist-switch"
          onClick={() => setInterfaceMode(INTERFACE_MODES.ASSIST)}
          aria-label="Return to ULTRON Assist"
        >
          <span className="ultron-mode-assist-switch-orbit" />
          ASSIST
        </button>

        <button
          type="button"
          className={`ultron-mode-gesture-switch gesture-${gestureStatus}`}
          onClick={() => setGestureEnabled((enabled) => !enabled)}
          aria-pressed={gestureEnabled}
          aria-label={gestureEnabled ? "Disable hand gestures" : "Enable hand gestures"}
        >
          <span className="ultron-mode-assist-switch-orbit" />
          {gestureStatus === "requesting" ? "GESTURES REQUESTING..." : gestureStatus === "active" ? "GESTURES ACTIVE" : gestureStatus === "denied" ? "GESTURES DENIED" : gestureStatus === "error" ? "GESTURES ERROR" : "GESTURES OFF"}
        </button>

        <section className="ultron-mode-core-wrap">
          <UltronCore3D
            mode="idle"
            activity="idle"
            gestureEnabled={gestureEnabled}
            onGestureStatus={handleGestureStatus}
            onGestureDebug={setGestureDebug}
          />
        </section>
        <span className="ultron-mode-gesture-status" aria-live="polite">
          {gestureStatus === "denied" ? "CAMERA DENIED" : gestureStatus === "error" ? "GESTURES UNAVAILABLE" : gestureStatus === "requesting" ? "INITIALIZING" : ""}
        </span>
        {import.meta.env.DEV && new URLSearchParams(window.location.search).get("debugGestures") === "true" && gestureDebug && (
          <pre className="ultron-mode-gesture-debug">{`CAMERA: ${gestureDebug.camera}\nVIDEO: ${gestureDebug.video}\nMEDIAPIPE: ${gestureDebug.mediapipe}\nHANDS: ${gestureDebug.hands}\nLEFT PINCH: ${gestureDebug.leftPinch || "NO"}\nRIGHT PINCH: ${gestureDebug.rightPinch || "NO"}\nGESTURE: ${gestureDebug.gesture}\nHAND DISTANCE: ${gestureDebug.distance || "--"}\nZOOM: ${gestureDebug.zoom || "--"}\nCONTROL: ${gestureDebug.control}`}</pre>
        )}
      </section>
    </main>
  );
}

export default UltronModeScreen;
