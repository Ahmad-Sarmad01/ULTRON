import { useSyncExternalStore } from "react";

import {
  getCurrentMode,
  getCurrentModeId,
  setCurrentMode,
  subscribeToMode,
} from "../state/ultronMode";

export function useUltronMode() {
  const modeId = useSyncExternalStore(
    subscribeToMode,
    getCurrentModeId,
    () => "normal"
  );

  return {
    mode: getCurrentMode(),
    modeId,
    setMode: setCurrentMode,
  };
}