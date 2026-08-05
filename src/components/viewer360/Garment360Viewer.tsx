"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { clothingService } from "@/services";
import { getMediaUrl } from "@/utils/media";
import { useViewerStore } from "@/store/viewerStore";
import { useEffect } from "react";
import type { ClothingItem } from "@/types/clothing";

interface Garment360ViewerProps {
  /** Override garment id; defaults to viewer store selection */
  garmentId?: string;
  frameCount?: 36 | 72;
  className?: string;
  embedded?: boolean;
}

/**
 * Reusable 360° image scrubber (36 @ 10° or 72 @ 5°).
 * Uses mock generated frames until S3 image sets exist.
 */
export function Garment360Viewer({
  garmentId,
  frameCount = 36,
  className = "",
  embedded = false,
}: Garment360ViewerProps) {
  const storeId = useViewerStore((s) => s.selected360GarmentId);
  const setPanel = useViewerStore((s) => s.setPanel);
  const open = useViewerStore((s) => s.openPanel === "viewer360");
  const id = garmentId ?? storeId;
  const [item, setItem] = useState<ClothingItem | null>(null);
  const [frame, setFrame] = useState(0);
  const dragging = useRef(false);
  const lastX = useRef(0);

  useEffect(() => {
    if (!id) return;
    clothingService.get(id).then((c) => setItem(c ?? null));
  }, [id]);

  const frames = useMemo(() => {
    // Prefer authored frames via getMediaUrl when present; fall back to CSS mock.
    return Array.from({ length: frameCount }, (_, i) =>
      getMediaUrl(`/images/360/${id ?? "garment"}/${String(i).padStart(3, "0")}.webp`),
    );
  }, [frameCount, id]);

  const scrub = useCallback(
    (dx: number) => {
      const step = dx > 0 ? 1 : dx < 0 ? -1 : 0;
      if (!step) return;
      setFrame((f) => (f + step + frameCount) % frameCount);
    },
    [frameCount],
  );

  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = true;
    lastX.current = e.clientX;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - lastX.current;
    if (Math.abs(dx) >= 6) {
      scrub(dx);
      lastX.current = e.clientX;
    }
  };

  const onPointerUp = () => {
    dragging.current = false;
  };

  const hue = item ? parseInt(item.color.replace("#", "").slice(0, 2), 16) : 40;

  const content = (
    <div className={`flex flex-col ${className}`}>
      <div
        className="relative aspect-square w-full cursor-ew-resize touch-none select-none overflow-hidden rounded-xl"
        style={{
          background: `conic-gradient(from ${frame * (360 / frameCount)}deg, hsl(${hue}, 35%, 42%), hsl(${(hue + 40) % 360}, 25%, 55%), hsl(${hue}, 35%, 42%))`,
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        role="img"
        aria-label={`${item?.name ?? "Garment"} 360 viewer`}
      >
        {/* Hidden img tags ready for real assets */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={frames[frame]}
          alt=""
          className="pointer-events-none absolute inset-0 h-full w-full object-contain opacity-0"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="h-[55%] w-[38%] rounded-[40%] shadow-2xl"
            style={{
              backgroundColor: item?.color ?? "#888",
              transform: `rotateY(${frame * (360 / frameCount)}deg)`,
            }}
          />
        </div>
        <p className="absolute bottom-3 left-0 right-0 text-center text-[11px] text-white/70">
          Drag to rotate · {frameCount} frames · {frame * (360 / frameCount)}°
        </p>
      </div>
    </div>
  );

  if (embedded) return content;

  return (
    <AnimatePresence>
      {open && id && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-40 flex items-center justify-center bg-[#1a1f26]/60 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-md rounded-2xl border border-white/20 bg-[#1a1f26]/90 p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-sm text-[#f4f1ea]">{item?.name ?? "Garment"}</p>
                <p className="text-[11px] text-white/45">360° viewer</p>
              </div>
              <button
                type="button"
                onClick={() => setPanel("customize")}
                className="text-xs text-white/60 hover:text-white"
              >
                Close
              </button>
            </div>
            {content}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
