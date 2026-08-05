import type { AnimationClipDef } from "@/types/animation";

export const ANIMATIONS: AnimationClipDef[] = [
  {
    id: "idle",
    name: "Idle",
    loop: true,
    description: "Relaxed natural standing idle",
  },
  {
    id: "standing",
    name: "Standing",
    loop: true,
    description: "Still standing pose",
  },
  {
    id: "walk",
    name: "Walk",
    loop: true,
    description: "Forward walk cycle",
  },
  {
    id: "run",
    name: "Run",
    loop: true,
    description: "Forward run cycle",
  },
  {
    id: "turnLeft",
    name: "Turn Left",
    loop: false,
    description: "Pivot turn to the left",
  },
  {
    id: "turnRight",
    name: "Turn Right",
    loop: false,
    description: "Pivot turn to the right",
  },
  {
    id: "walkToward",
    name: "Walk Toward Camera",
    loop: true,
    description: "Walk toward the viewing camera",
  },
  {
    id: "walkAway",
    name: "Walk Away",
    loop: true,
    description: "Walk away from the camera",
  },
];
