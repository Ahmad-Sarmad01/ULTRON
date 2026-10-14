import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";
import { createPinchDetector } from "./pinchDetection.js";

const WASM_PATH = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm";
const MODEL_PATH = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";
const DETECTION_INTERVAL_MS = 40;
const SMOOTHING = 0.22;

function midpoint(first, second) {
  return { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
}

function handCenter(landmarks) {
  return midpoint(landmarks[4], landmarks[8]);
}

export class HandGestureController {
  constructor({ onRotation, onZoom, onStatus, onDebug }) {
    this.onRotation = onRotation;
    this.onZoom = onZoom;
    this.onStatus = onStatus;
    this.onDebug = onDebug;
    this.video = null;
    this.stream = null;
    this.landmarker = null;
    this.running = false;
    this.lastVideoTime = -1;
    this.lastDetectionTime = 0;
    this.lastPoint = null;
    this.smoothedPoint = null;
    this.lastDistance = null;
    this.smoothedDistance = null;
    this.zoomBaselineDistance = null;
    this.zoomStarted = false;
    this.detectorsBySide = new Map();
    this.startToken = 0;
  }

  async start() {
    if (this.running) return;
    const startToken = ++this.startToken;
    this.onStatus?.("requesting");
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 640, height: 480 }, audio: false });
      if (startToken !== this.startToken) { this.stop({ notify: false }); return; }
      this.video = document.createElement("video");
      this.video.setAttribute("playsinline", "true");
      this.video.muted = true;
      this.video.srcObject = this.stream;
      await this.video.play();
      if (startToken !== this.startToken) { this.stop({ notify: false }); return; }
      await new Promise((resolve, reject) => {
        if (this.video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && this.video.videoWidth > 0) {
          resolve();
          return;
        }
        const handleLoaded = () => { cleanup(); resolve(); };
        const handleError = () => { cleanup(); reject(new Error("Gesture video failed to load")); };
        const cleanup = () => {
          this.video?.removeEventListener("loadeddata", handleLoaded);
          this.video?.removeEventListener("error", handleError);
        };
        this.video.addEventListener("loadeddata", handleLoaded, { once: true });
        this.video.addEventListener("error", handleError, { once: true });
      });
      if (startToken !== this.startToken) { this.stop({ notify: false }); return; }
      this.onDebug?.({ camera: "ACTIVE", video: `${this.video.videoWidth}x${this.video.videoHeight}`, mediapipe: "LOADING", hands: 0, gesture: "NONE", control: "NONE" });
      const vision = await FilesetResolver.forVisionTasks(WASM_PATH);
      if (startToken !== this.startToken) { this.stop({ notify: false }); return; }
      try {
        this.landmarker = await HandLandmarker.createFromOptions(vision, { baseOptions: { modelAssetPath: MODEL_PATH, delegate: "GPU" }, runningMode: "VIDEO", numHands: 2, minHandDetectionConfidence: 0.55, minHandPresenceConfidence: 0.55, minTrackingConfidence: 0.55 });
      } catch {
        this.landmarker = await HandLandmarker.createFromOptions(vision, { baseOptions: { modelAssetPath: MODEL_PATH, delegate: "CPU" }, runningMode: "VIDEO", numHands: 2, minHandDetectionConfidence: 0.55, minHandPresenceConfidence: 0.55, minTrackingConfidence: 0.55 });
      }
      if (startToken !== this.startToken) { this.stop({ notify: false }); return; }
      this.running = true;
      this.onStatus?.("active");
      this.onDebug?.({ camera: "ACTIVE", video: `${this.video.videoWidth}x${this.video.videoHeight}`, mediapipe: "READY", hands: 0, gesture: "NONE", control: "NONE" });
      this.processFrame();
    } catch (error) {
      const status = error?.name === "NotAllowedError" ? "denied" : "error";
      this.stop({ notify: false });
      this.onStatus?.(status);
    }
  }

  processFrame() {
    if (!this.running || !this.landmarker || !this.video) return;
    const now = performance.now();
    if (this.video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && this.video.videoWidth > 0 && this.video.currentTime !== this.lastVideoTime && now - this.lastDetectionTime >= DETECTION_INTERVAL_MS) {
      const result = this.landmarker.detectForVideo(this.video, performance.now());
      this.handleResult(result?.landmarks || [], result?.handednesses || []);
      this.lastVideoTime = this.video.currentTime;
      this.lastDetectionTime = now;
    }
    this.frameRequest = requestAnimationFrame(() => this.processFrame());
  }

  handleResult(hands, handednesses = []) {
    const handEntries = hands.map((landmarks, index) => ({
      landmarks,
      side: handednesses[index]?.[0]?.categoryName?.toLowerCase() === "left" ? "left" : handednesses[index]?.[0]?.categoryName?.toLowerCase() === "right" ? "right" : `hand${index}`,
    }));
    if (handEntries.length === 2 && handEntries.every((entry) => entry.side.startsWith("hand"))) {
      handEntries.sort((first, second) => handCenter(first.landmarks).x - handCenter(second.landmarks).x);
      handEntries[0].side = "left";
      handEntries[1].side = "right";
    }
    const pinchBySide = new Map();
    handEntries.forEach((entry) => {
      if (!this.detectorsBySide.has(entry.side)) this.detectorsBySide.set(entry.side, createPinchDetector());
      pinchBySide.set(entry.side, this.detectorsBySide.get(entry.side).update(entry.landmarks));
    });
    const left = handEntries.find((entry) => entry.side === "left");
    const right = handEntries.find((entry) => entry.side === "right");
    if (!left) this.detectorsBySide.get("left")?.reset();
    if (!right) this.detectorsBySide.get("right")?.reset();
    const leftPinch = left ? pinchBySide.get("left") : false;
    const rightPinch = right ? pinchBySide.get("right") : false;
    if (hands.some((landmarks) => landmarks.length !== 21)) return;
    if (hands.length === 1 && pinchBySide.get(handEntries[0].side)) {
      const point = handCenter(handEntries[0].landmarks);
      this.smoothedPoint = this.smoothedPoint
        ? { x: this.smoothedPoint.x + (point.x - this.smoothedPoint.x) * SMOOTHING, y: this.smoothedPoint.y + (point.y - this.smoothedPoint.y) * SMOOTHING }
        : point;
      this.onDebug?.({ camera: "ACTIVE", video: `${this.video.videoWidth}x${this.video.videoHeight}`, mediapipe: "READY", hands: 1, leftPinch: handEntries[0].side === "left" ? "YES" : "NO", rightPinch: handEntries[0].side === "right" ? "YES" : "NO", gesture: "ONE_HAND_PINCH", control: this.lastPoint ? "ROTATE" : "PINCH READY", x: this.smoothedPoint.x.toFixed(2), y: this.smoothedPoint.y.toFixed(2) });
      if (this.lastPoint) this.onRotation?.((this.smoothedPoint.x - this.lastPoint.x) * 3.2, (this.smoothedPoint.y - this.lastPoint.y) * 2.2);
      this.lastPoint = this.smoothedPoint;
      this.lastDistance = null;
      this.smoothedDistance = null;
      this.zoomBaselineDistance = null;
      this.zoomStarted = false;
      return;
    }
    if (hands.length === 2 && left && right && leftPinch && rightPinch) {
      const first = handCenter(left.landmarks);
      const second = handCenter(right.landmarks);
      const currentDistance = Math.hypot(first.x - second.x, first.y - second.y);
      this.smoothedDistance = this.smoothedDistance === null ? currentDistance : this.smoothedDistance + (currentDistance - this.smoothedDistance) * SMOOTHING;
      if (this.zoomBaselineDistance === null) {
        this.zoomBaselineDistance = this.smoothedDistance;
        this.onZoom?.(0, true);
      }
      const distanceDelta = this.smoothedDistance - this.zoomBaselineDistance;
      this.onDebug?.({ camera: "ACTIVE", video: `${this.video.videoWidth}x${this.video.videoHeight}`, mediapipe: "READY", hands: 2, leftPinch: "YES", rightPinch: "YES", gesture: "TWO_HAND_PINCH", control: this.zoomStarted ? "ZOOM" : "PINCH READY", distance: this.smoothedDistance.toFixed(2), baseline: this.zoomBaselineDistance.toFixed(2), delta: distanceDelta.toFixed(3) });
      if (Math.abs(distanceDelta) > 0.002) {
        this.zoomStarted = true;
        this.onZoom?.(distanceDelta, false);
      }
      this.lastDistance = this.smoothedDistance;
      this.lastPoint = null;
      this.smoothedPoint = null;
      return;
    }
    this.onDebug?.({ camera: "ACTIVE", video: `${this.video.videoWidth}x${this.video.videoHeight}`, mediapipe: "READY", hands: hands.length, leftPinch: leftPinch ? "YES" : "NO", rightPinch: rightPinch ? "YES" : "NO", gesture: hands.length === 2 ? "TWO_HANDS" : hands.length ? "ONE_HAND" : "NO_HANDS", control: "NONE" });
    this.lastPoint = null;
    this.smoothedPoint = null;
    this.lastDistance = null;
    this.smoothedDistance = null;
    this.zoomBaselineDistance = null;
    this.zoomStarted = false;
  }

  stop({ notify = true } = {}) {
    this.startToken += 1;
    this.running = false;
    if (this.frameRequest) cancelAnimationFrame(this.frameRequest);
    this.landmarker?.close?.();
    this.landmarker = null;
    this.video?.pause?.();
    this.video?.remove();
    this.video = null;
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    this.detectorsBySide.forEach((detector) => detector.reset());
    this.detectorsBySide.clear();
    this.lastPoint = null;
    this.smoothedPoint = null;
    this.lastDistance = null;
    this.smoothedDistance = null;
    this.zoomBaselineDistance = null;
    this.zoomStarted = false;
    if (notify) this.onStatus?.("disabled");
  }
}
