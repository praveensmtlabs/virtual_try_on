"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { avatarService } from "@/services";
import type { AvatarDefinition } from "@/types/avatar";
import { useAvatarStore } from "@/store/avatarStore";
import { useClothingStore } from "@/store/clothingStore";
import { useViewerStore } from "@/store/viewerStore";
import { AvatarCard } from "@/components/avatar/AvatarCard";

export function AvatarSelector() {
  const open = useViewerStore((s) => s.openPanel === "avatar");
  const setPanel = useViewerStore((s) => s.setPanel);
  const selectedAvatarId = useAvatarStore((s) => s.selectedAvatarId);
  const setAvatar = useAvatarStore((s) => s.setAvatar);
  const clearClothing = useClothingStore((s) => s.clearClothing);
  const [avatars, setAvatars] = useState<AvatarDefinition[]>([]);

  useEffect(() => {
    avatarService.list().then(setAvatars);
  }, []);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="absolute right-4 top-20 z-30 w-56 overflow-hidden rounded-2xl border border-white/25 bg-[#1a1f26]/80 p-3 shadow-2xl backdrop-blur-md md:right-6 md:top-24"
        >
          <p className="mb-2 px-1 text-[11px] uppercase tracking-[0.2em] text-white/50">
            Select Avatar
          </p>
          <ul className="flex flex-col gap-1">
            {avatars.map((a) => (
              <li key={a.id}>
                <AvatarCard
                  avatar={a}
                  selected={selectedAvatarId === a.id}
                  onSelect={() => {
                    setAvatar(a.id);
                    clearClothing();
                    setPanel(null);
                  }}
                />
              </li>
            ))}
          </ul>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
