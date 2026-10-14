import { useSyncExternalStore } from "react";

import {
  getInterfaceMode,
  getInterfaceModeId,
  setInterfaceMode,
  subscribeInterfaceMode,
} from "../state/interfaceMode";

export function useInterfaceMode() {
  const interfaceMode = useSyncExternalStore(
    subscribeInterfaceMode,
    getInterfaceModeId,
    () => null
  );

  return {
    interfaceMode,
    mode: getInterfaceMode(),
    setInterfaceMode,
  };
}
