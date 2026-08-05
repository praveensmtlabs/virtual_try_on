"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { clothingService } from "@/services";
import type { ClothingCategory, ClothingItem } from "@/types/clothing";
import { useAvatarStore } from "@/store/avatarStore";
import { useClothingStore } from "@/store/clothingStore";
import { useViewerStore } from "@/store/viewerStore";
import { ClothingCategoryTabs } from "@/components/customize/ClothingCategoryTabs";
import { ClothingCard } from "@/components/customize/ClothingCard";

const CATEGORIES: ClothingCategory[] = ["coat", "shirt", "pants"];

export function CustomizePanel() {
  const open = useViewerStore((s) => s.openPanel === "customize");
  const setPanel = useViewerStore((s) => s.setPanel);
  const set360Garment = useViewerStore((s) => s.set360Garment);
  const avatarId = useAvatarStore((s) => s.selectedAvatarId);
  const coatId = useClothingStore((s) => s.coatId);
  const shirtId = useClothingStore((s) => s.shirtId);
  const pantsId = useClothingStore((s) => s.pantsId);
  const setCoat = useClothingStore((s) => s.setCoat);
  const setShirt = useClothingStore((s) => s.setShirt);
  const setPants = useClothingStore((s) => s.setPants);

  const [category, setCategory] = useState<ClothingCategory>("shirt");
  const [items, setItems] = useState<ClothingItem[]>([]);

  useEffect(() => {
    clothingService.listByAvatarAndCategory(avatarId, category).then(setItems);
  }, [avatarId, category]);

  const selectedId =
    category === "coat" ? coatId : category === "shirt" ? shirtId : pantsId;

  const select = (id: string) => {
    const next = selectedId === id ? undefined : id;
    if (category === "coat") {
      setCoat(next);
      if (next) setShirt(undefined);
    } else if (category === "shirt") {
      setShirt(next);
      if (next) setCoat(undefined);
    } else {
      setPants(next);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 24 }}
          className="absolute bottom-24 right-4 top-24 z-30 flex w-[min(100%-2rem,20rem)] flex-col overflow-hidden rounded-2xl border border-white/25 bg-[#1a1f26]/85 shadow-2xl backdrop-blur-md md:right-6"
        >
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-[#f4f1ea]">Try Clothes</p>
              <p className="text-[11px] text-white/45">Temporary fitting panel</p>
            </div>
            <button
              type="button"
              onClick={() => setPanel(null)}
              className="rounded-full px-2 py-1 text-xs text-white/60 hover:bg-white/10"
            >
              Close
            </button>
          </div>

          <div className="px-3 pt-3">
            <ClothingCategoryTabs
              categories={CATEGORIES}
              active={category}
              onChange={setCategory}
            />
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto p-3">
            {items.length === 0 && (
              <p className="px-1 text-sm text-white/40">No items for this avatar.</p>
            )}
            {items.map((item) => (
              <ClothingCard
                key={item.id}
                item={item}
                selected={selectedId === item.id}
                onSelect={() => select(item.id)}
                onView360={() => {
                  set360Garment(item.id);
                  setPanel("viewer360");
                }}
              />
            ))}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
