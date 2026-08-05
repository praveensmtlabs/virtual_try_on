"use client";

import type { ClothingCategory } from "@/types/clothing";

const LABELS: Record<ClothingCategory, string> = {
  coat: "Coat",
  shirt: "Shirt",
  pants: "Pants",
};

interface Props {
  categories: ClothingCategory[];
  active: ClothingCategory;
  onChange: (c: ClothingCategory) => void;
}

export function ClothingCategoryTabs({ categories, active, onChange }: Props) {
  return (
    <div className="flex gap-1 rounded-xl bg-white/5 p-1">
      {categories.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className={`flex-1 rounded-lg px-2 py-1.5 text-xs tracking-wide transition ${
            active === c
              ? "bg-[#c9a66b]/30 text-[#f4f1ea]"
              : "text-white/55 hover:text-white/80"
          }`}
        >
          {LABELS[c]}
        </button>
      ))}
    </div>
  );
}
