import { ANIMATIONS } from "@/data/animations";
import type { AnimationService } from "@/services/interfaces/animationService";

export const mockAnimationService: AnimationService = {
  async list() {
    return ANIMATIONS;
  },
  async listForAvatar() {
    // All avatars share the same clip set in Phase 1 placeholders.
    return ANIMATIONS;
  },
};
