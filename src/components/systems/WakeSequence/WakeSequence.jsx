import { createPortal } from "react-dom";

import { WAKE_STATE } from "../../../hooks/useWakeSequence";
import "./WakeSequence.css";

const SYSTEM_LABELS = {
  backend: "BACKEND API",
  ai: "AI MATRIX",
  memory: "MEMORY CORE",
  missions: "MISSION ENGINE",
  voice: "VOICE ENGINE",
  mood: "MOOD ENGINE",
  database: "DATABASE",
};

function statusLabel(system) {
  if (!system) return "STANDBY";
  return system.status?.toUpperCase() || "READY";
}

function WakeSequence({
  isReady,
  isFading,
  wakeState,
  stage,
  stageIndex,
  systemStatus,
}) {
  if (isReady || typeof document === "undefined") return null;

  const systems = systemStatus?.systems || {};
  const entries = Object.entries(SYSTEM_LABELS);
  const overlay = (
    <div className={`wake-overlay ${isFading ? "wake-overlay-fading" : ""}`}>
      <section className="wake-panel" aria-label="ULTRON wake sequence">
        <div className="wake-scanline" />
        <div className="wake-brand">
          <span className="wake-brand-dot" />
          <div>
            <strong>ULTRON</strong>
            <small>PERSONAL AI SYSTEM</small>
          </div>
        </div>

        <div className="wake-core-mark" aria-hidden="true">
          <span className="wake-core-ring ring-one" />
          <span className="wake-core-ring ring-two" />
          <span className="wake-core-center" />
        </div>

        <div className="wake-stage-copy">
          <span className="wake-stage-index">SEQUENCE {String(stageIndex + 1).padStart(2, "0")} // 06</span>
          <h1>{stage.label}</h1>
          <p>{wakeState === WAKE_STATE.BOOTING ? "IGNITION PROTOCOL" : "ULTRON INITIALIZATION"}</p>
        </div>

        <div className="wake-system-list">
          {entries.map(([key, label], index) => {
            const isVisible = stageIndex >= 2 && index <= Math.max(0, stageIndex + 2);
            return (
              <div className={`wake-system-row ${isVisible ? "visible" : "pending"}`} key={key}>
                <span>{label}</span>
                <i />
                <strong>{isVisible ? statusLabel(systems[key]) : "STANDBY"}</strong>
              </div>
            );
          })}
        </div>

        <div className="wake-footer">
          <span className="wake-footer-status">{stageIndex >= 5 ? "SYSTEM ONLINE" : "ESTABLISHING SECURE LINK"}</span>
          <span className="wake-progress"><i style={{ width: `${Math.min(100, ((stageIndex + 1) / 6) * 100)}%` }} /></span>
        </div>
      </section>
    </div>
  );

  return createPortal(overlay, document.body);
}

export default WakeSequence;