"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useAnimationStore } from "@/store/animationStore";
import { useAvatarStore } from "@/store/avatarStore";
import { useViewerStore } from "@/store/viewerStore";

export function MovementControls() {
  const open = useViewerStore((s) => s.openPanel === "movement");
  const setPanel = useViewerStore((s) => s.setPanel);
  const setAnimation = useAnimationStore((s) => s.setAnimation);
  const rotateBy = useAvatarStore((s) => s.rotateBy);
  const resetPose = useAvatarStore((s) => s.resetPose);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          className="absolute bottom-24 left-1/2 z-30 w-[min(100%-2rem,18rem)] -translate-x-1/2 rounded-2xl border border-white/25 bg-[#1a1f26]/85 p-3 shadow-2xl backdrop-blur-md"
        >
          <div className="mb-2 flex items-center justify-between px-1">
            <p className="text-[11px] uppercase tracking-[0.2em] text-white/50">
              Movement
            </p>
            <button
              type="button"
              className="text-xs text-white/50"
              onClick={() => setPanel(null)}
            >
              Close
            </button>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              className="rounded-xl bg-white/5 px-3 py-2 text-sm text-white/80 hover:bg-white/10"
              onClick={() => setAnimation("walk")}
            >
              Forward
            </button>
            <button
              type="button"
              className="rounded-xl bg-white/5 px-3 py-2 text-sm text-white/80 hover:bg-white/10"
              onClick={() => setAnimation("walkAway")}
            >
              Backward
            </button>
            <button
              type="button"
              className="rounded-xl bg-white/5 px-3 py-2 text-sm text-white/80 hover:bg-white/10"
              onClick={() => {
                setAnimation("turnLeft");
                rotateBy(0.35);
              }}
            >
              Turn Left
            </button>
            <button
              type="button"
              className="rounded-xl bg-white/5 px-3 py-2 text-sm text-white/80 hover:bg-white/10"
              onClick={() => {
                setAnimation("turnRight");
                rotateBy(-0.35);
              }}
            >
              Turn Right
            </button>
            <button
              type="button"
              className="rounded-xl bg-white/5 px-3 py-2 text-sm text-white/80 hover:bg-white/10"
              onClick={() => setAnimation("run")}
            >
              Run
            </button>
            <button
              type="button"
              className="rounded-xl bg-white/5 px-3 py-2 text-sm text-white/80 hover:bg-white/10"
              onClick={() => {
                setAnimation("idle");
                resetPose();
              }}
            >
              Stop / Center
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
