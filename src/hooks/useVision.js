import { useCallback, useEffect, useRef, useState } from "react";

import { analyzeVision } from "../services/api";

const INITIAL_STATE = "idle";

function cameraError(error) {
  if (error?.name === "NotAllowedError" || error?.name === "SecurityError") {
    return "Camera access was denied. Enable camera permission in your browser settings and try again.";
  }
  if (error?.name === "NotFoundError" || error?.name === "DevicesNotFoundError") {
    return "No camera device was detected.";
  }
  if (error?.name === "NotReadableError" || error?.name === "TrackStartError") {
    return "The camera is already in use or unavailable.";
  }
  return "Vision could not access the camera. Try again.";
}

export function useVision() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [state, setState] = useState(INITIAL_STATE);
  const [snapshot, setSnapshot] = useState(null);
  const [analysis, setAnalysis] = useState("");
  const [error, setError] = useState("");

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const openVision = useCallback(() => {
    setIsOpen(true);
    setState(INITIAL_STATE);
    setSnapshot(null);
    setAnalysis("");
    setError("");
  }, []);

  const closeVision = useCallback(() => {
    stopCamera();
    setIsOpen(false);
    setState(INITIAL_STATE);
    setSnapshot(null);
    setAnalysis("");
    setError("");
  }, [stopCamera]);

  const enableCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setState("error");
      setError("Camera access is not supported in this browser.");
      return;
    }

    setState("requesting");
    setError("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });
      stopCamera();
      streamRef.current = stream;
      setState("active");
    } catch (cameraAccessError) {
      setState(cameraAccessError?.name === "NotAllowedError" ? "denied" : "error");
      setError(cameraError(cameraAccessError));
    }
  }, [stopCamera]);

  useEffect(() => {
    if (!videoRef.current || !streamRef.current) return;
    videoRef.current.srcObject = streamRef.current;
    void videoRef.current.play().catch(() => {});
  }, [state]);

  const capture = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      setState("error");
      setError("The camera frame is not ready yet. Try again.");
      return;
    }

    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 1280 / video.videoWidth);
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const context = canvas.getContext("2d");
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    setSnapshot(canvas.toDataURL("image/jpeg", 0.82));
    setAnalysis("");
    setError("");
    setState("captured");
  }, []);

  const retake = useCallback(() => {
    setSnapshot(null);
    setAnalysis("");
    setError("");
    setState("active");
  }, []);

  const analyze = useCallback(async (prompt) => {
    if (!snapshot) return null;

    setState("analyzing");
    setError("");

    try {
      const result = await analyzeVision(snapshot, prompt);
      setAnalysis(result.analysis || "Vision returned no analysis.");
      setState("result");
      return result;
    } catch (analysisError) {
      setState("error");
      const message = analysisError.message || "";
      setError(message.includes("503")
        ? "Vision is currently unavailable because no configured AI provider supports image analysis."
        : "Vision analysis failed. Try again.");
      return null;
    }
  }, [snapshot]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  return {
    isOpen,
    state,
    snapshot,
    analysis,
    error,
    videoRef,
    openVision,
    closeVision,
    enableCamera,
    capture,
    retake,
    analyze,
    hasSnapshot: Boolean(snapshot),
    isCameraActive: state === "active" || state === "captured" || state === "analyzing" || state === "result",
    isAnalyzing: state === "analyzing",
  };
}
