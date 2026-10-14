import "./ModeSelector.css";

function ModeSelector({ currentMode, onChoose }) {
  return (
    <main className="ultron-mode-selector-shell">
      <section className="ultron-mode-selector" aria-label="ULTRON interface selector">
        <div className="mode-selector-grid" aria-hidden="true">
          <span className="grid-corner grid-corner-one" />
          <span className="grid-corner grid-corner-two" />
        </div>

        <div className="mode-selector-head">
          <span className="mode-selector-kicker">ULTRON</span>
          <span className="mode-selector-divider" />
          <span className="mode-selector-subtitle">SYSTEM INITIALIZED</span>
        </div>

        <section className="mode-selector-content">
          <div className="mode-selector-title-wrap">
            <span className="mode-selector-eyebrow">ACCESS NODE</span>
            <h1 className="mode-selector-title">SELECT OPERATING INTERFACE</h1>
          </div>

          <div className="mode-selector-options">
            <button
              type="button"
              className={`mode-selector-option ${currentMode === "assist" ? "selected" : ""}`}
              onClick={() => onChoose("assist")}
              aria-label="Open ULTRON Assist"
            >
              <span className="mode-option-index">01</span>
              <span className="mode-option-copy">
                <span className="mode-option-label">ULTRON ASSIST</span>
                <span className="mode-option-detail">Existing command interface</span>
              </span>
            </button>

            <button
              type="button"
              className={`mode-selector-option ${currentMode === "ultron" ? "selected" : ""}`}
              onClick={() => onChoose("ultron")}
              aria-label="Open ULTRON Mode"
            >
              <span className="mode-option-index">02</span>
              <span className="mode-option-copy">
                <span className="mode-option-label">ULTRON MODE</span>
                <span className="mode-option-detail">Immersive core interface</span>
              </span>
            </button>
          </div>
        </section>
      </section>
    </main>
  );
}

export default ModeSelector;
