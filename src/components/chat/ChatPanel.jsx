import MemoryRecall from "../systems/MemoryRecall";

function ChatPanel({
  messages,
  isThinking,
  chatContainerRef,
  memoryRecall,
}) {
  return (
    <div className="communication-panel">
      <div className="communication-header">
        <span>COMMUNICATION CHANNEL</span>
        <span className="communication-status">● SECURE</span>
      </div>

      <div className="chat-container" ref={chatContainerRef}>
        {memoryRecall && (
          <MemoryRecall
            key={memoryRecall.query}
            recall={memoryRecall}
          />
        )}

        {messages.length === 0 && !isThinking && (
          <div className="welcome-message">
            <div className="welcome-line">SYSTEM INITIALIZED</div>
            <h1>What can I do for you?</h1>
            <p>Command channel ready.</p>
          </div>
        )}

        <div className="messages">
          {messages.map((item, index) => (
            <div key={index} className={`message-row ${item.role}`}>
              <div className="message-label">
                {item.role === "user" ? "YOU" : "ULTRON"}
              </div>
              <div className="message-bubble">{item.content}</div>
            </div>
          ))}

          {isThinking && (
            <div className="message-row ultron">
              <div className="message-label">ULTRON</div>
              <div className="message-bubble thinking-message">
                <span />
                <span />
                <span />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ChatPanel;