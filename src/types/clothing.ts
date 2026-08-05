import type { AvatarId, SkeletonProfile } from "./avatar";
import type { BodyShapeId } from "./body";

export type ClothingCategory = "coat" | "shirt" | "pants";

export type BodyPart =
  | "head"
  | "neck"
  | "chest"
  | "back"
  | "upperArms"
  | "forearms"
  | "hands"
  | "hips"
  | "upperLegs"
  | "lowerLegs"
  | "feet";

export interface ClothingItem {
  id: string;
  name: string;
  category: ClothingCategory;
  modelPath: string;
  thumbnail: string;
  compatibleAvatars: AvatarId[];
  hiddenBodyParts: BodyPart[];
  morphTargets?: Partial<Record<BodyShapeId, string>>;
  skeletonProfile: SkeletonProfile;
  color: string;
  /** When true, load modelPath as a fitted GLB (static or skinned overlay). */
  useGlb?: boolean;
  /** Extra uniform / height scale after auto-fit (1 = default). */
  fitScale?: number;
  /** Extra XZ (width/depth) scale for bulky static outfits (1 = default). */
  fitScaleXZ?: number;
  /** Extra Y offset in avatar-local units (positive = up). */
  yOffset?: number;
  /**
   * When true, garment shares Mixamo skeleton with the avatar —
   * bones are rebound/synced instead of AABB fit overlay.
   */
  skinned?: boolean;
}

export interface EquippedClothing {
  coatId?: string;
  shirtId?: string;
  pantsId?: string;
}
