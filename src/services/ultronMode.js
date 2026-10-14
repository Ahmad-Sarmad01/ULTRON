import { MODE_IDS, ULTRON_MODES } from "../state/ultronMode";

const WAKE_PREFIX = /^(?:hey|hi|hello)?\s*ultron\s*[,!:.-]?\s*/i;

const MODE_NAMES = Object.keys(ULTRON_MODES).join("|");
const MODE_CHANGE_PATTERN = new RegExp(
  `(?:switch|change|enter|activate|enable|set|return)\\s+(?:to\\s+)?(${MODE_NAMES})(?:\\s+mode)?$|^(${MODE_NAMES})\\s+mode$`,
  "i"
);
const MODE_QUERY_PATTERN = /^(?:what|which)\s+mode\s+are\s+you\s+in\??$|^current\s+mode\??$/i;

export function parseModeCommand(value) {
  const normalized = value.trim().replace(WAKE_PREFIX, "").trim().replace(/[.!?]+$/, "");

  if (MODE_QUERY_PATTERN.test(normalized)) {
    return { type: "query" };
  }

  const match = normalized.match(MODE_CHANGE_PATTERN);
  const modeId = (match?.[1] || match?.[2])?.toLowerCase();

  if (modeId && ULTRON_MODES[modeId]) {
    return { type: "change", modeId };
  }

  return null;
}

export function modeResponse(mode, type = "change") {
  if (type === "query") {
    return `Current mode: ${mode.label}. ${mode.description}`;
  }

  const responses = {
    [MODE_IDS.NORMAL]: "Normal mode engaged. Core balance restored.",
    [MODE_IDS.FOCUS]: "Focus mode engaged. Proceeding with precision.",
    [MODE_IDS.NIGHT]: "Night mode engaged. Lowering the noise.",
    [MODE_IDS.DIAGNOSTIC]: "Diagnostic mode engaged. I will be precise.",
    [MODE_IDS.COMBAT]: "Combat mode engaged. Let's make this interesting.",
  };

  return responses[mode.id];
}