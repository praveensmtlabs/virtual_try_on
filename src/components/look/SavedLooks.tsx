"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLookStore } from "@/store/lookStore";
import { useViewerStore } from "@/store/viewerStore";
import { SaveLook } from "@/components/look/SaveLook";

export function SavedLooks() {
  const open = useViewerStore((s) => s.openPanel === "looks");
  const setPanel = useViewerStore((s) => s.setPanel);
  const setCompareLooks = useViewerStore((s) => s.setCompareLooks);
  const looks = useLookStore((s) => s.savedLooks);
  const renameLook = useLookStore((s) => s.renameLook);
  const deleteLook = useLookStore((s) => s.deleteLook);
  const applyLook = useLookStore((s) => s.applyLook);
  const resetLook = useLookStore((s) => s.resetLook);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [pickA, setPickA] = useState<string | undefined>();
  const [pickB, setPickB] = useState<string | undefined>();

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="absolute bottom-24 left-4 top-24 z-30 flex w-[min(100%-2rem,22rem)] flex-col overflow-hidden rounded-2xl border border-white/25 bg-[#1a1f26]/85 shadow-2xl backdrop-blur-md md:left-6"
        >
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-[#f4f1ea]">Saved Looks</p>
              <p className="text-[11px] text-white/45">Local only · localStorage</p>
            </div>
            <button
              type="button"
              onClick={() => setPanel(null)}
              className="text-xs text-white/50 hover:text-white/80"
            >
              Close
            </button>
          </div>

          <div className="space-y-3 border-b border-white/10 p-3">
            <SaveLook />
            <button
              type="button"
              onClick={resetLook}
              className="w-full rounded-xl border border-white/10 px-3 py-2 text-xs text-white/60 hover:bg-white/5"
            >
              Reset Look
            </button>
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto p-3">
            {looks.length === 0 && (
              <p className="text-sm text-white/40">No saved looks yet.</p>
            )}
            {looks.map((look) => (
              <div
                key={look.id}
                className="rounded-xl border border-white/10 bg-white/5 p-2.5"
              >
                {editingId === look.id ? (
                  <form
                    className="flex gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      renameLook(look.id, editName);
                      setEditingId(null);
                    }}
                  >
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="min-w-0 flex-1 rounded-lg border border-white/15 bg-black/20 px-2 py-1 text-sm text-white"
                      autoFocus
                    />
                    <button type="submit" className="text-xs text-[#c9a66b]">
                      OK
                    </button>
                  </form>
                ) : (
                  <p className="text-sm text-[#f4f1ea]">{look.name}</p>
                )}
                <p className="mt-0.5 text-[11px] capitalize text-white/40">
                  {look.avatarId.replace("-", " ")} · {look.bodyShape}
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  <button
                    type="button"
                    className="rounded-lg bg-white/10 px-2 py-1 text-[11px] text-white/80"
                    onClick={() => {
                      applyLook(look.id);
                      setPanel(null);
                    }}
                  >
                    Apply
                  </button>
                  <button
                    type="button"
                    className="rounded-lg bg-white/10 px-2 py-1 text-[11px] text-white/80"
                    onClick={() => {
                      setEditingId(look.id);
                      setEditName(look.name);
                    }}
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    className="rounded-lg bg-white/10 px-2 py-1 text-[11px] text-red-300/80"
                    onClick={() => deleteLook(look.id)}
                  >
                    Delete
                  </button>
                  <button
                    type="button"
                    className="rounded-lg bg-white/10 px-2 py-1 text-[11px] text-white/80"
                    onClick={() => setPickA(look.id)}
                  >
                    Compare A{pickA === look.id ? " ✓" : ""}
                  </button>
                  <button
                    type="button"
                    className="rounded-lg bg-white/10 px-2 py-1 text-[11px] text-white/80"
                    onClick={() => setPickB(look.id)}
                  >
                    Compare B{pickB === look.id ? " ✓" : ""}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-white/10 p-3">
            <button
              type="button"
              disabled={!pickA || !pickB || pickA === pickB}
              onClick={() => {
                setCompareLooks(pickA, pickB);
                setPanel("compare");
              }}
              className="w-full rounded-xl bg-[#c9a66b]/30 px-3 py-2 text-sm text-[#f4f1ea] disabled:opacity-40"
            >
              Compare Looks
            </button>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
