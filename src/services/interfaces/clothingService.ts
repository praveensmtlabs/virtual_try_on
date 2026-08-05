import type { AvatarId } from "@/types/avatar";
import type { ClothingCategory, ClothingItem } from "@/types/clothing";

export interface ClothingService {
  list(): Promise<ClothingItem[]>;
  listByAvatar(avatarId: AvatarId): Promise<ClothingItem[]>;
  listByAvatarAndCategory(
    avatarId: AvatarId,
    category: ClothingCategory,
  ): Promise<ClothingItem[]>;
  get(id: string): Promise<ClothingItem | undefined>;
}
