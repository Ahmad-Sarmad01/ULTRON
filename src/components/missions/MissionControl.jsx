const PRIORITY_LABELS = {
  critical: "CRITICAL",
  high: "HIGH",
  normal: "NORMAL",
  low: "LOW",
};

function formatMissionDue(dueAt) {
  if (!dueAt) return null;

  const due = new Date(dueAt);
  const now = new Date();
  const diffMs = due.getTime() - now.getTime();
  const overdue = diffMs < 0;
  const absMs = Math.abs(diffMs);
  const minutes = Math.floor(absMs / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  let relative;
  if (days > 0) {
    relative = `${days}d ${hours % 24}h`;
  } else if (hours > 0) {
    relative = `${hours}h ${minutes % 60}m`;
  } else {
    relative = `${Math.max(minutes, 1)}m`;
  }

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

function MissionControl({
  missions,
  missionsLoading,
  missionFilter,
  setMissionFilter,
  notificationPermission,
  requestMissionNotifications,
  updateMissionStatus,
  deleteMissionById,
  missionAlert,
  dismissMissionAlert,
}) {
  const visibleMissions = missions.filter((mission) =>
    missionFilter === "active"
      ? mission.status === "active"
      : mission.status === "completed" || mission.status === "cancelled"
  );
  const activeMissionsCount = missions.filter(
    (mission) => mission.status === "active"
  ).length;

  return (
    <>
      <aside className="hud-panel hud-right">
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
            {notificationPermission === "granted"
              ? "ALERTS ON"
              : "ENABLE ALERTS"}
          </button>
          {activeMissionsCount > 0 && (
            <span className="mission-count-badge">{activeMissionsCount}</span>
          )}
        </div>

        <div className="mission-tabs">
          <button
            className={`mission-tab ${missionFilter === "active" ? "active" : ""}`}
            onClick={() => setMissionFilter("active")}
          >
            ACTIVE
          </button>
          <button
            className={`mission-tab ${missionFilter === "completed" ? "active" : ""}`}
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
              <div className="mission-description">Loading missions...</div>
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
                    due?.overdue && mission.status === "active" ? "overdue" : ""
                  }`}
                >
                  <div className="mission-card-top">
                    <span className="mission-priority-dot" />
                    <span className="mission-card-priority">
                      {PRIORITY_LABELS[mission.priority] || "NORMAL"}
                    </span>
                  </div>
                  <div className="mission-card-title">{mission.title}</div>
                  {due && (
                    <div className={`mission-card-due ${due.overdue ? "overdue" : ""}`}>
                      {mission.status === "active" ? due.relative : due.absolute}
                    </div>
                  )}
                  <div className="mission-card-actions">
                    {mission.status === "active" && (
                      <>
                        <button
                          className="mission-action complete"
                          onClick={() => updateMissionStatus(mission.id, "completed")}
                          title="Mark complete"
                        >
                          ✓
                        </button>
                        <button
                          className="mission-action cancel"
                          onClick={() => updateMissionStatus(mission.id, "cancelled")}
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
      </aside>

      {missionAlert && (
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
            <div className="mission-alert-title">{missionAlert.title}</div>
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
              <button className="mission-alert-dismiss" onClick={dismissMissionAlert}>
                DISMISS
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default MissionControl;