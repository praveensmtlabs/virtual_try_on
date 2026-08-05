"use client";

import { FloatingButton } from "@/components/ui/FloatingButton";
import { useViewerStore } from "@/store/viewerStore";

/** Top-level Customize trigger lives in StudioChrome; kept for composition. */
export function CustomizeButton() {
  const togglePanel = useViewerStore((s) => s.togglePanel);
  const active = useViewerStore((s) => s.openPanel === "customize");
  return (
    <FloatingButton active={active} onClick={() => togglePanel("customize")}>
      Customize
    </FloatingButton>
  );
}
