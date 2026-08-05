"use client";

import { Component, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { GLTFLoader, SkeletonUtils } from "three-stdlib";
import type { AvatarDefinition } from "@/types/avatar";
import type { BodyMeasurements, BodyShapeId } from "@/types/body";
import type { BodyPart } from "@/types/clothing";
import type { AnimationId } from "@/types/animation";
import { getMediaUrl } from "@/utils/media";
import { measurementScaleFactors } from "@/utils/clothingFitting";
import { applyBodyPartVisibility } from "@/utils/bodyMasking";
import { AvatarFitContext } from "@/components/3d/AvatarFitContext";

export type BoneMap = Record<string, THREE.Object3D>;

export interface AvatarModelProps {
  avatar: AvatarDefinition;
  bodyShape: BodyShapeId;
  measurements: BodyMeasurements;
  hiddenParts: Set<BodyPart>;
  animation: AnimationId;
  position: [number, number, number];
  yaw: number;
  onBonesReady?: (bones: BoneMap) => void;
  children?: ReactNode;
}

class AvatarErrorBoundary extends Component<
  { children: ReactNode },
  { error: string | null }
> {
  state = { error: null as string | null };
  static getDerivedStateFromError(err: Error) {
    return { error: err?.message ?? String(err) };
  }
  componentDidCatch(err: unknown, info: unknown) {
    console.error("[AvatarModel] RENDER ERROR:", err, info);
  }
  render() {
    if (this.state.error) {
      console.error("[AvatarModel] Caught error, returning null:", this.state.error);
      return null;
    }
    return this.props.children;
  }
}

const TARGET_HEIGHT_M = 1.72;
const ANIM_LIBRARY_PATH = "/models/avatars/anim-library-mixamo.glb";

type FitFactors = ReturnType<typeof measurementScaleFactors>;

function findByName(map: BoneMap, pattern: RegExp): THREE.Object3D | undefined {
  for (const [k, v] of Object.entries(map)) {
    if (pattern.test(k)) return v;
  }
  return undefined;
}

/** Crawl root to build a lookup by bone name and standard Mixamo key aliases. */
export function buildBoneMap(root: THREE.Object3D): BoneMap {
  const map: BoneMap = {};
  root.traverse((obj) => {
    if ((obj as THREE.Bone).isBone || obj.type === "Bone" || /mixamorig/i.test(obj.name)) {
      const raw = obj.name;
      map[raw] = obj;
      const normalized = raw.replace(/^mixamorig\d+:?/i, "mixamorig");
      if (normalized && !map[normalized]) map[normalized] = obj;
      const stripped = normalized.replace(/^mixamorig:?/i, "").replace(/^:/, "");
      if (stripped && !map[stripped]) map[stripped] = obj;
    }
  });
  return map;
}

function findClip(clips: THREE.AnimationClip[], anim: AnimationId): THREE.AnimationClip | null {
  if (!clips.length) return null;
  const want = anim.toLowerCase();
  for (const c of clips) {
    const n = c.name.toLowerCase();
    if (n.includes(want)) return c;
  }
  if (want.includes("idle")) {
    const fallback = clips.find((c) => /idle|stay|breath|stand/i.test(c.name));
    if (fallback) return fallback;
  }
  if (want.includes("walk")) {
    const fallback = clips.find((c) => /walk|march/i.test(c.name));
    if (fallback) return fallback;
  }
  if (want.includes("run")) {
    const fallback = clips.find((c) => /run|jog|sprint/i.test(c.name));
    if (fallback) return fallback;
  }
  if (want.includes("pose") || want.includes("tpose") || want.includes("model")) {
    const fallback = clips.find((c) => /pose|t-pose|tpose|fashion|turn/i.test(c.name));
    if (fallback) return fallback;
  }
  return clips[0] ?? null;
}

function hasSafeEmbeddedClips(clips: THREE.AnimationClip[]): boolean {
  if (!clips.length) return false;
  return clips.some((c) => {
    const n = c.name.toLowerCase();
    return c.duration > 0.5 && !n.includes("armature") && !n.includes("default") && !n.includes("take") && !n.includes("layer");
  });
}

function normalizeClipTracks(clip: THREE.AnimationClip, boneMap?: BoneMap): THREE.AnimationClip {
  const cloned = clip.clone();
  cloned.tracks.forEach((t) => {
    t.name = t.name.replace(/^mixamorig\d+:?/i, "mixamorig");
  });
  cloned.tracks = cloned.tracks.filter((t) => {
    // Filter out root Hips position tracks which displace models with different coordinate spaces
    if (t.name.toLowerCase().includes("hips.position")) return false;
    if (boneMap && Object.keys(boneMap).length > 0) {
      const rawTarget = t.name.split(".")[0];
      const normTarget = rawTarget.replace(/^mixamorig\d+:?/i, "mixamorig");
      const strippedTarget = normTarget.replace(/^mixamorig:?/i, "");
      return !!boneMap[rawTarget] || !!boneMap[normTarget] || !!boneMap[strippedTarget];
    }
    return true;
  });
  return cloned;
}

function shouldHideTryOnProp(name: string): boolean {
  return /hat|helmet|visor|weapon|prop|scarf|icosphere|marker|helper|bounding/i.test(name);
}

function clampFactor(v: number): number {
  return THREE.MathUtils.clamp(v, 0.82, 1.35);
}

function setBoneXZ(bone: THREE.Object3D | undefined, xz: number, y = 1) {
  if (!bone) return;
  const s = clampFactor(xz);
  bone.scale.set(s, y, s);
}

function boneOf(map: BoneMap, ...keys: Array<string | RegExp>): THREE.Object3D | undefined {
  for (const k of keys) {
    if (typeof k === "string") {
      if (map[k]) return map[k];
    } else {
      const found = findByName(map, k);
      if (found) return found;
    }
  }
  return undefined;
}

function applyRegionalBoneScales(map: BoneMap, f: FitFactors) {
  const chest = clampFactor(f.chest);
  const waist = clampFactor(f.waist);
  const hips = clampFactor(f.hips);
  const shoulders = clampFactor(f.shoulders);
  const arms = clampFactor(f.arms);
  const legs = clampFactor(f.legs);
  const torso = (chest + waist) * 0.5;

  setBoneXZ(boneOf(map, "Spine2", "Spine02", /Spine2/i), chest);
  setBoneXZ(boneOf(map, "Spine1", "Spine01", /Spine1/i), torso);
  setBoneXZ(boneOf(map, "Spine", /^Spine$/i), waist);
  setBoneXZ(boneOf(map, "Hips", "hips", /Hips/i), hips);

  setBoneXZ(boneOf(map, "LeftShoulder", /LeftShoulder/i), shoulders);
  setBoneXZ(boneOf(map, "RightShoulder", /RightShoulder/i), shoulders);
  setBoneXZ(boneOf(map, "LeftArm", /LeftArm(?!ature)/i), arms);
  setBoneXZ(boneOf(map, "RightArm", /RightArm(?!ature)/i), arms);
  setBoneXZ(boneOf(map, "LeftForeArm", /LeftForeArm/i), arms);
  setBoneXZ(boneOf(map, "RightForeArm", /RightForeArm/i), arms);

  setBoneXZ(boneOf(map, "LeftUpLeg", "UpLeg.L", /LeftUpLeg|UpLeg\.L/i), legs);
  setBoneXZ(boneOf(map, "RightUpLeg", "UpLeg.R", /RightUpLeg|UpLeg\.R/i), legs);
  setBoneXZ(boneOf(map, "LeftLeg", "Leg.L", /LeftLeg(?!acy)|Leg\.L/i), legs);
  setBoneXZ(boneOf(map, "RightLeg", "Leg.R", /RightLeg|Leg\.R/i), legs);
}

function prepareClonedScene(source: THREE.Object3D): THREE.Group {
  const cloned = SkeletonUtils.clone(source) as THREE.Group;

  cloned.traverse((obj) => {
    if (obj.name && /^mixamorig\d+:?/i.test(obj.name)) {
      obj.name = obj.name.replace(/^mixamorig\d+:?/i, "mixamorig");
    }

    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    mesh.visible = !shouldHideTryOnProp(mesh.name);

    if (mesh.material) {
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      const newMats = mats.map((m) => {
        const std = m as THREE.MeshStandardMaterial;
        if (std.map) {
          const clonedMat = std.clone();
          clonedMat.map!.colorSpace = THREE.SRGBColorSpace;
          clonedMat.side = THREE.DoubleSide;
          clonedMat.needsUpdate = true;
          return clonedMat;
        } else {
          return new THREE.MeshStandardMaterial({
            color: new THREE.Color("#d4a373"),
            roughness: 0.65,
            metalness: 0.05,
            side: THREE.DoubleSide,
          });
        }
      });
      mesh.material = newMats.length === 1 ? newMats[0] : newMats;
    }
  });
  cloned.updateMatrixWorld(true);
  return cloned;
}

function fitToStudioHeight(root: THREE.Object3D): {
  scale: number;
  xOffset: number;
  yOffset: number;
  zOffset: number;
  localHeight: number;
  localWidth: number;
  localDepth: number;
  torsoWidth: number;
  torsoDepth: number;
  localMinY: number;
  localCenterX: number;
  localCenterZ: number;
} {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3();
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    if (shouldHideTryOnProp(mesh.name)) return;
    box.expandByObject(mesh);
  });
  if (box.isEmpty()) {
    box.setFromObject(root);
  }
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  const height = size.y;
  if (!Number.isFinite(height) || height < 0.05 || height > 50) {
    return {
      scale: 1,
      xOffset: 0,
      yOffset: 0,
      zOffset: 0,
      localHeight: 1.72,
      localWidth: 0.45,
      localDepth: 0.3,
      torsoWidth: 0.4,
      torsoDepth: 0.28,
      localMinY: 0,
      localCenterX: 0,
      localCenterZ: 0,
    };
  }

  let scale = 1;
  if (height < 1.4 || height > 2.2) {
    scale = THREE.MathUtils.clamp(TARGET_HEIGHT_M / height, 0.15, 8);
  }
  if (!Number.isFinite(scale)) scale = 1;

  const torsoWidth = THREE.MathUtils.clamp(
    Math.min(size.x * 0.36, height * 0.46),
    height * 0.28,
    height * 0.52,
  );
  const torsoDepth = THREE.MathUtils.clamp(
    Math.max(size.z, height * 0.18),
    height * 0.16,
    height * 0.3,
  );

  return {
    scale,
    xOffset: -center.x * scale,
    yOffset: -box.min.y * scale,
    zOffset: -center.z * scale,
    localHeight: height,
    localWidth: Math.max(size.x, 0.05),
    localDepth: Math.max(size.z, 0.05),
    torsoWidth,
    torsoDepth,
    localMinY: box.min.y,
    localCenterX: center.x,
    localCenterZ: center.z,
  };
}

