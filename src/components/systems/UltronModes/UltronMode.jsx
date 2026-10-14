import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import {
  ULTRON_MODES,
  setCurrentMode,
} from "../../../state/ultronMode";
import "./UltronMode.css";

function UltronMode({ mode }) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef(null);
  const modeEntries = Object.values(ULTRON_MODES);

  useEffect(() => {
    if (!isOpen) return undefined;

    const closeOnOutsideClick = (event) => {
      if (!triggerRef.current?.contains(event.target) && !event.target.closest(".ultron-mode-popover")) {
        setIsOpen(false);
      }
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  const selectMode = (modeId) => {
    setCurrentMode(modeId);
    setIsOpen(false);
  };

  const popover = isOpen && typeof document !== "undefined" ? createPortal(
    <div className="ultron-mode-popover" role="dialog" aria-label="ULTRON mode selector">
      <div className="ultron-mode-popover-title">SELECT OPERATING MODE</div>
      <div className="ultron-mode-options">
        {modeEntries.map((entry) => (
          <button
            className={`ultron-mode-option ${entry.id === mode.id ? "active" : ""}`}
            key={entry.id}
            onClick={() => selectMode(entry.id)}
          >
            <span className="ultron-mode-dot" />
            <span className="ultron-mode-option-copy">
              <strong>{entry.label}</strong>
              <small>{entry.description}</small>
            </span>
            {entry.id === mode.id && <span className="ultron-mode-current">ACTIVE</span>}
          </button>
        ))}
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <>
      <div className="ultron-mode-control">
        <span className="ultron-mode-control-label">MODE</span>
        <button
          ref={triggerRef}
          className={`ultron-mode-trigger mode-${mode.id}`}
          onClick={() => setIsOpen((open) => !open)}
          aria-expanded={isOpen}
          aria-haspopup="dialog"
        >
          <span className="ultron-mode-dot" />
          {mode.label}
          <span className="ultron-mode-chevron">⌄</span>
        </button>
      </div>
      {popover}
    </>
  );
}

export default UltronMode;