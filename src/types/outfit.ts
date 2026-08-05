import type { AvatarId } from "./avatar";
import type { BodyShapeId } from "./body";
import type { EquippedClothing } from "./clothing";

export interface Outfit {
  id: string;
  name: string;
  avatarId: AvatarId;
  clothing: EquippedClothing;
}

export interface SavedLook {
  id: string;
  name: string;
  avatarId: AvatarId;
  bodyShape: BodyShapeId;
  clothing: EquippedClothing;
  createdAt: number;
  updatedAt: number;
}
