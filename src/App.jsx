import {
  useEffect,
  useRef,
  useState,
} from "react";
import "./App.css";
import {
  speak,
  stopSpeaking,
  isSpeechSupported,
} from "./voice/speech";

import {
  startListening,
  stopListening,
  isListeningSupported,
} from "./voice/listen";

import {
  sendChatMessage,
  getMissions,
  getDueMissions,
  updateMission,
  deleteMission,
} from "./services/api";
import { useSystemScan } from "./hooks/useSystemScan";
import { useUltronMode } from "./hooks/useUltronMode";
import { useWakeSequence } from "./hooks/useWakeSequence";
import { useVision } from "./hooks/useVision";
import { modeResponse, parseModeCommand } from "./services/ultronMode";
import { useInterfaceMode } from "./hooks/useInterfaceMode";
import { INTERFACE_MODES } from "./state/interfaceMode";

import UltronAndroid from "./components/UltronAndroid";
import ChatPanel from "./components/chat/ChatPanel";
import MissionControl from "./components/missions/MissionControl";
import SystemScan from "./components/systems/SystemScan";
import UltronMode from "./components/systems/UltronModes";
import Vision from "./components/systems/Vision";
import WakeSequence from "./components/systems/WakeSequence";
import AccessGate from "./components/access/AccessGate";
import ModeSelector from "./components/mode/ModeSelector";
import UltronModeScreen from "./components/mode/UltronModeScreen";
import UltronFooter from "./components/footer";
import "./components/footer/UltronFooter.css";

const SHOW_LEGACY_MARKUP = Boolean(import.meta.env.VITE_SHOW_LEGACY_MARKUP);

const PRIORITY_LABELS = {
  critical: "CRITICAL",
  high: "HIGH",
  normal: "NORMAL",
  low: "LOW",
};

