"use client";

import dynamic from "next/dynamic";
import { StudioChrome } from "@/components/ui/StudioChrome";
import { useViewerStore } from "@/store/viewerStore";

/** Heavy 3D canvas — load after first paint so studio shell renders fast. */
const StudioCanvas = dynamic(
  () => import("@/components/3d/StudioCanvas").then((m) => m.StudioCanvas),
  {
    ssr: false,
    loading: () => <div className="studio-loading">Loading studio…</div>,
  },
);

const AvatarSelector = dynamic(
  () => import("@/components/avatar/AvatarSelector").then((m) => m.AvatarSelector),
  { ssr: false },
);
const CustomizePanel = dynamic(
  () => import("@/components/customize/CustomizePanel").then((m) => m.CustomizePanel),
  { ssr: false },
);
const GenerateClothingPanel = dynamic(
  () => import("@/components/customize/GenerateClothingPanel").then((m) => m.GenerateClothingPanel),
  { ssr: false },
);
const AnimationSelector = dynamic(
  () => import("@/components/animation/AnimationSelector").then((m) => m.AnimationSelector),
  { ssr: false },
);
const MovementControls = dynamic(
  () => import("@/components/movement/MovementControls").then((m) => m.MovementControls),
  { ssr: false },
);
const SavedLooks = dynamic(
  () => import("@/components/look/SavedLooks").then((m) => m.SavedLooks),
  { ssr: false },
);
const CompareLooks = dynamic(
  () => import("@/components/look/CompareLooks").then((m) => m.CompareLooks),
  { ssr: false },
);
const Garment360Viewer = dynamic(
  () => import("@/components/viewer360/Garment360Viewer").then((m) => m.Garment360Viewer),
  { ssr: false },
);

export default function HomePage() {
  const openPanel = useViewerStore((s) => s.openPanel);

  return (
    <main className="studio-root">
      <StudioCanvas />
      <StudioChrome />
      <AvatarSelector />
      <CustomizePanel />
      {openPanel === "generate" ? <GenerateClothingPanel /> : null}
      <AnimationSelector />
      <MovementControls />
      <SavedLooks />
      <CompareLooks />
      <Garment360Viewer />
    </main>
  );
}
