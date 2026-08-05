"use client";

import type { AvatarDefinition } from "@/types/avatar";

interface AvatarCardProps {
  avatar: AvatarDefinition;
  selected: boolean;
  onSelect: () => void;
}

export function AvatarCard({ avatar, selected, onSelect }: AvatarCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-xl px-3 py-2.5 text-left text-sm transition ${
        selected
          ? "bg-[#c9a66b]/25 text-[#f4f1ea]"
          : "text-white/80 hover:bg-white/10"
      }`}
    >
      {avatar.name}
    </button>
  );
}
