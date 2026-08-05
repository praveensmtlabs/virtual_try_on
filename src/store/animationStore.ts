import { create } from "zustand";
import type { AnimationId } from "@/types/animation";

interface AnimationState {
  currentAnimation: AnimationId;
  isPlaying: boolean;
  setAnimation: (id: AnimationId) => void;
  setPlaying: (playing: boolean) => void;
}

export const useAnimationStore = create<AnimationState>((set) => ({
  currentAnimation: "idle",
  isPlaying: true,
  setAnimation: (currentAnimation) => set({ currentAnimation, isPlaying: true }),
  setPlaying: (isPlaying) => set({ isPlaying }),
}));
