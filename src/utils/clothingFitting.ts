import type { BodyShapeId, BodyMeasurements } from "@/types/body";
import { DEFAULT_MEASUREMENTS } from "@/types/body";
import type { ClothingItem } from "@/types/clothing";
import type * as THREE from "three";

/**
 * Resolve morph-target influences for a garment given body shape.
 * Does NOT use uniform scale as the primary fit method.
 * Requires authored morph targets on the garment mesh.
 */
export function resolveMorphWeights(
  item: ClothingItem,
  shapeId: BodyShapeId,
): Record<string, number> {
  const weights: Record<string, number> = {};
  const morphs = item.morphTargets;
  if (!morphs) return weights;

  for (const [shape, morphName] of Object.entries(morphs)) {
    if (!morphName) continue;
    weights[morphName] = shape === shapeId ? 1 : 0;
  }
  return weights;
}

/** Apply morph weights to a mesh if morphTargetDictionary exists. */
export function applyMorphWeights(
  mesh: THREE.Mesh,
  weights: Record<string, number>,
): void {
  const dict = mesh.morphTargetDictionary;
  const influences = mesh.morphTargetInfluences;
  if (!dict || !influences) return;

  for (const [name, value] of Object.entries(weights)) {
    const index = dict[name];
    if (index === undefined) continue;
    influences[index] = value;
  }
}

/**
 * Soft measurement-driven limb scaling for PLACEHOLDER avatars only.
 * Production GLBs should use morph targets / skinned deformation instead.
 */
export function measurementScaleFactors(
  measurements: BodyMeasurements,
  shapeId: BodyShapeId = "average",
): {
  chest: number;
  waist: number;
  hips: number;
  shoulders: number;
  arms: number;
  legs: number;
  height: number;
} {
  const base = DEFAULT_MEASUREMENTS.average;
  void shapeId;
  return {
    chest: measurements.chest / base.chest,
    waist: measurements.waist / base.waist,
    hips: measurements.hips / base.hips,
    shoulders: measurements.shoulderWidth / base.shoulderWidth,
    arms: measurements.armSize / base.armSize,
    legs: measurements.legSize / base.legSize,
    height: measurements.height / base.height,
  };
}
