import { mockAvatarService } from "@/services/mock/mockAvatarService";
import { mockClothingService } from "@/services/mock/mockClothingService";
import { mockOutfitService } from "@/services/mock/mockOutfitService";
import { mockAnimationService } from "@/services/mock/mockAnimationService";
import { mockMediaService } from "@/services/mock/mockMediaService";

/**
 * Service locator for Phase 1 mock implementations.
 * Replace exports with Api* services when the backend is ready —
 * UI components should import from here, never from /data directly.
 */
export const avatarService = mockAvatarService;
export const clothingService = mockClothingService;
export const outfitService = mockOutfitService;
export const animationService = mockAnimationService;
export const mediaService = mockMediaService;
