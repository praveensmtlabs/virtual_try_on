import { create } from "zustand";

export type StudioPanel =
  | null
  | "avatar"
  | "customize"
  | "generate"
  | "animation"
  | "movement"
  | "looks"
  | "compare"
  | "viewer360";

interface ViewerState {
  openPanel: StudioPanel;
  compareLookA?: string;
  compareLookB?: string;
  cameraResetNonce: number;
  selected360GarmentId?: string;
  setPanel: (panel: StudioPanel) => void;
  togglePanel: (panel: Exclude<StudioPanel, null>) => void;
  resetCamera: () => void;
  setCompareLooks: (a?: string, b?: string) => void;
  set360Garment: (id?: string) => void;
}

export const useViewerStore = create<ViewerState>((set, get) => ({
  openPanel: null,
  compareLookA: undefined,
  compareLookB: undefined,
  cameraResetNonce: 0,
  selected360GarmentId: undefined,
  setPanel: (openPanel) => set({ openPanel }),
  togglePanel: (panel) =>
    set({ openPanel: get().openPanel === panel ? null : panel }),
  resetCamera: () => set({ cameraResetNonce: get().cameraResetNonce + 1 }),
  setCompareLooks: (compareLookA, compareLookB) =>
    set({ compareLookA, compareLookB }),
  set360Garment: (selected360GarmentId) => set({ selected360GarmentId }),
}));
