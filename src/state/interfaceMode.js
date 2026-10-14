export const INTERFACE_MODES = Object.freeze({
  ASSIST: "assist",
  ULTRON: "ultron",
});

const listeners = new Set();
let currentInterfaceMode = null;

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

export function getInterfaceMode() {
  return currentInterfaceMode;
}

export function getInterfaceModeId() {
  return currentInterfaceMode;
}

export function setInterfaceMode(mode) {
  if (!mode || (mode !== INTERFACE_MODES.ASSIST && mode !== INTERFACE_MODES.ULTRON)) {
    return null;
  }

  currentInterfaceMode = mode;
  notifyListeners();
  return currentInterfaceMode;
}

export function resetInterfaceMode() {
  currentInterfaceMode = null;
  notifyListeners();
}

export function subscribeInterfaceMode(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
