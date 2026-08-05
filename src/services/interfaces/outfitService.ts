import type { Outfit } from "@/types/outfit";

export interface OutfitService {
  list(): Promise<Outfit[]>;
  get(id: string): Promise<Outfit | undefined>;
}
