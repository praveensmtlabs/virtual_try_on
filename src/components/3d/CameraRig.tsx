"use client";

import { useEffect, useRef } from "react";
import { OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { useViewerStore } from "@/store/viewerStore";

export function CameraRig() {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const cameraResetNonce = useViewerStore((s) => s.cameraResetNonce);

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    controls.reset();
    controls.target.set(0, 0.95, 0);
    controls.update();
  }, [cameraResetNonce]);

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      target={[0, 0.95, 0]}
      minDistance={1.2}
      maxDistance={5}
      minPolarAngle={0.2}
      maxPolarAngle={Math.PI / 2 - 0.05}
      maxAzimuthAngle={Infinity}
      minAzimuthAngle={-Infinity}
      enablePan
      panSpeed={0.5}
      rotateSpeed={0.65}
      zoomSpeed={0.7}
    />
  );
}
