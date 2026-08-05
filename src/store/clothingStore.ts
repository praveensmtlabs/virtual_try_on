import { create } from "zustand";
import type { EquippedClothing } from "@/types/clothing";

interface ClothingState extends EquippedClothing {
  setCoat: (id: string | undefined) => void;
  setShirt: (id: string | undefined) => void;
  setPants: (id: string | undefined) => void;
  applyClothing: (clothing: EquippedClothing) => void;
  clearClothing: () => void;
}

export const useClothingStore = create<ClothingState>((set) => ({
  coatId: undefined,
  shirtId: undefined,
  pantsId: undefined,
  setCoat: (coatId) => set({ coatId }),
  setShirt: (shirtId) => set({ shirtId }),
  setPants: (pantsId) => set({ pantsId }),
  applyClothing: (clothing) =>
    set({
      coatId: clothing.coatId,
      shirtId: clothing.shirtId,
      pantsId: clothing.pantsId,
    }),
  clearClothing: () =>
    set({ coatId: undefined, shirtId: undefined, pantsId: undefined }),
}));
