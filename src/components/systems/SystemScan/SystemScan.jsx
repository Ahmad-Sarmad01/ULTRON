import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import "./SystemScan.css";

const SYSTEM_LABELS = {
  backend: "BACKEND API",
  ai: "AI MATRIX",
  memory: "MEMORY CORE",
  missions: "MISSION ENGINE",
  voice: "VOICE ENGINE",
  mood: "MOOD ENGINE",
  database: "DATABASE",
};

function statusLabel(status) {
  return status ? status.toUpperCase() : "UNKNOWN";
}

function SystemScan({
  isScanning,
  scanResult,
  scanError,
  onRunScan,
  onDismiss,
}) {
  const [visibleSystems, setVisibleSystems] = useState([]);
  const systems = scanResult?.systems || {};
  const systemEntries = Object.entries(systems);

  useEffect(() => {
    if (isScanning) {
      setVisibleSystems([]);
      return undefined;
    }

    if (!systemEntries.length) return undefined;

    const timers = systemEntries.map(([, system], index) =>
      window.setTimeout(
        () => setVisibleSystems((previous) => [...previous, system]),
        index * 180
      )
    );

    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [isScanning, scanResult]);

  const isOpen = isScanning || scanResult || scanError;

  const overlay = isOpen ? (
    <div className="system-scan-overlay" role="dialog" aria-label="ULTRON system scan">
      <section className="system-scan-panel">
        <div className="system-scan-sweep" />
        <header className="system-scan-header">
          <div className="system-scan-heading">
            <span className="system-scan-kicker">ULTRON // DIAGNOSTICS</span>
            <h2>SYSTEM SCAN</h2>
          </div>
          <button className="system-scan-close" onClick={onDismiss} aria-label="Close system scan">
            <span aria-hidden="true">×</span>
            <span className="system-scan-close-label">CLOSE</span>
          </button>
        </header>

        <div className="system-scan-content">
          <div className="system-scan-link">
            <span className="system-scan-pulse" />
            {isScanning ? "CORE LINK ESTABLISHED // DIAGNOSTIC SWEEP" : "CORE LINK ESTABLISHED"}
          </div>

          <div className="system-scan-results">
            {systemEntries.map(([key, system], index) => {
              const revealed = visibleSystems[index] === system || !isScanning && visibleSystems.length > index;
              return (
                <div className={`system-scan-row ${revealed ? "revealed" : "pending"}`} key={key}>
                  <span>{SYSTEM_LABELS[key] || key.toUpperCase()}</span>
                  <i />
                  <strong>{revealed ? statusLabel(system.status) : "SCANNING"}</strong>
                </div>
              );
            })}
            {isScanning && (
              <div className="system-scan-loading">SWEEPING APPLICATION SYSTEMS...</div>
            )}
          </div>

          {scanResult && (
            <div className="system-scan-summary">
              <div className="system-scan-integrity">
                <span>SYSTEM INTEGRITY</span>
                <strong>{scanResult.integrity}%</strong>
              </div>
              <div className="system-scan-meter">
                <span style={{ width: `${scanResult.integrity}%` }} />
              </div>
              <div className="system-scan-final">
                <span>THREAT LEVEL</span>
                <strong>{scanResult.status === "operational" ? "NOMINAL" : "DEGRADED"}</strong>
              </div>
              <p>
                {scanResult.status === "operational"
                  ? "Interesting. Everything appears functional."
                  : "One subsystem is behaving unexpectedly."}
              </p>
            </div>
          )}

          {scanError && (
            <div className="system-scan-error">SCAN UNAVAILABLE // RETRY DIAGNOSTICS</div>
          )}
        </div>
      </section>
    </div>
  ) : null;

  return (
    <>
      {typeof document !== "undefined" && overlay
        ? createPortal(overlay, document.body)
        : null}

      <button className="system-scan-trigger" onClick={onRunScan} disabled={isScanning}>
        {isScanning ? "SCANNING" : "RUN SYSTEM SCAN"}
      </button>
    </>
  );
}

export default SystemScan;