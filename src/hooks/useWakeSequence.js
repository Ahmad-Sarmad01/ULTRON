import { useEffect, useRef, useState } from "react";

import { getWakeSystemStatus } from "../services/wakeSequence";

const WAKE_STAGES = [
  { id: "power", label: "POWER CORE INITIALIZING", duration: 380 },
  { id: "core", label: "CORE LINK ESTABLISHED", duration: 420 },
  { id: "systems", label: "SYSTEM CHECKS IN PROGRESS", duration: 760 },
  { id: "ai", label: "AI MATRIX INITIALIZING", duration: 520 },
  { id: "memory", label: "MEMORY CORE SYNCHRONIZED", duration: 420 },
  { id: "online", label: "SYSTEM ONLINE", duration: 650 },
];

export const WAKE_STATE = Object.freeze({
  BOOTING: "booting",
  INITIALIZING: "initializing",
  READY: "ready",
});

export function useWakeSequence() {
  const [wakeState, setWakeState] = useState(WAKE_STATE.BOOTING);
  const [stageIndex, setStageIndex] = useState(0);
  const [systemStatus, setSystemStatus] = useState(null);
  const [isFading, setIsFading] = useState(false);
  const hasStarted = useRef(false);

  useEffect(() => {
    if (hasStarted.current) return undefined;
    hasStarted.current = true;

    let cancelled = false;
    const timers = [];

    const boot = async () => {
      const statusPromise = getWakeSystemStatus();

      statusPromise.then((result) => {
        if (!cancelled) setSystemStatus(result);
      });

      for (let index = 0; index < WAKE_STAGES.length; index += 1) {
        if (cancelled) return;
        setStageIndex(index);
        setWakeState(index === 0 ? WAKE_STATE.BOOTING : WAKE_STATE.INITIALIZING);

        await new Promise((resolve) => {
          const timer = window.setTimeout(resolve, WAKE_STAGES[index].duration);
          timers.push(timer);
        });
      }

      if (cancelled) return;
      setIsFading(true);
      window.setTimeout(() => {
        if (!cancelled) {
          setWakeState(WAKE_STATE.READY);
          setIsFading(false);
        }
      }, 360);
    };

    boot();

    return () => {
      cancelled = true;
      timers.forEach((timer) => window.clearTimeout(timer));
      hasStarted.current = false;
    };
  }, []);

  return {
    isReady: wakeState === WAKE_STATE.READY,
    isFading,
    wakeState,
    stage: WAKE_STAGES[stageIndex],
    stageIndex,
    stages: WAKE_STAGES,
    systemStatus,
  };
}