import type { BodyPart } from "@/types/clothing";
import type { ClothingItem } from "@/types/clothing";
import type { Mesh, Object3D } from "three";

/** Union of body parts that should be hidden for the equipped garments. */
export function resolveHiddenBodyParts(
  garments: Array<ClothingItem | undefined | null>,
): Set<BodyPart> {
  const hidden = new Set<BodyPart>();
  for (const item of garments) {
    if (!item) continue;
    for (const part of item.hiddenBodyParts) {
      hidden.add(part);
    }
  }
  return hidden;
}

/** Map body-part ids to procedural mesh / bone group names on the avatar. */
export const BODY_PART_MESH_MAP: Record<BodyPart, string[]> = {
  head: ["Head"],
  neck: ["Neck", "NeckMesh"],
  chest: ["ChestMesh"],
  back: ["ChestMesh"],
  upperArms: ["UpperArmLMesh", "UpperArmRMesh"],
  forearms: ["ForeArmLMesh", "ForeArmRMesh"],
  hands: ["HandL", "HandR"],
  hips: ["HipsMesh"],
  upperLegs: ["UpperLegLMesh", "UpperLegRMesh"],
  lowerLegs: ["LowerLegLMesh", "LowerLegRMesh"],
  feet: ["FootL", "FootR"],
};

const FACE_KEEP =
  /eye|teeth|tooth|brows|lash|hair|caruncula|head(?!phone)|face|tongue|mouth|iris|pupil|cornea|eyelid|earlobe/i;

/**
 * True if mesh is a single full-body skin that cannot be partially hidden.
 * Covers: Ch36 mannequin, Tripo/user-uploaded realistic avatars.
 */
export function isFullBodyMesh(name: string): boolean {
  return /MocapGuy_Body|Boy01_Body|Beta_Surface|Peasant_Man|body_geo|^body$|^Ch36$|^ch36$/i.test(
    name,
  ) || /^(?:body|mesh|skin|avatar|character|man|male|human|figure)[\s_\-.]?(?:body|mesh|skin|geo|surface|0+)?$/i.test(name);
}

/**
 * Detect if a mesh from a realistic/Tripo-style avatar should be hidden
 * for a given body part. These avatars often have single combined meshes
 * named "body", "Body_mesh", etc.
 */
export function isRealisticBodyMesh(name: string): boolean {
  return /body|torso|trunk|skin|mesh/i.test(name) && !/eye|hair|teeth|brow|lash/i.test(name);
}

/** Whether a skinned mesh name should be treated as covering a body part. */
export function meshImpliesBodyPart(meshName: string, part: BodyPart): boolean {
  if (FACE_KEEP.test(meshName)) return false;
  const n = meshName.toLowerCase();

  switch (part) {
    case "head":
      return /head/.test(n) && !/headphone/.test(n);
    case "neck":
      return /neck/.test(n);
    case "chest":
    case "back":
      return /chest|torso|upperbody|upper_body|trunk|body/.test(n);
    case "upperArms":
      return /upperarm|upper_arm|shoulder/.test(n);
    case "forearms":
      return /forearm|lowerarm|lower_arm/.test(n);
    case "hands":
      return /hand|finger|wrist/.test(n);
    case "hips":
      return /hip|pelvis|lowerbody|lower_body/.test(n);
    case "upperLegs":
      return /upleg|upperleg|thigh/.test(n);
    case "lowerLegs":
      return /lowerleg|shin|calf/.test(n);
    case "feet":
      return /foot|feet|shoe|toe/.test(n);
    default:
      return false;
  }
}

/**
 * Hide segmented body meshes covered by clothes. Full-body skins stay visible
 * (body inset handles poke-through). Face / eyes always kept.
 *
 * For realistic single-mesh avatars (Tripo etc.) we cannot hide individual
 * body regions — those stay visible and rely on the 0.96 bodyInset in
 * AvatarModel to reduce clipping.
 */
export function applyBodyPartVisibility(
  root: Object3D,
  hiddenParts: Set<BodyPart>,
): void {
  root.traverse((obj) => {
    const mesh = obj as Mesh;
    if (!mesh.isMesh) return;
    const name = mesh.name || "";
    if (FACE_KEEP.test(name)) {
      mesh.visible = true;
      return;
    }
    if (hiddenParts.size === 0) {
      mesh.visible = true;
      return;
    }
    if (isFullBodyMesh(name)) {
      mesh.visible = true;
      return;
    }
    let hide = false;
    for (const part of hiddenParts) {
      if (meshImpliesBodyPart(name, part)) {
        hide = true;
        break;
      }
    }
    mesh.visible = !hide;
  });
}