function isMixamoSkeleton(root: THREE.Object3D): boolean {
  let found = false;
  root.traverse((o) => {
    if (/mixamorig/i.test(o.name)) found = true;
  });
  return found;
}

function GlbAvatar({
  url,
  avatar,
  bodyShape,
  measurements,
  animation,
  position,
  yaw,
  hiddenParts,
  onBonesReady,
  children,
}: {
  url: string;
  avatar: AvatarDefinition;
  bodyShape: BodyShapeId;
  measurements: BodyMeasurements;
  animation: AnimationId;
  position: [number, number, number];
  yaw: number;
  hiddenParts: Set<BodyPart>;
  onBonesReady?: (bones: BoneMap, root: THREE.Group) => void;
  children?: ReactNode;
}) {
  const gltf = useGLTF(url);
  const [libClips, setLibClips] = useState<THREE.AnimationClip[]>([]);
  const rootRef = useRef<THREE.Group>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const actionRef = useRef<THREE.AnimationAction | null>(null);
  const boneMapRef = useRef<BoneMap>({});
  const onBonesReadyRef = useRef(onBonesReady);
  onBonesReadyRef.current = onBonesReady;

  const factors = useMemo(
    () => measurementScaleFactors(measurements, bodyShape),
    [bodyShape, measurements],
  );
  const factorsRef = useRef(factors);
  factorsRef.current = factors;

  const { scene, fitScale, fitResult, mixamo, bodyBox } = useMemo(() => {
    try {
      console.log("[AvatarModel] Loading scene from:", url);
      const cloned = prepareClonedScene(gltf.scene);
      const fit = fitToStudioHeight(cloned);
      console.log("[AvatarModel] fitScale:", fit.scale, "yOffset:", fit.yOffset, "height:", fit.localHeight);
      let meshCount = 0;
      cloned.traverse(o => { if ((o as THREE.Mesh).isMesh) meshCount++; });
      console.log("[AvatarModel] Mesh count:", meshCount, "isMixamo:", isMixamoSkeleton(cloned));
      return {
        scene: cloned,
        fitScale: fit.scale,
        fitResult: fit,
        mixamo: isMixamoSkeleton(cloned),
        bodyBox: {
          localBodyHeight: fit.localHeight,
          localBodyWidth: fit.localWidth,
          localBodyDepth: fit.localDepth,
          torsoWidth: fit.torsoWidth,
          torsoDepth: fit.torsoDepth,
          localMinY: fit.localMinY,
          localCenterX: fit.localCenterX,
          localCenterZ: fit.localCenterZ,
        },
      };
    } catch (e) {
      console.error("[AvatarModel] useMemo ERROR:", e);
      throw e;
    }
  }, [gltf.scene, url]);

  useLayoutEffect(() => {
    applyBodyPartVisibility(scene, hiddenParts);
    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      if (shouldHideTryOnProp(mesh.name)) mesh.visible = false;
    });
  }, [scene, hiddenParts]);

  useEffect(() => {
    if (!mixamo) return;
    const embedded = gltf.animations ?? [];
    if (hasSafeEmbeddedClips(embedded)) return;

    let cancelled = false;
    const loader = new GLTFLoader();
    loader.load(
      getMediaUrl(ANIM_LIBRARY_PATH),
      (g) => {
        if (!cancelled) setLibClips(g.animations ?? []);
      },
      undefined,
      (err) => console.warn("[AvatarModel] anim library load failed", err),
    );
    return () => {
      cancelled = true;
    };
  }, [mixamo, gltf.animations]);

  const clips = useMemo(() => {
    const embedded = gltf.animations ?? [];
    if (hasSafeEmbeddedClips(embedded)) return embedded;
    if (libClips.length) return libClips;
    return embedded;
  }, [gltf.animations, libClips]);

  const notifiedRef = useRef(false);

  useLayoutEffect(() => {
    const map = buildBoneMap(scene);
    boneMapRef.current = map;
    applyRegionalBoneScales(map, factorsRef.current);
    onBonesReadyRef.current?.(map, rootRef.current!);
  }, [scene]);

  useFrame((_, dt) => {
    if (!notifiedRef.current && rootRef.current) {
      notifiedRef.current = true;
      const map = buildBoneMap(scene);
      boneMapRef.current = map;
      onBonesReadyRef.current?.(map, rootRef.current);
    }
    mixerRef.current?.update(dt);
    if (Object.keys(boneMapRef.current).length) {
      applyRegionalBoneScales(boneMapRef.current, factorsRef.current);
    }
  });

  useEffect(() => {
    if (!scene) return;
    const mixer = new THREE.AnimationMixer(scene);
    mixerRef.current = mixer;
    return () => {
      mixer.stopAllAction();
      mixerRef.current = null;
      actionRef.current = null;
    };
  }, [scene, clips]);

  useEffect(() => {
    const mixer = mixerRef.current;
    if (!mixer || !clips.length) return;
    const clip = findClip(clips, animation);
    if (!clip) return;
    try {
      const normalizedClip = normalizeClipTracks(clip, boneMapRef.current);
      const next = mixer.clipAction(normalizedClip);
      next.reset().setLoop(THREE.LoopRepeat, Infinity).fadeIn(0.15).play();
      if (actionRef.current && actionRef.current !== next) {
        actionRef.current.fadeOut(0.15);
      }
      actionRef.current = next;
    } catch (e) {
      console.warn("Animation play failed", e);
    }
  }, [animation, clips, scene]);

  const heightF = THREE.MathUtils.clamp(factors.height, 0.85, 1.15);
  const s = fitScale * avatar.heightScale * heightF;
  const bodyInset = hiddenParts.size > 0 ? 0.94 : 1;

  const avatarSkeleton = useMemo(() => {
    let skel: THREE.Skeleton | null = null;
    scene.traverse((o) => {
      const m = o as THREE.SkinnedMesh;
      if (!skel && m.isSkinnedMesh && m.skeleton) skel = m.skeleton;
    });
    return skel;
  }, [scene]);

  const fitValue = useMemo(
    () => ({
      ...bodyBox,
      chest: factors.chest,
      waist: factors.waist,
      hips: factors.hips,
      shoulders: factors.shoulders,
      arms: factors.arms,
      legs: factors.legs,
      height: factors.height,
      isMixamo: mixamo,
      skeleton: avatarSkeleton,
    }),
    [bodyBox, factors, mixamo, avatarSkeleton],
  );

  const posX = position[0] + (fitResult?.xOffset ?? 0);
  const posY = position[1] + (fitResult?.yOffset ?? 0) * avatar.heightScale * heightF;
  const posZ = position[2] + (fitResult?.zOffset ?? 0);

  return (
    <group
      ref={rootRef}
      position={[posX, posY, posZ]}
      rotation={[0, yaw, 0]}
      scale={[s, s, s]}
    >
      <group scale={[bodyInset, bodyInset, bodyInset]}>
        <primitive object={scene} />
      </group>
      <AvatarFitContext.Provider value={fitValue}>
        {children}
      </AvatarFitContext.Provider>
    </group>
  );
}

export function AvatarModel(props: AvatarModelProps) {
  const modelUrl = getMediaUrl(props.avatar.modelPath);

  return (
    <AvatarErrorBoundary>
      <GlbAvatar
        key={modelUrl}
        url={modelUrl}
        avatar={props.avatar}
        bodyShape={props.bodyShape}
        measurements={props.measurements}
        animation={props.animation}
        position={props.position}
        yaw={props.yaw}
        hiddenParts={props.hiddenParts}
        onBonesReady={(bones) => props.onBonesReady?.(bones)}
      >
        {props.children}
      </GlbAvatar>
    </AvatarErrorBoundary>
  );
}

// Preload the known avatar models so they're cached before the component mounts
useGLTF.preload("/models/avatars/ch36-mixamo.glb");

