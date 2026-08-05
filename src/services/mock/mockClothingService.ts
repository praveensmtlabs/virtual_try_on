import { CLOTHING } from "@/data/clothing";
import type { AvatarId } from "@/types/avatar";
import type { ClothingCategory } from "@/types/clothing";
import type { ClothingService } from "@/services/interfaces/clothingService";

export const mockClothingService: ClothingService = {
  async list() {
    return CLOTHING;
  },
  async listByAvatar(avatarId: AvatarId) {
    return CLOTHING.filter((c) => c.compatibleAvatars.includes(avatarId));
  },
  async listByAvatarAndCategory(avatarId: AvatarId, category: ClothingCategory) {
    return CLOTHING.filter(
      (c) => c.compatibleAvatars.includes(avatarId) && c.category === category,
    );
  },
  async get(id: string) {
    return CLOTHING.find((c) => c.id === id);
  },
};
