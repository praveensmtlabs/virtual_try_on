"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { animationService } from "@/services";
import type { AnimationClipDef } from "@/types/animation";
import { useAnimationStore } from "@/store/animationStore";
import { useViewerStore } from "@/store/viewerStore";

export function AnimationSelector() {
  const open = useViewerStore((s) => s.openPanel === "animation");
  const setPanel = useViewerStore((s) => s.setPanel);
  const current = useAnimationStore((s) => s.currentAnimation);
  const setAnimation = useAnimationStore((s) => s.setAnimation);
  const [clips, setClips] = useState<AnimationClipDef[]>([]);

  useEffect(() => {
    animationService.list().then(setClips);
  }, []);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          className="absolute bottom-24 left-1/2 z-30 w-[min(100%-2rem,22rem)] -translate-x-1/2 rounded-2xl border border-white/25 bg-[#1a1f26]/85 p-3 shadow-2xl backdrop-blur-md"
        >
          <div className="mb-2 flex items-center justify-between px-1">
            <p className="text-[11px] uppercase tracking-[0.2em] text-white/50">
              Animation
            </p>
            <button
              type="button"
              className="text-xs text-white/50 hover:text-white/80"
              onClick={() => setPanel(null)}
            >
              Close
            </button>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {clips.map((clip) => (
              <button
                key={clip.id}
                type="button"
                onClick={() => {
                  setAnimation(clip.id);
                  setPanel(null);
                }}
                className={`rounded-xl px-3 py-2.5 text-left text-sm transition ${
                  current === clip.id
                    ? "bg-[#c9a66b]/25 text-[#f4f1ea]"
                    : "text-white/75 hover:bg-white/10"
                }`}
              >
                {clip.name}
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
