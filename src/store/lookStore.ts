import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { SavedLook } from "@/types/outfit";
import type { AvatarId } from "@/types/avatar";
import type { BodyShapeId } from "@/types/body";
import type { EquippedClothing } from "@/types/clothing";
import { useAvatarStore } from "@/store/avatarStore";
import { useClothingStore } from "@/store/clothingStore";

interface LookState {
  savedLooks: SavedLook[];
  saveLook: (name: string) => SavedLook;
  renameLook: (id: string, name: string) => void;
  deleteLook: (id: string) => void;
  applyLook: (id: string) => void;
  resetLook: () => void;
}

function createId() {
  return `look-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export const useLookStore = create<LookState>()(
  persist(
    (set, get) => ({
      savedLooks: [],
      saveLook: (name) => {
        const avatar = useAvatarStore.getState();
        const clothing = useClothingStore.getState();
        const now = Date.now();
        const look: SavedLook = {
          id: createId(),
          name: name.trim() || "Untitled Look",
          avatarId: avatar.selectedAvatarId,
          bodyShape: avatar.bodyShape,
          clothing: {
            coatId: clothing.coatId,
            shirtId: clothing.shirtId,
            pantsId: clothing.pantsId,
          },
          createdAt: now,
          updatedAt: now,
        };
        set({ savedLooks: [look, ...get().savedLooks] });
        return look;
      },
      renameLook: (id, name) =>
        set({
          savedLooks: get().savedLooks.map((l) =>
            l.id === id ? { ...l, name: name.trim() || l.name, updatedAt: Date.now() } : l,
          ),
        }),
      deleteLook: (id) =>
        set({ savedLooks: get().savedLooks.filter((l) => l.id !== id) }),
      applyLook: (id) => {
        const look = get().savedLooks.find((l) => l.id === id);
        if (!look) return;
        useAvatarStore.getState().setAvatar(look.avatarId as AvatarId);
        useAvatarStore.getState().setBodyShape(look.bodyShape as BodyShapeId);
        useClothingStore.getState().applyClothing(look.clothing as EquippedClothing);
      },
      resetLook: () => {
        useAvatarStore.getState().setAvatar("adult-male");
        useAvatarStore.getState().setBodyShape("average");
        useAvatarStore.getState().resetPose();
        useClothingStore.getState().clearClothing();
      },
    }),
    { name: "vto-saved-looks" },
  ),
);
