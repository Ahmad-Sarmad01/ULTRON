import { runSystemScan } from "./systemScan";

const STATUS_TIMEOUT_MS = 1400;

function withTimeout(promise, timeoutMs) {
  return Promise.race([
    promise,
    new Promise((resolve) => {
      window.setTimeout(() => resolve(null), timeoutMs);
    }),
  ]);
}

export async function getWakeSystemStatus() {
  try {
    return await withTimeout(runSystemScan(), STATUS_TIMEOUT_MS);
  } catch {
    return null;
  }
}