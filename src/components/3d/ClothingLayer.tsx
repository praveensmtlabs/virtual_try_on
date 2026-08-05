"use client";

import { useMemo } from "react";
import { CLOTHING } from "@/data/clothing";
import { useClothingStore } from "@/store/clothingStore";
import { ClothingModel } from "@/components/3d/ClothingModel";
import type { BoneMap } from "@/components/3d/AvatarModel";

interface ClothingLayerProps {
  bones: BoneMap;
}

/** Instant equip — catalog is in-memory, no async GLB fetch. */
export function ClothingLayer({ bones }: ClothingLayerProps) {
  const coatId = useClothingStore((s) => s.coatId);
  const shirtId = useClothingStore((s) => s.shirtId);
  const pantsId = useClothingStore((s) => s.pantsId);

  const items = useMemo(
    () => ({
      coat: coatId ? CLOTHING.find((c) => c.id === coatId) : undefined,
      shirt: shirtId ? CLOTHING.find((c) => c.id === shirtId) : undefined,
      pants: pantsId ? CLOTHING.find((c) => c.id === pantsId) : undefined,
    }),
    [coatId, shirtId, pantsId],
  );

  return (
    <group>
      {items.shirt && (
        <ClothingModel
          key={`shirt-${items.shirt.id}`}
          item={items.shirt}
          bones={bones}
        />
      )}
      {items.coat && (
        <ClothingModel
          key={`coat-${items.coat.id}`}
          item={items.coat}
          bones={bones}
        />
      )}
      {items.pants && (
        <ClothingModel
          key={`pants-${items.pants.id}`}
          item={items.pants}
          bones={bones}
        />
      )}
    </group>
  );
}
