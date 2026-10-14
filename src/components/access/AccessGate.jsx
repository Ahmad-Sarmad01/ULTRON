import { useState } from "react";
import { loginToUltron } from "../../services/api";
import "./AccessGate.css";

function AccessGate({ onAuthenticated }) {
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!password.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError("");

    try {
      await loginToUltron(password);
      onAuthenticated();
    } catch (loginError) {
      setError(
        loginError.message === "INVALID_PASSWORD"
          ? "ACCESS DENIED"
          : "ULTRON CORE UNAVAILABLE"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="ultron-access-shell">
      <div className="ultron-access-atmosphere" aria-hidden="true" />
      <div className="ultron-access-grid" aria-hidden="true" />

      <section className="ultron-access-card" aria-label="ULTRON access">
        <div className="access-corner access-corner-top" aria-hidden="true" />
        <div className="access-corner access-corner-bottom" aria-hidden="true" />

        <header className="access-header">
          <div className="access-brand-mark" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <div>
            <p className="access-kicker">PERSONAL INTELLIGENCE SYSTEM</p>
            <h1>ULTRON</h1>
          </div>
          <span className="access-status">OFFLINE</span>
        </header>

        <div className="access-divider" aria-hidden="true" />

        <div className="access-introduction">
          <span className="access-eyebrow">IDENTITY VERIFICATION</span>
          <h2>WELCOME BACK.</h2>
          <p>
            Your interface is waiting. Authenticate to access the ULTRON core.
          </p>
        </div>

        <form className="access-form" onSubmit={handleSubmit}>
          <label htmlFor="ultron-password">ACCESS PASSWORD</label>
          <div className={`access-input-wrap ${error ? "has-error" : ""}`}>
            <span className="access-input-prefix" aria-hidden="true">//</span>
            <input
              id="ultron-password"
              type="password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                if (error) setError("");
              }}
              placeholder="ENTER PASSWORD"
              autoComplete="current-password"
              autoFocus
              disabled={isSubmitting}
            />
          </div>

          <button type="submit" className="access-submit" disabled={isSubmitting || !password.trim()}>
            <span>{isSubmitting ? "AUTHENTICATING..." : "AUTHENTICATE"}</span>
            <span aria-hidden="true">→</span>
          </button>

          <p className={`access-feedback ${error ? "visible" : ""}`} aria-live="polite">
            {error || ""}
          </p>
        </form>

        <footer className="access-footer">
          <span>ULTRON // PRIVATE INSTANCE</span>
          <span>SECURE ACCESS NODE</span>
        </footer>
      </section>
    </main>
  );
}

export default AccessGate;
