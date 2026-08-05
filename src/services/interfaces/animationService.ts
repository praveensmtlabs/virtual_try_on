import type { AvatarId } from "@/types/avatar";
import type { AnimationClipDef } from "@/types/animation";

export interface AnimationService {
  list(): Promise<AnimationClipDef[]>;
  listForAvatar(avatarId: AvatarId): Promise<AnimationClipDef[]>;
}
