"use client";

/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import type { ClothingItem } from "@/types/clothing";
import { getMediaUrl } from "@/utils/media";

interface Props {
  item: ClothingItem;
  selected: boolean;
  onSelect: () => void;
  onView360: () => void;
}

export function ClothingCard({ item, selected, onSelect, onView360 }: Props) {
  const [imgError, setImgError] = useState(false);
  const thumbnailUrl = item.thumbnail ? getMediaUrl(item.thumbnail) : null;

  return (
    <div
      className={`group relative flex items-center gap-3.5 rounded-xl border p-2.5 transition-all duration-200 ${
        selected
          ? "border-[#c9a66b]/60 bg-[#c9a66b]/20 shadow-lg shadow-[#c9a66b]/5"
          : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
      }`}
    >
      <button
        type="button"
        onClick={onSelect}
        className="flex flex-1 items-center gap-3.5 text-left"
      >
        {/* Garment Image Thumbnail / Color Swatch Fallback */}
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-white/15 bg-[#12161c] p-1 shadow-inner flex items-center justify-center">
          {thumbnailUrl && !imgError ? (
            <img
              src={thumbnailUrl}
              alt={item.name}
              className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
              onError={() => setImgError(true)}
            />
          ) : (
            <span
              className="h-full w-full rounded-md"
              style={{ backgroundColor: item.color }}
              aria-hidden
            />
          )}
          {selected && (
            <span className="absolute right-1 top-1 flex h-2 w-2 rounded-full bg-[#c9a66b] ring-2 ring-[#12161c]" />
          )}
        </div>

        {/* Item Information */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium text-[#f4f1ea] group-hover:text-white">
              {item.name}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="inline-block rounded bg-white/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wider font-semibold text-white/60 capitalize">
              {item.category}
            </span>
            {selected && (
              <span className="text-[10px] font-semibold text-[#c9a66b] uppercase tracking-wider">
                Equipped
              </span>
            )}
          </div>
        </div>
      </button>

      {/* 360 Viewer Action Button */}
      <button
        type="button"
        onClick={onView360}
        title="View 360 garment details"
        className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/70 hover:border-white/30 hover:bg-white/15 hover:text-white transition"
      >
        360
      </button>
    </div>
  );
}

