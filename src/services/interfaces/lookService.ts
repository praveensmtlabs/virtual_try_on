import type { SavedLook } from "@/types/outfit";

/**
 * Future API-backed look persistence.
 * Phase 1 uses Zustand + localStorage via useLookStore instead.
 */
export interface LookService {
  list(): Promise<SavedLook[]>;
  get(id: string): Promise<SavedLook | undefined>;
  create(look: Omit<SavedLook, "id" | "createdAt" | "updatedAt">): Promise<SavedLook>;
  update(id: string, patch: Partial<Pick<SavedLook, "name" | "clothing" | "bodyShape" | "avatarId">>): Promise<SavedLook>;
  delete(id: string): Promise<void>;
}
