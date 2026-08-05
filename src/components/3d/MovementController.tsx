"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useAvatarStore } from "@/store/avatarStore";
import { useAnimationStore } from "@/store/animationStore";

const FLOOR_RADIUS = 4.5;
const MOVE_SPEED: Record<string, number> = {
  walk: 1.1,
  run: 2.4,
  walkToward: 1.1,
  walkAway: 1.1,
};

/**
 * Bounds-clamped locomotion driven by current animation id.
 */
export function MovementController() {
  const position = useAvatarStore((s) => s.position);
  const yaw = useAvatarStore((s) => s.yaw);
  const setPosition = useAvatarStore((s) => s.setPosition);
  const setYaw = useAvatarStore((s) => s.setYaw);
  const animation = useAnimationStore((s) => s.currentAnimation);
  const posRef = useRef(position);
  const yawRef = useRef(yaw);

  posRef.current = position;
  yawRef.current = yaw;

  useFrame((_, delta) => {
    const speed = MOVE_SPEED[animation];
    if (!speed) {
      if (animation === "turnLeft") {
        setYaw(yawRef.current + delta * 1.2);
      } else if (animation === "turnRight") {
        setYaw(yawRef.current - delta * 1.2);
      }
      return;
    }

    let dir = 1;
    if (animation === "walkAway") dir = -1;

    const y = yawRef.current;
    const dx = Math.sin(y) * speed * delta * dir;
    const dz = Math.cos(y) * speed * delta * dir;
    let [x, , z] = posRef.current;
    const py = posRef.current[1];
    x += dx;
    z += dz;

    const dist = Math.hypot(x, z);
    if (dist > FLOOR_RADIUS) {
      const s = FLOOR_RADIUS / dist;
      x *= s;
      z *= s;
    }

    // Keep away from default camera (~z=4)
    if (z > 3.2) z = 3.2;

    setPosition([x, py, z]);
  });

  return null;
}
