import { create } from "zustand";
import type { AvatarId } from "@/types/avatar";
import type { BodyShapeId, BodyMeasurements } from "@/types/body";
import { DEFAULT_MEASUREMENTS } from "@/types/body";

interface AvatarState {
  selectedAvatarId: AvatarId;
  bodyShape: BodyShapeId;
  measurements: BodyMeasurements;
  position: [number, number, number];
  yaw: number;
  setAvatar: (id: AvatarId) => void;
  setBodyShape: (shape: BodyShapeId) => void;
  setMeasurements: (m: Partial<BodyMeasurements>) => void;
  setPosition: (pos: [number, number, number]) => void;
  setYaw: (yaw: number) => void;
  rotateBy: (delta: number) => void;
  resetPose: () => void;
}

export const useAvatarStore = create<AvatarState>((set, get) => ({
  selectedAvatarId: "adult-male",
  bodyShape: "average",
  measurements: DEFAULT_MEASUREMENTS.average,
  position: [0, 0, 0],
  yaw: 0,
  setAvatar: (id) => set({ selectedAvatarId: id, position: [0, 0, 0], yaw: 0 }),
  setBodyShape: (shape) =>
    set({ bodyShape: shape, measurements: DEFAULT_MEASUREMENTS[shape] }),
  setMeasurements: (m) =>
    set({ measurements: { ...get().measurements, ...m } }),
  setPosition: (position) => set({ position }),
  setYaw: (yaw) => set({ yaw }),
  rotateBy: (delta) => set({ yaw: get().yaw + delta }),
  resetPose: () => set({ position: [0, 0, 0], yaw: 0 }),
}));
