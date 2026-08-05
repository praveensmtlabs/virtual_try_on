import type { BodyShapeId } from "./body";

export type AvatarId = "adult-male" | "adult-female" | "boy" | "girl";

export type SkeletonProfile =
  | "adult-male"
  | "adult-female"
  | "child-male"
  | "child-female";

export interface AvatarDefinition {
  id: AvatarId;
  name: string;
  category: "adult" | "child";
  gender: "male" | "female";
  modelPath: string;
  thumbnail: string;
  supportedBodyShapes: BodyShapeId[];
  skeletonProfile: SkeletonProfile;
  /** Relative height scale for procedural placeholders */
  heightScale: number;
}
