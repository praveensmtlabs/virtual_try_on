"use client";

import { useState } from "react";
import { FloatingButton } from "@/components/ui/FloatingButton";
import { useViewerStore } from "@/store/viewerStore";
import { useAvatarStore } from "@/store/avatarStore";
import { useClothingStore } from "@/store/clothingStore";

export function StudioChrome() {
  const openPanel = useViewerStore((s) => s.openPanel);
  const togglePanel = useViewerStore((s) => s.togglePanel);
  const resetCamera = useViewerStore((s) => s.resetCamera);
  const rotateBy = useAvatarStore((s) => s.rotateBy);
  const resetPose = useAvatarStore((s) => s.resetPose);
  const clearClothing = useClothingStore((s) => s.clearClothing);
  const [capturing, setCapturing] = useState(false);

  const handleTakeSelfie = async () => {
    if (capturing) return;
    setCapturing(true);
    try {
      const canvas = document.querySelector(".studio-canvas-host canvas") as HTMLCanvasElement | null;
      if (canvas) {
        const dataUrl = canvas.toDataURL("image/png");
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
        const filename = `virtual_tryon_${timestamp}.png`;

        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      console.error("Take selfie failed:", err);
    } finally {
      setTimeout(() => setCapturing(false), 1200);
    }
  };

  return (
    <>
      {/* ── Top brand bar ─────────────────────────────────────────── */}
      <header className="studio-chrome-top">
        <div className="studio-brand-group">
          <p className="studio-brand">Crowntux</p>
          <p className="studio-brand-sub">Virtual Try-On</p>
        </div>

        {/* Top-right panel toggles */}
        <div className="studio-actions">
          <FloatingButton
            active={openPanel === "avatar"}
            onClick={() => togglePanel("avatar")}
          >
            Avatar
          </FloatingButton>
          <FloatingButton
            active={openPanel === "customize"}
            onClick={() => togglePanel("customize")}
          >
            Wardrobe
          </FloatingButton>
          <FloatingButton
            active={openPanel === "generate"}
            onClick={() => togglePanel("generate")}
          >
            ✦ AI Generate
          </FloatingButton>
        </div>
      </header>

      {/* ── Bottom control bar ────────────────────────────────────── */}
      <nav className="studio-chrome-bottom">
        <div className="studio-bottom-bar">
          <FloatingButton
            active={openPanel === "animation"}
            onClick={() => togglePanel("animation")}
          >
            Animate
          </FloatingButton>

          <div className="studio-divider" />

          <FloatingButton onClick={() => rotateBy(Math.PI / 2)}>
            ← Rotate
          </FloatingButton>
          <FloatingButton onClick={() => rotateBy(-Math.PI / 2)}>
            Rotate →
          </FloatingButton>

          <div className="studio-divider" />

          <FloatingButton
            onClick={() => {
              resetCamera();
              resetPose();
              clearClothing();
            }}
          >
            Reset
          </FloatingButton>
          <FloatingButton
            active={openPanel === "looks"}
            onClick={() => togglePanel("looks")}
          >
            Looks
          </FloatingButton>

          <div className="studio-divider" />

          <FloatingButton onClick={handleTakeSelfie}>
            {capturing ? "✓ Saved!" : "Download Look"}
          </FloatingButton>
        </div>
      </nav>
    </>
  );
}
