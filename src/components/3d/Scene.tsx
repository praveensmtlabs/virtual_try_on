"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { AVATARS } from "@/data/avatars";
import { CLOTHING } from "@/data/clothing";
import type { BodyPart } from "@/types/clothing";
import { useAvatarStore } from "@/store/avatarStore";
import { useClothingStore } from "@/store/clothingStore";
import { useAnimationStore } from "@/store/animationStore";
import { resolveHiddenBodyParts } from "@/utils/bodyMasking";
import { AvatarModel, type BoneMap } from "@/components/3d/AvatarModel";
import { ClothingLayer } from "@/components/3d/ClothingLayer";
import { StudioEnvironment } from "@/components/3d/StudioEnvironment";
import { CameraRig } from "@/components/3d/CameraRig";
import { MovementController } from "@/components/3d/MovementController";
import { AnimationController } from "@/components/3d/AnimationController";

function AvatarStage() {
  const selectedAvatarId = useAvatarStore((s) => s.selectedAvatarId);
  const bodyShape = useAvatarStore((s) => s.bodyShape);
  const measurements = useAvatarStore((s) => s.measurements);
  const position = useAvatarStore((s) => s.position);
  const yaw = useAvatarStore((s) => s.yaw);
  const coatId = useClothingStore((s) => s.coatId);
  const shirtId = useClothingStore((s) => s.shirtId);
  const pantsId = useClothingStore((s) => s.pantsId);
  const animation = useAnimationStore((s) => s.currentAnimation);

  const [bones, setBones] = useState<BoneMap>({});

  // Sync catalog lookup — no async delay before the GLB fetch starts
  const avatar = useMemo(
    () => AVATARS.find((a) => a.id === selectedAvatarId) ?? AVATARS[0],
    [selectedAvatarId],
  );

  const equipped = useMemo(() => {
    const ids = [coatId, shirtId, pantsId].filter(Boolean) as string[];
    return ids
      .map((id) => CLOTHING.find((c) => c.id === id))
      .filter(Boolean) as typeof CLOTHING;
  }, [coatId, shirtId, pantsId]);

  useEffect(() => {
    setBones({});
  }, [selectedAvatarId]);

  useEffect(() => {
    useClothingStore.getState().clearClothing();
  }, [selectedAvatarId]);

  const hiddenParts = useMemo(
    () => resolveHiddenBodyParts(equipped),
    [equipped],
  );

  const onBonesReady = useCallback((map: BoneMap) => {
    setBones({ ...map });
  }, []);

  if (!avatar) return null;

  return (
    <AvatarModel
      key={avatar.id}
      avatar={avatar}
      bodyShape={bodyShape}
      measurements={measurements}
      hiddenParts={hiddenParts as Set<BodyPart>}
      animation={animation}
      position={position}
      yaw={yaw}
      onBonesReady={onBonesReady}
    >
      <ClothingLayer bones={bones} />
    </AvatarModel>
  );
}

export function Scene() {
  return (
    <>
      <StudioEnvironment />
      <CameraRig />
      <MovementController />
      <AnimationController />
      {/* Nested Suspense so environment & lighting stay visible while GLBs load */}
      <Suspense fallback={null}>
        <AvatarStage />
      </Suspense>
    </>
  );
}
