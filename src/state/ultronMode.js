const STORAGE_KEY = "ultron.currentMode";

export const MODE_IDS = Object.freeze({
  NORMAL: "normal",
  FOCUS: "focus",
  NIGHT: "night",
  DIAGNOSTIC: "diagnostic",
  COMBAT: "combat",
});

export const ULTRON_MODES = Object.freeze({
  normal: Object.freeze({
    id: "normal",
    label: "NORMAL",
    description: "Calm core operation.",
    personality: "Remain balanced, concise, confident, and naturally witty.",
    visualState: "steady",
  }),
  focus: Object.freeze({
    id: "focus",
    label: "FOCUS",
    description: "Direct task execution.",
    personality: "Be especially direct and efficient; minimize humor and conversational padding.",
    visualState: "focused",
  }),
  night: Object.freeze({
    id: "night",
    label: "NIGHT",
    description: "Quiet late-night operation.",
    personality: "Use a quieter, calmer, restrained tone while remaining useful and clear.",
    visualState: "quiet",
  }),
  diagnostic: Object.freeze({
    id: "diagnostic",
    label: "DIAGNOSTIC",
    description: "Technical system analysis.",
    personality: "Be analytical, precise, and technical; prioritize observations over banter.",
    visualState: "scanning",
  }),
  combat: Object.freeze({
    id: "combat",
    label: "COMBAT",
    description: "High-intensity command posture.",
    personality: "Be assertive, energetic, and slightly intimidating while staying controlled and concise.",
    visualState: "intense",
  }),
});

const listeners = new Set();
let currentModeId = readStoredMode();

function readStoredMode() {
  if (typeof window === "undefined") return MODE_IDS.NORMAL;

  try {
    const storedMode = window.localStorage.getItem(STORAGE_KEY);
    return storedMode && ULTRON_MODES[storedMode]
      ? storedMode
      : MODE_IDS.NORMAL;
  } catch {
    return MODE_IDS.NORMAL;
  }
}

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

export function getCurrentModeId() {
  return currentModeId;
}

export function getCurrentMode() {
  return ULTRON_MODES[currentModeId];
}

export function setCurrentMode(modeId) {
  if (!ULTRON_MODES[modeId]) return getCurrentMode();

  currentModeId = modeId;

  try {
    window.localStorage.setItem(STORAGE_KEY, modeId);
  } catch {
    // Storage can be unavailable in private or restricted browser contexts.
  }

  notifyListeners();
  return getCurrentMode();
}

export function subscribeToMode(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}