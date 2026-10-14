import { useEffect, useRef } from "react";
import { CORE_ZOOM_MAX, CORE_ZOOM_MIN, createCoreScene } from "./coreScene";
import { HandGestureController } from "./gesture/HandGestureController";
import "./UltronCore3D.css";

function UltronCore3D({ mode = "idle", activity = "idle", gestureEnabled = false, onGestureStatus, onGestureDebug }) {
  const mountRef = useRef(null);
  const debugGestures = new URLSearchParams(window.location.search).get("debugGestures") === "true";

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    const controller = createCoreScene(mount, mode, activity);
    let rotationY = 0;
    let rotationX = 0;
    let zoom = 7.8;
    let gestureZoomStart = zoom;
    let pointer = null;
    const pointers = new Map();
    let pinchDistance = null;
    const gestures = gestureEnabled ? new HandGestureController({
      onStatus: onGestureStatus,
      onDebug: debugGestures ? onGestureDebug : undefined,
      onRotation: (deltaY, deltaX) => {
        rotationY += deltaY * 0.04;
        rotationX += deltaX * 0.04;
        controller.setRotation(rotationY, rotationX);
      },
      onZoom: (distanceDelta, starts) => {
        if (starts) gestureZoomStart = zoom;
        zoom = Math.max(CORE_ZOOM_MIN, Math.min(CORE_ZOOM_MAX, gestureZoomStart - distanceDelta * 18));
        controller.setZoom(zoom);
        onGestureDebug?.((previous) => previous ? { ...previous, zoom: zoom.toFixed(2) } : previous);
      },
    }) : null;
    gestures?.start();

    const handleResize = () => controller.resize(
      Math.max(320, mount.clientWidth || window.innerWidth),
      Math.max(320, mount.clientHeight || window.innerHeight),
    );
    const handlePointerDown = (event) => {
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
      mount.setPointerCapture?.(event.pointerId);
    };
    const handlePointerMove = (event) => {
      if (pointers.has(event.pointerId)) pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (pointers.size >= 2) {
        const [first, second] = [...pointers.values()];
        const nextDistance = Math.hypot(first.x - second.x, first.y - second.y);
        if (pinchDistance !== null) {
          zoom = Math.max(CORE_ZOOM_MIN, Math.min(CORE_ZOOM_MAX, zoom - (nextDistance - pinchDistance) * 0.012));
          controller.setZoom(zoom);
        }
        pinchDistance = nextDistance;
        return;
      }
      if (!pointer || pointer.id !== event.pointerId) return;
      rotationY += (event.clientX - pointer.x) * 0.006;
      rotationX += (event.clientY - pointer.y) * 0.004;
      pointer = { ...pointer, x: event.clientX, y: event.clientY };
      controller.setRotation(rotationY, rotationX);
    };
    const handlePointerUp = (event) => {
      pointers.delete(event.pointerId);
      pinchDistance = null;
      pointer = null;
    };
    const handleWheel = (event) => {
      event.preventDefault();
      zoom = Math.max(CORE_ZOOM_MIN, Math.min(CORE_ZOOM_MAX, zoom + event.deltaY * 0.004));
      controller.setZoom(zoom);
    };

    mount.addEventListener("pointerdown", handlePointerDown);
    mount.addEventListener("pointermove", handlePointerMove);
    mount.addEventListener("pointerup", handlePointerUp);
    mount.addEventListener("pointercancel", handlePointerUp);
    mount.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      mount.removeEventListener("pointerdown", handlePointerDown);
      mount.removeEventListener("pointermove", handlePointerMove);
      mount.removeEventListener("pointerup", handlePointerUp);
      mount.removeEventListener("pointercancel", handlePointerUp);
      mount.removeEventListener("wheel", handleWheel);
      gestures?.stop();
      controller.dispose();
    };
  }, [mode, activity, gestureEnabled, onGestureStatus, onGestureDebug, debugGestures]);

  return (
    <section className={`ultron-core-3d core-${mode || "idle"}`}>
      <div className="ultron-core-3d-wrap">
        <div className="ultron-core-3d-canvas" ref={mountRef} aria-label="ULTRON 3D core" />
      </div>
    </section>
  );
}

export default UltronCore3D;
