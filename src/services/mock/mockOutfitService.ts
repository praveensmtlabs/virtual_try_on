import { OUTFITS } from "@/data/outfits";
import type { OutfitService } from "@/services/interfaces/outfitService";

export const mockOutfitService: OutfitService = {
  async list() {
    return OUTFITS;
  },
  async get(id: string) {
    return OUTFITS.find((o) => o.id === id);
  },
};
