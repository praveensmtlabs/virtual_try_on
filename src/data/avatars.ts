import type { AvatarDefinition } from "@/types/avatar";
import type { BodyShapeId } from "@/types/body";

const ALL_SHAPES: BodyShapeId[] = [
  "slim",
  "average",
  "athletic",
  "muscular",
  "bodybuilder",
  "plusSize",
];

export const AVATARS: AvatarDefinition[] = [
  {
    id: "adult-male",
    name: "Adult Male",
    category: "adult",
    gender: "male",
    modelPath: "/assets/characters/skeleton.fbx",
    thumbnail: "/images/avatars/adult-male.png",
    supportedBodyShapes: ALL_SHAPES,
    skeletonProfile: "adult-male",
    heightScale: 1,
  },
  {
    id: "adult-female",
    name: "Adult Female",
    category: "adult",
    gender: "female",
    modelPath: "/assets/characters/female.glb",
    thumbnail: "/images/avatars/adult-female.png",
    supportedBodyShapes: ALL_SHAPES,
    skeletonProfile: "adult-female",
    heightScale: 1,
  },
];
