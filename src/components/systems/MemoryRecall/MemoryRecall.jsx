import { useEffect, useState } from "react";

import "./MemoryRecall.css";

function MemoryRecall({ recall }) {
  const [status, setStatus] = useState("searching");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setStatus(recall.status);
    }, 180);

    return () => window.clearTimeout(timer);
  }, [recall]);

  const matches = recall.matches || [];
  const statusLabel = status === "found"
    ? `${matches.length.toString().padStart(2, "0")} MATCHES FOUND`
    : status === "empty"
      ? "NO RELEVANT MEMORY FOUND"
      : "SEARCHING NEURAL ARCHIVE...";

  return (
    <section className={`memory-recall memory-recall-${status}`} aria-live="polite">
      <div className="memory-recall-header">
        <span className="memory-recall-signal" />
        <div>
          <span className="memory-recall-kicker">MEMORY RECALL</span>
          <strong>{statusLabel}</strong>
        </div>
      </div>

      {status === "searching" && (
        <div className="memory-recall-progress">
          <span />
          <span />
          <span />
        </div>
      )}

      {status === "found" && (
        <div className="memory-recall-matches">
          {matches.map((match, index) => (
            <article className="memory-recall-match" key={`${match.content}-${index}`}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <p>{match.content}</p>
            </article>
          ))}
        </div>
      )}

      {status === "empty" && (
        <p className="memory-recall-empty">Nothing reliable is stored for this query.</p>
      )}
    </section>
  );
}

export default MemoryRecall;
