import { useState } from "react";

import "./Vision.css";

const STATUS_COPY = {
  idle: "CAMERA OFF",
  requesting: "REQUESTING CAMERA ACCESS...",
  active: "CAMERA ACTIVE",
  captured: "FRAME CAPTURED",
  analyzing: "ANALYZING VISUAL INPUT...",
  result: "ANALYSIS COMPLETE",
  denied: "CAMERA ACCESS DENIED",
  error: "VISION SYSTEM UNAVAILABLE",
};

function Vision({ vision }) {
  const [prompt, setPrompt] = useState("");
  const {
    isOpen,
    state,
    snapshot,
    analysis,
    error,
    videoRef,
    isCameraActive,
    isAnalyzing,
    hasSnapshot,
    closeVision,
    enableCamera,
    capture,
    retake,
    analyze,
  } = vision;

  if (!isOpen) return null;

  const isPreviewVisible = isCameraActive && !snapshot;
  const isBusy = state === "requesting" || isAnalyzing;

  const submitAnalysis = async () => {
    await analyze(prompt.trim() || "Analyze this image and describe the most relevant visible information.");
  };

  return (
    <section className="vision-panel" aria-label="ULTRON vision">
      <header className="vision-header">
        <div>
          <span className="vision-kicker">OPTICAL SYSTEM</span>
          <h2>VISION</h2>
        </div>
        <button className="vision-close" onClick={closeVision} aria-label="Close vision">CLOSE</button>
      </header>

      <div className={`vision-status vision-status-${state}`}>
        <span className="vision-status-dot" />
        {STATUS_COPY[state]}
      </div>

      <div className="vision-frame">
        {isPreviewVisible && (
          <video ref={videoRef} autoPlay playsInline muted aria-label="Live camera preview" />
        )}
        {snapshot && (
          <img src={snapshot} alt="Captured vision frame" />
        )}
        {!isPreviewVisible && !snapshot && (
          <div className="vision-offline">
            <span>◈</span>
            <strong>{state === "requesting" ? "INITIALIZING OPTICAL LINK" : "CAMERA OFF"}</strong>
            <small>Camera access requires your explicit permission.</small>
          </div>
        )}
        {isAnalyzing && <div className="vision-scanline" />}
      </div>

      {error && <p className="vision-error">{error}</p>}

      {analysis && (
        <div className="vision-result">
          <span>ULTRON ANALYSIS</span>
          <p>{analysis}</p>
        </div>
      )}

      <label className="vision-question">
        <span>OPTIONAL QUESTION</span>
        <input
          type="text"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="What should I look for?"
          disabled={isBusy || !hasSnapshot}
        />
      </label>

      <div className="vision-actions">
        {state === "idle" || state === "denied" || (state === "error" && !hasSnapshot) ? (
          <button className="vision-primary" onClick={enableCamera} disabled={isBusy}>
            ENABLE CAMERA
          </button>
        ) : null}
        {state === "active" && (
          <button className="vision-primary" onClick={capture}>CAPTURE</button>
        )}
        {(state === "captured" || (state === "error" && hasSnapshot)) && (
          <>
            <button className="vision-primary" onClick={submitAnalysis}>ANALYZE</button>
            <button className="vision-secondary" onClick={retake}>RETAKE</button>
          </>
        )}
        {state === "result" && (
          <>
            <button className="vision-primary" onClick={submitAnalysis}>ANALYZE AGAIN</button>
            <button className="vision-secondary" onClick={retake}>RETAKE</button>
          </>
        )}
      </div>
    </section>
  );
}

export default Vision;
