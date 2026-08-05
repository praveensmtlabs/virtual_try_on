import * as THREE from "three";
import type { ClothingCategory } from "@/types/clothing";
import type { AvatarFit } from "@/components/3d/AvatarFitContext";

/**
 * Measurement-driven fit for real product garment GLBs.
 * Height-led uniform scale preserves garment shape; anchor to neck/hips.
 */
export type GarmentFitTargets = {
  scale: number;
  scaleX: number;
  scaleY: number;
  scaleZ: number;
  meshOffset: THREE.Vector3;
  groupPosition: THREE.Vector3;
};

// How much of body height each garment category should occupy
const REGION_HEIGHT: Record<ClothingCategory, number> = {
  pants: 0.54,
  shirt: 0.40,
  coat:  0.48,
};

// Width multiplier relative to torso width
const REGION_WIDTH: Record<ClothingCategory, number> = {
  pants: 1.12,
  shirt: 1.18,
  coat:  1.22,
};

// Vertical anchor as fraction of body height from feet
const ANCHOR_Y: Record<ClothingCategory, number> = {
  pants: 0,
  shirt: 0.56,
  coat:  0.58,
};

// Z bias to push garment slightly forward of body center
const Z_BIAS: Record<ClothingCategory, number> = {
  pants: 0,
  shirt: 0.04,
  coat:  0.05,
};

const _tempBox = new THREE.Box3();
const _tempMat = new THREE.Matrix4();
const _rootInv = new THREE.Matrix4();

/** AABB of `root` in its own local space (ignores parent scale/position). */
export function measureLocalBox(root: THREE.Object3D): THREE.Box3 {
  root.updateWorldMatrix(true, true);
  _rootInv.copy(root.matrixWorld).invert();

  const box = new THREE.Box3();
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh || !mesh.geometry) return;
    const geom = mesh.geometry;
    if (!geom.boundingBox) geom.computeBoundingBox();
    if (!geom.boundingBox || geom.boundingBox.isEmpty()) return;
    _tempBox.copy(geom.boundingBox);
    _tempMat.multiplyMatrices(_rootInv, mesh.matrixWorld);
    _tempBox.applyMatrix4(_tempMat);
    box.union(_tempBox);
  });
  return box;
}

export function garmentGroupPosition(
  fit: AvatarFit,
  category: ClothingCategory,
  yOff = 0,
): THREE.Vector3 {
  const h = Math.max(fit.localBodyHeight, 0.5);
  return new THREE.Vector3(
    fit.localCenterX,
    fit.localMinY + h * ANCHOR_Y[category] + yOff,
    fit.localCenterZ + fit.torsoDepth * Z_BIAS[category],
  );
}

export function computeGarmentFit(
  fit: AvatarFit,
  category: ClothingCategory,
  garmentSize: THREE.Vector3,
  garmentBox: THREE.Box3,
  extras?: { fitScale?: number; fitScaleXZ?: number },
): GarmentFitTargets {
  const fitScale = extras?.fitScale ?? 1;
  const fitScaleXZ = extras?.fitScaleXZ ?? 1;

  const bodyH = Math.max(fit.localBodyHeight, 0.5);
  const torsoW = Math.max(fit.torsoWidth, bodyH * 0.28);
  const torsoD = Math.max(fit.torsoDepth, bodyH * 0.16);

  const widthFactor =
    category === "pants"
      ? fit.hips
      : category === "coat"
        ? (fit.chest + fit.shoulders) * 0.5
        : fit.chest;

  const targetH = bodyH * REGION_HEIGHT[category] * fitScale;
  const targetW = torsoW * REGION_WIDTH[category] * widthFactor * fitScaleXZ;
  const targetD =
    torsoD *
    (category === "coat" ? 1.15 : category === "pants" ? 1.1 : 1.1) *
    fitScaleXZ;

  const rawH = Math.max(garmentSize.y, 1e-4);
  const rawW = Math.max(garmentSize.x, 1e-4);
  const rawD = Math.max(garmentSize.z, 1e-4);

  // Height-primary scale; clamp X/Z to stay proportional
  const scaleY = targetH / rawH;
  const scaleX = targetW / rawW;
  const scaleZ = targetD / rawD;

  // Uniform base driven by height; allow mild XZ variation to match body
  const s = THREE.MathUtils.clamp(
    scaleY,
    Math.min(scaleX, scaleZ) * 0.88,
    Math.max(scaleX, scaleZ) * 1.15,
  );
  const sX = THREE.MathUtils.clamp(scaleX, s * 0.90, s * 1.14);
  const sY = s;
  const sZ = THREE.MathUtils.clamp(scaleZ, s * 0.90, s * 1.14);

  const center = new THREE.Vector3();
  garmentBox.getCenter(center);

  const meshOffset = new THREE.Vector3(
    -center.x * sX,
    category === "pants" ? -garmentBox.min.y * sY : -center.y * sY,
    -center.z * sZ,
  );

  let groupPosition = garmentGroupPosition(fit, category);
  if (category === "coat" || category === "shirt") {
    // Anchor top of garment to neck position on the avatar
    const neckY =
      fit.localMinY + bodyH * (category === "coat" ? 0.84 : 0.82);
    const topInGroup = (garmentBox.max.y - center.y) * sY;
    groupPosition = new THREE.Vector3(
      fit.localCenterX,
      neckY - topInGroup,
      fit.localCenterZ + fit.torsoDepth * Z_BIAS[category],
    );
  }

  return {
    scale: sY,
    scaleX: sX,
    scaleY: sY,
    scaleZ: sZ,
    meshOffset,
    groupPosition,
  };
}
