"use client";

import { createContext, useContext } from "react";

/** Avatar mesh metrics + per-region body scales for clothing fit. */
export type AvatarFit = {
  localBodyHeight: number;
  localBodyWidth: number;
  localBodyDepth: number;
  /** Estimated torso width (ignores T-pose armspan). */
  torsoWidth: number;
  torsoDepth: number;
  localMinY: number;
  localCenterX: number;
  localCenterZ: number;
  /** Measurement scales vs average (1 = average). */
  chest: number;
  waist: number;
  hips: number;
  shoulders: number;
  arms: number;
  legs: number;
  height: number;
  isMixamo: boolean;
  /** Live avatar skeleton for rebinding skinned garments. */
  skeleton: import("three").Skeleton | null;
};

export const AvatarFitContext = createContext<AvatarFit>({
  localBodyHeight: 1.72,
  localBodyWidth: 0.45,
  localBodyDepth: 0.3,
  torsoWidth: 0.4,
  torsoDepth: 0.28,
  localMinY: 0,
  localCenterX: 0,
  localCenterZ: 0,
  chest: 1,
  waist: 1,
  hips: 1,
  shoulders: 1,
  arms: 1,
  legs: 1,
  height: 1,
  isMixamo: false,
  skeleton: null,
});

export function useAvatarFit() {
  return useContext(AvatarFitContext);
}