function formatMissionDue(dueAt) {
  if (!dueAt) return null;

  const due = new Date(dueAt);
  const diffMs = due.getTime() - new Date().getTime();
  const overdue = diffMs < 0;
  const minutes = Math.floor(Math.abs(diffMs) / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const relative = days > 0
    ? `${days}d ${hours % 24}h`
    : hours > 0
      ? `${hours}h ${minutes % 60}m`
      : `${Math.max(minutes, 1)}m`;

  return {
    relative: overdue ? `Overdue by ${relative}` : `In ${relative}`,
    absolute: due.toLocaleString(undefined, {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }),
    overdue,
  };
}

function isSystemScanRequest(value) {
  return /^(?:hey\s+ultron[,!: ]*)?(?:run\s+(?:a\s+)?system\s+scan|system\s+scan|scan\s+the\s+system|run\s+diagnostics|diagnostics|check\s+system\s+status)[.!?]*$/i.test(value.trim());
}

function isVisionOpenRequest(value) {
  return /^(?:hey\s+ultron[,!: ]*)?(?:open|activate|turn on|start|use) vision[.!?]*$|^(?:hey\s+ultron[,!: ]*)?(?:show me what you see|look through the camera|analyze what i(?:'m| am) showing you|look at this)[.!?]*$/i.test(value.trim());
}

function isVisionQuestion(value) {
  return /^(?:hey\s+ultron[,!: ]*)?what do you see[.!?]*$/i.test(value.trim());
}

function App() {
  const { interfaceMode, setInterfaceMode } = useInterfaceMode();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  if (!isAuthenticated) {
    return (
      <AccessGate
        onAuthenticated={() => setIsAuthenticated(true)}
      />
    );
  }

  if (interfaceMode === null) {
    return (
      <ModeSelector
        currentMode={null}
        onChoose={(mode) => setInterfaceMode(mode)}
      />
    );
  }

  if (interfaceMode === INTERFACE_MODES.ULTRON) {
    return <UltronModeScreen />;
  }

  return <AssistInterface setInterfaceMode={setInterfaceMode} />;
}

function AssistInterface({ setInterfaceMode }) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [isThinking, setIsThinking] = useState(false);
  const [memoryRecall, setMemoryRecall] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [systemStatus, setSystemStatus] = useState("ONLINE");

  const [voiceLanguage, setVoiceLanguage] = useState("ur-PK");

  // ----------------------------------------------
  // MISSION STATE
  // ----------------------------------------------

  const [missions, setMissions] = useState([]);
  const [missionsLoading, setMissionsLoading] = useState(true);
  const [missionFilter, setMissionFilter] = useState("active");
  const [notificationPermission, setNotificationPermission] = useState(
    typeof window !== "undefined" && "Notification" in window
      ? Notification.permission
      : "unsupported"
  );
  const [missionAlertQueue, setMissionAlertQueue] = useState([]);
  const { mode, setMode } = useUltronMode();
  const wake = useWakeSequence();
  const vision = useVision();
  const {
    isScanning,
    scanResult,
    scanError,
    runSystemScan,
    dismissScan,
  } = useSystemScan();

  const recognitionRef = useRef(null);
  const chatContainerRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    return () => {
      stopSpeaking();

      if (recognitionRef.current) {
        stopListening(recognitionRef.current);
      }
    };
  }, []);

  // ----------------------------------------------
  // AUTO SCROLL
  // ----------------------------------------------

  useEffect(() => {
    if (!messages.length && !isThinking) return;

    const chatContainer = chatContainerRef.current;
    chatContainer?.scrollTo({
      top: chatContainer.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isThinking]);

  // ----------------------------------------------
  // MISSION FETCH / POLLING
  // ----------------------------------------------

  const fetchMissions = async () => {
    try {
      const data = await getMissions();

      setMissions(data.missions || []);
    } catch (error) {
      console.error("ULTRON mission fetch error:", error);
    } finally {
      setMissionsLoading(false);
    }
  };

  const requestMissionNotifications = async () => {
    if (!("Notification" in window)) {
      setNotificationPermission("unsupported");
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
    } catch (error) {
      console.error("ULTRON notification permission error:", error);
    }
  };

  const announceMission = async (mission) => {
    // ------------------------------------------
    // SHOW ULTRON HUD ALERT
    // ------------------------------------------

    setMissionAlertQueue((previous) => [...previous, mission]);
    setSystemStatus("ALERT");

    // ------------------------------------------
    // CHROME DESKTOP NOTIFICATION
    // ------------------------------------------

    const permission =
      "Notification" in window ? Notification.permission : "unsupported";

    if (permission === "granted") {
      const notification = new Notification(
        "ULTRON // MISSION DUE",
        {
          body: `${mission.title}${
            mission.priority === "critical" ? " — CRITICAL" : ""
          }`,
          tag: `ultron-mission-${mission.id}`,
          requireInteraction: true,
        }
      );

      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    }

    // ------------------------------------------
    // ULTRON VOICE ANNOUNCEMENT
    // ------------------------------------------

    if (isSpeechSupported()) {
      const priorityText =
        mission.priority === "critical"
          ? " Critical priority."
          : mission.priority === "high"
            ? " High priority."
            : "";

      const announcement =
        `Ahmad. Your mission is due. ${mission.title}.${priorityText}`;

      try {
        await speak(
          announcement,

          () => {
            setIsSpeaking(true);
            setSystemStatus("SPEAKING");
          },

          () => {
            setIsSpeaking(false);
            setSystemStatus("ALERT");
          },

          voiceLanguage
        );
      } catch (error) {
        console.error(
          "ULTRON mission voice announcement error:",
          error
        );

        setIsSpeaking(false);
        setSystemStatus("ALERT");
      }
    }
  };

  const checkMissionNotifications = async () => {
    try {
      const data = await getDueMissions();
      const dueMissions = data.missions || [];

      if (dueMissions.length > 0) {
        dueMissions.forEach((mission, index) => {
          window.setTimeout(
            () => announceMission(mission),
            index * 450
          );
        });

        await fetchMissions();
      }
    } catch (error) {
      console.error(
        "ULTRON notification check error:",
        error
      );
    }
  };

  useEffect(() => {
    fetchMissions();
    checkMissionNotifications();

    const interval = setInterval(() => {
      fetchMissions();
      checkMissionNotifications();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  // Force a re-render every 60s so countdowns stay fresh
  const [, forceTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(
      () => forceTick((tick) => tick + 1),
      60000
    );

    return () => clearInterval(timer);
  }, []);

  // ----------------------------------------------
  // MISSION ACTIONS
  // ----------------------------------------------

  const updateMissionStatus = async (missionId, status) => {
    const previousMissions = missions;

    setMissions((previous) =>
      previous.map((mission) =>
        mission.id === missionId
          ? { ...mission, status }
          : mission
      )
    );

    try {
      await updateMission(missionId, { status });
    } catch (error) {
      console.error("ULTRON mission update error:", error);
      setMissions(previousMissions);
    }
  };

  const deleteMissionById = async (missionId) => {
    const previousMissions = missions;

    setMissions((previous) =>
      previous.filter((mission) => mission.id !== missionId)
    );

    try {
      await deleteMission(missionId);
    } catch (error) {
      console.error("ULTRON mission delete error:", error);
      setMissions(previousMissions);
    }
  };

  const missionAlert = missionAlertQueue[0] || null;

  const visibleMissions = missions.filter((mission) =>
    missionFilter === "active"
      ? mission.status === "active"
      : mission.status === "completed" || mission.status === "cancelled"
  );

  const activeMissionsCount = missions.filter(
    (mission) => mission.status === "active"
  ).length;

  const dismissMissionAlert = () => {
    setMissionAlertQueue((previous) => previous.slice(1));

    if (missionAlertQueue.length <= 1 && !isThinking && !isListening && !isSpeaking) {
      setSystemStatus("ONLINE");
    }
  };

  // ----------------------------------------------
  // ULTRON EARS
  // ----------------------------------------------

  const startUltronListening = () => {
    if (isThinking || isSpeaking || isListening) {
      return;
    }

    if (!isListeningSupported()) {
      console.warn(
        "ULTRON Ears: Speech recognition is not supported."
      );

      setSystemStatus("ERROR");

      return;
    }

    const recognition = startListening({
      language: voiceLanguage,
      onStart: () => {
        setIsListening(true);
        setSystemStatus("LISTENING");
      },

      onResult: (transcript) => {
        setMessage(transcript);

        sendMessage(transcript, true);
      },

      onEnd: () => {
        setIsListening(false);

        setSystemStatus((currentStatus) =>
          currentStatus === "ERROR"
            ? "ERROR"
            : "ONLINE"
        );
      },

      onError: (error) => {
        console.error(
          "ULTRON listening error:",
          error
        );

        setIsListening(false);
        setSystemStatus("ERROR");
      },
    });

    recognitionRef.current = recognition;
  };

  // ----------------------------------------------
  // STOP ULTRON EARS
  // ----------------------------------------------

  const stopUltronListening = () => {
    if (!recognitionRef.current) {
      return;
    }

    stopListening(recognitionRef.current);

    recognitionRef.current = null;

    setIsListening(false);
    setSystemStatus("ONLINE");
  };

  const triggerSystemScan = async (isVoiceInput = false) => {
    setSystemStatus("SCANNING");

    try {
      const result = await runSystemScan();
      const announcement = result.status === "operational"
        ? "System scan complete. All systems operational."
        : "System scan complete. One subsystem is degraded.";

      if (isVoiceInput && isSpeechSupported()) {
        await speak(
          announcement,
          () => {
            setIsSpeaking(true);
            setSystemStatus("SPEAKING");
          },
          () => {
            setIsSpeaking(false);
            setSystemStatus(result.status === "operational" ? "ONLINE" : "ERROR");
          },
          null
        );
      } else {
        setSystemStatus(result.status === "operational" ? "ONLINE" : "ERROR");
      }

      return result;
    } catch (error) {
      console.error("ULTRON system scan error:", error);
      setSystemStatus("ERROR");
      return null;
    }
  };

  const respondWithVoiceIfNeeded = async (response, isVoiceInput) => {
    if (!isVoiceInput || !isSpeechSupported()) return;

    await speak(
      response,
      () => {
        setIsSpeaking(true);
        setSystemStatus("SPEAKING");
      },
      () => {
        setIsSpeaking(false);
        setSystemStatus("ONLINE");
      },
      null
    );
  };

  // ----------------------------------------------
  // SEND MESSAGE
  // ----------------------------------------------

  const sendMessage = async (
    voiceMessage = null,
    isVoiceInput = false
  ) => {
    const userMessage = (
      voiceMessage !== null
        ? voiceMessage
        : message
    ).trim();

    if (!userMessage || isThinking) return;

    setMessages((previous) => [
      ...previous,
      {
        role: "user",
        content: userMessage,
      },
    ]);

    setMessage("");
    setIsThinking(true);
    setMemoryRecall(null);
    setSystemStatus("THINKING");

    try {
      const modeCommand = parseModeCommand(userMessage);

      if (modeCommand) {
        const nextMode = modeCommand.type === "query"
          ? mode
          : setMode(modeCommand.modeId);
        const reply = modeResponse(nextMode, modeCommand.type);

        setMessages((previous) => [
          ...previous,
          {
            role: "ultron",
            content: reply,
          },
        ]);
        await respondWithVoiceIfNeeded(reply, isVoiceInput);
        if (!isVoiceInput || !isSpeechSupported()) setSystemStatus("ONLINE");
        return;
      }

      if (isVisionOpenRequest(userMessage)) {
        vision.openVision();
        const reply = "Vision ready. Camera access is waiting for your permission.";
        setMessages((previous) => [
          ...previous,
          { role: "ultron", content: reply },
        ]);
        await respondWithVoiceIfNeeded(reply, isVoiceInput);
        if (!isVoiceInput || !isSpeechSupported()) setSystemStatus("ONLINE");
        return;
      }

      if (isVisionQuestion(userMessage)) {
        let reply;

        if (!vision.isOpen) {
          reply = "Vision is offline. Open Vision and enable the camera first.";
        } else if (!vision.hasSnapshot) {
          reply = "Vision is ready. Enable the camera and capture a frame first.";
        } else {
          const result = await vision.analyze(userMessage);
          reply = result?.analysis || "Vision analysis failed. Try again.";
        }

        setMessages((previous) => [
          ...previous,
          { role: "ultron", content: reply },
        ]);
        await respondWithVoiceIfNeeded(reply, isVoiceInput);
        if (!isVoiceInput || !isSpeechSupported()) setSystemStatus("ONLINE");
        return;
      }

      if (isSystemScanRequest(userMessage)) {
        setMessages((previous) => [
          ...previous,
          {
            role: "ultron",
            content: "Running diagnostics. Stand by.",
          },
        ]);
        await triggerSystemScan(isVoiceInput);
        return;
      }

      const data = await sendChatMessage(userMessage, mode.id);
      setMemoryRecall(data.memory_recall || null);

      setMessages((previous) => [
        ...previous,
        {
          role: "ultron",
          content: data.reply,
        },
      ]);

      if (data.mission_created && data.mission) {
        setMissions((previous) => [
          data.mission,
          ...previous,
        ]);

        setMissionFilter("active");
      }

      if (isVoiceInput && isSpeechSupported()) {

        await speak(
          data.reply,

          () => {
            setIsSpeaking(true);
            setSystemStatus("SPEAKING");
          },

          () => {
            setIsSpeaking(false);
            setSystemStatus("ONLINE");
          },

          null
        );

      } else {
        setSystemStatus("ONLINE");
      }

    } catch (error) {
      console.error("ULTRON communication error:", error);

      setMessages((previous) => [
        ...previous,
        {
          role: "ultron",
          content:
            "Hmm... I lost connection to my brain for a moment. 😅",
        },
      ]);

      setSystemStatus("ERROR");
    } finally {
      setIsThinking(false);
    }
  };

  // ----------------------------------------------
  // KEYBOARD INPUT
  // ----------------------------------------------

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  return (
    <main className="ultron-interface">

      {/* ------------------------------------------ */}
      {/* BACKGROUND EFFECTS */}
      {/* ------------------------------------------ */}

      <div className="background-grid" />

      <div className="ambient-glow glow-one" />
      <div className="ambient-glow glow-two" />
      <div className="ambient-glow glow-three" />

      <div className="energy-field">
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>

      <div className="scan-line" />

      {/* ------------------------------------------ */}
      {/* HEADER */}
      {/* ------------------------------------------ */}

      <header className="top-bar">

        <div className="brand">
          <div className="brand-indicator" />

          <div>
            <div className="brand-name">ULTRON</div>
            <div className="brand-subtitle">
              PERSONAL AI SYSTEM
            </div>
          </div>
        </div>

        <div className="system-status">
          <UltronMode mode={mode} />
          <button
            type="button"
            className="assist-ultron-switch"
            onClick={() => setInterfaceMode(INTERFACE_MODES.ULTRON)}
            aria-label="Switch to ULTRON Mode"
          >
            ULTRON MODE
          </button>
          <span
            className={`status-dot ${systemStatus.toLowerCase()}`}
          />

          <span>{systemStatus}</span>
        </div>

      </header>

      {/* ------------------------------------------ */}
      {/* MAIN AREA */}
      {/* ------------------------------------------ */}

      <section className="main-stage">

        {/* =====================================================
            LEFT SYSTEM PANEL
        ===================================================== */}

        <aside className="hud-panel hud-left">

          <div className="hud-panel-header">
            <span className="hud-indicator" />
            SYSTEM
          </div>

          <div className="hud-panel-body">

            <div className="telemetry-item">
              <span>CORE STATUS</span>
              <strong>{systemStatus}</strong>
            </div>

            <div className="telemetry-item">
              <span>VOICE LINK</span>
              <strong>
                {isListening
                  ? "LISTENING"
                  : isSpeaking
                    ? "ACTIVE"
                    : "STANDBY"}
              </strong>
            </div>

            <div className="telemetry-item">
              <span>CONNECTION</span>
              <strong className="online-text">
                ONLINE
              </strong>
            </div>

            <div className="telemetry-item">
              <span>MESSAGES</span>
              <strong>
                {messages.length.toString().padStart(2, "0")}
              </strong>
            </div>

          </div>

          <div className="hud-panel-footer">
            ULTRON CORE // 01
          </div>

          <SystemScan
            isScanning={isScanning}
            scanResult={scanResult}
            scanError={scanError}
            onRunScan={() => triggerSystemScan(false)}
            onDismiss={dismissScan}
          />

        </aside>


        {/* =====================================================
            CENTER CORE
        ===================================================== */}

        <div className="core-zone">

          <div
            className={`android-stage mode-${mode.id} wake-${wake.wakeState} ${
              !wake.isReady
                ? "state-thinking"
                : isScanning
                ? "state-scanning"
                : isThinking
                ? "state-thinking"
                : isListening
                  ? "state-listening"
                  : isSpeaking
                    ? "state-speaking"
                        : memoryRecall
                          ? "state-recalling"
                          : vision.isOpen
                            ? "state-vision"
                            : "state-idle"
            }`}
          >
            <UltronAndroid
              state={
                !wake.isReady
                  ? "thinking"
                  : isScanning
                  ? "scanning"
                  : missionAlert
                  ? "alert"
                  : isThinking
                    ? "thinking"
                    : isListening
                      ? "listening"
                      : isSpeaking
                        ? "speaking"
                        : memoryRecall
                          ? "thinking"
                          : vision.isOpen
                            ? vision.isAnalyzing ? "scanning" : "thinking"
                            : "idle"
              }
            />

            <div className="android-embers">
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
          </div>

          <div className="core-label">

            <div className="core-name">
              ULTRON
            </div>

            <div className="core-state">
              {!wake.isReady
                ? wake.stage.label
                : isScanning
                ? "RUNNING DIAGNOSTICS"
                : isThinking
                ? "PROCESSING REQUEST"
                : isListening
                  ? "LISTENING"
                  : isSpeaking
                    ? "SPEAKING"
                    : memoryRecall
                      ? "RECALLING MEMORY"
                      : vision.isOpen
                        ? vision.isAnalyzing ? "VISION ANALYZING" : "VISION READY"
                        : "SYSTEM OPERATIONAL"}
            </div>

          </div>

        </div>

        <MissionControl
          missions={missions}
          missionsLoading={missionsLoading}
          missionFilter={missionFilter}
          setMissionFilter={setMissionFilter}
          notificationPermission={notificationPermission}
          requestMissionNotifications={requestMissionNotifications}
          updateMissionStatus={updateMissionStatus}
          deleteMissionById={deleteMissionById}
          missionAlert={missionAlert}
          dismissMissionAlert={dismissMissionAlert}
        />


        {/* =====================================================
            RIGHT MISSIONS PANEL
        ===================================================== */}

        {SHOW_LEGACY_MARKUP && <aside className="hud-panel hud-right">

          <div className="hud-panel-header">
            <span className="hud-indicator purple" />
            MISSIONS

            <button
              className={`mission-alert-toggle ${
                notificationPermission === "granted" ? "enabled" : ""
              }`}
              onClick={requestMissionNotifications}
              title={
                notificationPermission === "granted"
                  ? "Desktop mission alerts enabled"
                  : "Enable desktop mission alerts"
              }
            >
              {notificationPermission === "granted" ? "ALERTS ON" : "ENABLE ALERTS"}
            </button>

            {activeMissionsCount > 0 && (
              <span className="mission-count-badge">
                {activeMissionsCount}
              </span>
            )}
          </div>

          <div className="mission-tabs">

            <button
              className={`mission-tab ${
                missionFilter === "active" ? "active" : ""
              }`}
              onClick={() => setMissionFilter("active")}
            >
              ACTIVE
            </button>

            <button
              className={`mission-tab ${
                missionFilter === "completed" ? "active" : ""
              }`}
              onClick={() => setMissionFilter("completed")}
            >
              DONE
            </button>

          </div>

          <div className="mission-list">

            {missionsLoading && (
              <div className="mission-empty">
                <div className="mission-icon">◈</div>
                <div className="mission-title">SCANNING</div>
                <div className="mission-description">
                  Loading missions...
                </div>
              </div>
            )}

            {!missionsLoading && visibleMissions.length === 0 && (
              <div className="mission-empty">
                <div className="mission-icon">◈</div>

                <div className="mission-title">
                  {missionFilter === "active"
                    ? "NO ACTIVE MISSIONS"
                    : "NO COMPLETED MISSIONS"}
                </div>

                <div className="mission-description">
                  {missionFilter === "active"
                    ? "Awaiting command."
                    : "Nothing finished yet."}
                </div>
              </div>
            )}

            {!missionsLoading &&
              visibleMissions.map((mission) => {
                const due = formatMissionDue(mission.due_at);

                return (
                  <div
                    key={mission.id}
                    className={`mission-card priority-${mission.priority} ${
                      due?.overdue && mission.status === "active"
                        ? "overdue"
                        : ""
                    }`}
                  >

                    <div className="mission-card-top">
                      <span className="mission-priority-dot" />
                      <span className="mission-card-priority">
                        {PRIORITY_LABELS[mission.priority] || "NORMAL"}
                      </span>
                    </div>

                    <div className="mission-card-title">
                      {mission.title}
                    </div>

                    {due && (
                      <div
                        className={`mission-card-due ${
                          due.overdue ? "overdue" : ""
                        }`}
                      >
                        {mission.status === "active"
                          ? due.relative
                          : due.absolute}
                      </div>
                    )}

                    <div className="mission-card-actions">

                      {mission.status === "active" && (
                        <>
                          <button
                            className="mission-action complete"
                            onClick={() =>
                              updateMissionStatus(
                                mission.id,
                                "completed"
                              )
                            }
                            title="Mark complete"
                          >
                            ✓
                          </button>

                          <button
                            className="mission-action cancel"
                            onClick={() =>
                              updateMissionStatus(
                                mission.id,
                                "cancelled"
                              )
                            }
                            title="Cancel mission"
                          >
                            ✕
                          </button>
                        </>
                      )}

                      <button
                        className="mission-action delete"
                        onClick={() => deleteMissionById(mission.id)}
                        title="Delete mission"
                      >
                        🗑
                      </button>

                    </div>

                  </div>
                );
              })}

          </div>

          <div className="hud-panel-footer">
            MISSION CONTROL // {String(missions.length).padStart(2, "0")}
          </div>

        </aside>}


        <ChatPanel
          messages={messages}
          isThinking={isThinking}
          chatContainerRef={chatContainerRef}
          memoryRecall={memoryRecall}
        />

        {/* =====================================================
            COMMUNICATION PANEL
        ===================================================== */}

        {SHOW_LEGACY_MARKUP && <div className="communication-panel">

          <div className="communication-header">

            <span>
              COMMUNICATION CHANNEL
            </span>

            <span className="communication-status">
              ● SECURE
            </span>

          </div>


          {/* CHAT */}

          <div
            className="chat-container"
            ref={chatContainerRef}
          >

            {messages.length === 0 && !isThinking && (

              <div className="welcome-message">

                <div className="welcome-line">
                  SYSTEM INITIALIZED
                </div>

                <h1>
                  What can I do for you?
                </h1>

                <p>
                  Command channel ready.
                </p>

              </div>

            )}

            <div className="messages">

              {messages.map((item, index) => (

                <div
                  key={index}
                  className={`message-row ${item.role}`}
                >

                  <div className="message-label">
                    {item.role === "user"
                      ? "YOU"
                      : "ULTRON"}
                  </div>

                  <div className="message-bubble">
                    {item.content}
                  </div>

                </div>

              ))}

              {isThinking && (

                <div className="message-row ultron">

                  <div className="message-label">
                    ULTRON
                  </div>

                  <div className="message-bubble thinking-message">

                    <span />
                    <span />
                    <span />

                  </div>

                </div>

              )}

              <div ref={messagesEndRef} />

            </div>

          </div>

        </div>}

      </section>

      {SHOW_LEGACY_MARKUP && missionAlert && (
        <div className="mission-alert-overlay" role="alert">
          <div className={`mission-alert-card priority-${missionAlert.priority}`}>
            <div className="mission-alert-scanline" />
            <div className="mission-alert-header">
              <span className="mission-alert-indicator" />
              ULTRON // MISSION DUE
            </div>

            <div className="mission-alert-priority">
              {PRIORITY_LABELS[missionAlert.priority] || "NORMAL"} PRIORITY
            </div>

            <div className="mission-alert-title">
              {missionAlert.title}
            </div>

            <div className="mission-alert-description">
              Mission requires your attention.
            </div>

            <div className="mission-alert-actions">
              <button
                className="mission-alert-complete"
                onClick={() => {
                  updateMissionStatus(missionAlert.id, "completed");
                  dismissMissionAlert();
                }}
              >
                COMPLETE
              </button>

              <button
                className="mission-alert-dismiss"
                onClick={dismissMissionAlert}
              >
                DISMISS
              </button>
            </div>
          </div>
        </div>
      )}

      <WakeSequence {...wake} />
      <Vision vision={vision} />

      {/* ------------------------------------------ */}
      {/* COMMAND BAR */}
      {/* ------------------------------------------ */}

      <footer className="command-area">

        {isSpeaking && (
          <button
            className="stop-speaking-button"
            onClick={() => {
              stopSpeaking();
              setIsSpeaking(false);
              setSystemStatus("ONLINE");
            }}
          >
            <span>■</span>
            STOP ULTRON
          </button>
        )}

        <div className="command-bar">
          <div className="voice-language-selector">

            <button
              className={
                voiceLanguage === "en-US"
                  ? "voice-language active"
                  : "voice-language"
              }
              onClick={() => setVoiceLanguage("en-US")}
              disabled={isListening || isThinking || isSpeaking}
            >
              EN
            </button>

            <button
              className={
                voiceLanguage === "ur-PK"
                  ? "voice-language active"
                  : "voice-language"
              }
              onClick={() => setVoiceLanguage("ur-PK")}
              disabled={isListening || isThinking || isSpeaking}
            >
              اردو
            </button>

          </div>
        <button
          className={`microphone-button ${
            isListening ? "listening" : ""
          }`}
          onClick={
            isListening
              ? stopUltronListening
              : startUltronListening
          }
          disabled={isThinking || isSpeaking}
          title={
            isListening
              ? "Stop listening"
              : "Talk to ULTRON"
          }
          aria-label={
            isListening
              ? "Stop listening"
              : "Start listening"
          }
        >
          <span className="mic-ripple ripple-one" />
          <span className="mic-ripple ripple-two" />
          <span className="mic-ripple ripple-three" />

          <span className="mic-core">
            ◉
          </span>

          <span className="mic-bars">
            <span />
            <span />
            <span />
            <span />
            <span />
          </span>
        </button>

          <div className="command-icon">
            ◈
          </div>

          <input
            type="text"
            placeholder="Talk to ULTRON..."
            value={message}
            onChange={(event) =>
              setMessage(event.target.value)
            }
            onKeyDown={handleKeyDown}
            disabled={isThinking}
          />

          <button
            className="send-button"
            onClick={() => sendMessage()}
            disabled={!message.trim() || isThinking}
          >
            <span>➤</span>
          </button>

        </div>

        <div className="command-hint">
          PRESS ENTER TO TRANSMIT
        </div>

      </footer>

    <UltronFooter />
    </main>
  );
}

export default App;