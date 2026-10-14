const PINCH_ON = 0.32;
const PINCH_OFF = 0.45;

function distance(first, second) {
  return Math.hypot(first.x - second.x, first.y - second.y, (first.z || 0) - (second.z || 0));
}

export function createPinchDetector() {
  let active = false;

  return {
    update(landmarks) {
      if (!landmarks?.[4] || !landmarks?.[8]) return active;
      const palmScale = Math.max(distance(landmarks[5], landmarks[17]), 0.001);
      const normalizedDistance = distance(landmarks[4], landmarks[8]) / palmScale;
      if (!active && normalizedDistance < PINCH_ON) active = true;
      if (active && normalizedDistance > PINCH_OFF) active = false;
      return active;
    },
    reset() { active = false; },
  };
}
