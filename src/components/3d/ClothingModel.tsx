"use client";

import { Suspense, useLayoutEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { SkeletonUtils } from "three-stdlib";
import type { ClothingItem } from "@/types/clothing";
import type { BoneMap } from "@/components/3d/AvatarModel";
import { useAvatarFit } from "@/components/3d/AvatarFitContext";
import { getMediaUrl } from "@/utils/media";
import {
  computeGarmentFit,
  measureLocalBox,
} from "@/utils/garmentFit";

interface ClothingModelProps {
  item: ClothingItem;
  bones: BoneMap;
}

const _world = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _scale = new THREE.Vector3();
const _euler = new THREE.Euler();
const _inv = new THREE.Matrix4();
const _mat = new THREE.Matrix4();
const _size = new THREE.Vector3();

function normalizeBoneName(name: string): string {
  return name
    .replace(/^mixamorig\d*:?/i, "")
    .replace(/^:/, "")
    .replace(/_\d+$/g, "");
}

function attachBone(bones: BoneMap, category: ClothingItem["category"]) {
  if (category === "pants") return bones.Hips ?? bones.hips ?? null;
  return (
    bones.Chest ??
    bones.Spine2 ??
    bones.Spine1 ??
    bones.Spine ??
    bones.Hips ??
    null
  );
}

/**
 * Rebind garment meshes onto the avatar skeleton.
 * Mixamo avatar bones are often cm-scaled (armature ×0.01); garments exported
 * from Blender are meter-scaled — copying bone locals breaks alignment.
 * Binding to the avatar skeleton keeps one shared deformer.
 */
function bindGarmentToAvatarSkeleton(
  garmentRoot: THREE.Object3D,
  avatarSkeleton: THREE.Skeleton,
) {
  const avatarIndex = new Map<string, number>();
  avatarSkeleton.bones.forEach((b, i) => {
    avatarIndex.set(b.name, i);
    avatarIndex.set(normalizeBoneName(b.name), i);
  });

  garmentRoot.traverse((obj) => {
    const mesh = obj as THREE.SkinnedMesh;
    if (!mesh.isSkinnedMesh || !mesh.skeleton || !mesh.geometry) return;

    const remap = mesh.skeleton.bones.map((b) => {
      return (
        avatarIndex.get(b.name) ??
        avatarIndex.get(normalizeBoneName(b.name)) ??
        0
      );
    });

    const needsRemap = remap.some((v, i) => v !== i);
    const skinIndex = mesh.geometry.getAttribute("skinIndex");
    if (needsRemap && skinIndex && "getComponent" in skinIndex) {
      const attr = skinIndex as THREE.BufferAttribute;
      for (let i = 0; i < attr.count; i++) {
        for (let j = 0; j < Math.min(4, attr.itemSize); j++) {
          const oldIdx = Math.round(attr.getComponent(i, j));
          attr.setComponent(i, j, remap[oldIdx] ?? 0);
        }
      }
      attr.needsUpdate = true;
    }

    // Use avatar inverse-binds so deform matches the body exactly.
    mesh.bind(avatarSkeleton, mesh.bindMatrix);
    mesh.bindMode = "attached";
    mesh.frustumCulled = false;
  });

  // Hide unused garment armature visuals if any
  garmentRoot.traverse((obj) => {
    if (/^(Camera|Lamp|Light)/i.test(obj.name)) obj.visible = false;
  });
}

function GlbClothing({
  url,
  category,
  fitScale = 1,
  fitScaleXZ = 1,
  groupRef,
  yOff,
  bones,
  skinned = false,
}: {
  url: string;
  category: ClothingItem["category"];
  fitScale?: number;
  fitScaleXZ?: number;
  groupRef: RefObject<THREE.Group | null>;
  yOff: number;
  bones: BoneMap;
  skinned?: boolean;
}) {
  const gltf = useGLTF(url);
  const fit = useAvatarFit();
  const boundRef = useRef(false);

  const meshRoot = useMemo(() => {
    const cloned = SkeletonUtils.clone(gltf.scene) as THREE.Group;
    cloned.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.frustumCulled = false;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const m of mats) {
        const std = m as THREE.MeshStandardMaterial;
        if (std.map) std.map.colorSpace = THREE.SRGBColorSpace;
        std.transparent = false;
        std.opacity = 1;
        std.depthWrite = true;
        std.side = THREE.DoubleSide;
        std.needsUpdate = true;
      }
    });
    return cloned;
  }, [gltf.scene]);

  const hasSkinnedMesh = useMemo(() => {
    let found = false;
    meshRoot.traverse((o) => {
      if ((o as THREE.SkinnedMesh).isSkinnedMesh) found = true;
    });
    return found;
  }, [meshRoot]);

  const useSkinned = Boolean(
    skinned && hasSkinnedMesh && fit.isMixamo && fit.skeleton,
  );

  const placedRef = useRef(new THREE.Vector3());

  useLayoutEffect(() => {
    meshRoot.position.set(0, 0, 0);
    meshRoot.rotation.set(0, 0, 0);
    meshRoot.scale.set(1, 1, 1);
    meshRoot.updateMatrixWorld(true);
    boundRef.current = false;

    const g = groupRef.current;

    if (useSkinned && fit.skeleton) {
      bindGarmentToAvatarSkeleton(meshRoot, fit.skeleton);
      boundRef.current = true;
      if (g) {
        g.position.set(0, yOff, 0);
        g.rotation.set(0, 0, 0);
        g.scale.set(fitScale, fitScale, fitScale);
      }
      return;
    }

    const box = measureLocalBox(meshRoot);
    box.getSize(_size);
    if (!Number.isFinite(_size.y) || _size.y < 1e-4 || box.isEmpty()) return;

    const targets = computeGarmentFit(fit, category, _size.clone(), box.clone(), {
      fitScale,
      fitScaleXZ,
    });

    meshRoot.scale.set(targets.scaleX, targets.scaleY, targets.scaleZ);
    meshRoot.position.copy(targets.meshOffset);

    placedRef.current.set(
      targets.groupPosition.x,
      targets.groupPosition.y + yOff,
      targets.groupPosition.z,
    );

    if (g && !fit.isMixamo) {
      g.rotation.set(0, 0, 0);
      g.position.copy(placedRef.current);
    }
  }, [
    meshRoot,
    fit,
    category,
    fitScale,
    fitScaleXZ,
    groupRef,
    yOff,
    useSkinned,
  ]);

  useFrame(() => {
    const g = groupRef.current;
    if (!g) return;

    if (useSkinned) {
      if (!boundRef.current && fit.skeleton) {
        bindGarmentToAvatarSkeleton(meshRoot, fit.skeleton);
        boundRef.current = true;
      }
      g.position.set(0, yOff, 0);
      g.rotation.set(0, 0, 0);
      return;
    }

    const bone = fit.isMixamo ? attachBone(bones, category) : null;
    const parent = g.parent;

    if (bone && parent && category !== "pants") {
      bone.updateWorldMatrix(true, false);
      parent.updateWorldMatrix(true, false);
      _inv.copy(parent.matrixWorld).invert();
      _mat.multiplyMatrices(_inv, bone.matrixWorld);
      _mat.decompose(_world, _quat, _scale);
      if (
        Number.isFinite(_world.y) &&
        Math.abs(_world.y) < 40 &&
        Math.abs(_world.x) < 40
      ) {
        _euler.setFromQuaternion(_quat, "YXZ");
        g.rotation.set(0, _euler.y, 0);
        g.position.set(
          _world.x,
          _world.y - fit.localBodyHeight * 0.04 + yOff,
          _world.z,
        );
        return;
      }
    }

    g.rotation.set(0, 0, 0);
    g.position.copy(placedRef.current);
  });

  return <primitive object={meshRoot} />;
}

export function ClothingModel({ item, bones }: ClothingModelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const yOff = item.yOffset ?? 0;
  const url =
    item.useGlb && item.modelPath ? getMediaUrl(item.modelPath) : null;

  if (!url) return null;

  return (
    <group ref={groupRef}>
      <Suspense fallback={null}>
        <GlbClothing
          url={url}
          category={item.category}
          fitScale={item.fitScale ?? 1}
          fitScaleXZ={item.fitScaleXZ ?? 1}
          groupRef={groupRef}
          yOff={yOff}
          bones={bones}
          skinned={item.skinned}
        />
      </Suspense>
    </group>
  );
}
