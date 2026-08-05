import { AVATARS } from "@/data/avatars";
import type { AvatarId } from "@/types/avatar";
import type { AvatarService } from "@/services/interfaces/avatarService";

export const mockAvatarService: AvatarService = {
  async list() {
    return AVATARS;
  },
  async get(id: AvatarId) {
    return AVATARS.find((a) => a.id === id);
  },
};
