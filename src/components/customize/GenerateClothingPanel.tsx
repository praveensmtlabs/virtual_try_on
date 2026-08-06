"use client";

import React, { useState } from "react";
import type { ClothingCategory, ClothingItem } from "@/types/clothing";
import { useClothingStore } from "@/store/clothingStore";
import { useViewerStore } from "@/store/viewerStore";
import { useAvatarStore } from "@/store/avatarStore";
import { CLOTHING } from "@/data/clothing";

const CATEGORIES: { label: string; value: ClothingCategory }[] = [
  { label: "Shirt", value: "shirt" },
  { label: "T-Shirt", value: "shirt" },
  { label: "Pants", value: "pants" },
  { label: "Blazer", value: "coat" },
];

const STYLES = ["Formal", "Casual", "Slim-fit", "Oversized"];
const COLORS = [
  { name: "Pink", hex: "#fbcfe8" },
  { name: "White", hex: "#f8f9fa" },
  { name: "Black", hex: "#121214" },
  { name: "Navy", hex: "#1e293b" },
  { name: "Charcoal", hex: "#27272a" },
  { name: "Beige", hex: "#d4b996" },
  { name: "Red", hex: "#991b1b" },
  { name: "Blue", hex: "#2563eb" },
  { name: "Green", hex: "#166534" },
];

export function GenerateClothingPanel() {
  const setPanel = useViewerStore((s) => s.setPanel);
  const avatarId = useAvatarStore((s) => s.selectedAvatarId);
  const setCoat = useClothingStore((s) => s.setCoat);
  const setShirt = useClothingStore((s) => s.setShirt);
  const setPants = useClothingStore((s) => s.setPants);

  const [category, setCategory] = useState<ClothingCategory>("coat");
  const [style, setStyle] = useState("Formal");
  const [color, setColor] = useState("Black");
  const [prompt, setPrompt] = useState("Formal black slim-fit blazer");
  const [imageRef, setImageRef] = useState<string | null>(null);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [generatedItem, setGeneratedItem] = useState<ClothingItem | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // File Upload Handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      if (evt.target?.result) {
        setImageRef(evt.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  // Clipboard Paste Handler (Snipping Tool / Screenshots)
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (evt) => {
            if (evt.target?.result) {
              setImageRef(evt.target.result as string);
            }
          };
          reader.readAsDataURL(file);
          break;
        }
      }
    }
  };

  // Drag and Drop Handler
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (evt.target?.result) {
          setImageRef(evt.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setStatusMsg(imageRef ? "Analyzing reference image with Gemini Vision AI..." : "Connecting to Gemini AI 3D Synthesizer...");
    setGeneratedItem(null);
    setSavedSuccess(false);

    try {
      setTimeout(() => setStatusMsg("Synthesizing PBR textures & 3D mesh..."), 1500);
      setTimeout(() => setStatusMsg("Fitting & rigging to target avatar..."), 3500);

      const res = await fetch("/api/generate-clothing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, prompt, style, color, avatarId, image: imageRef }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Generation failed");
      }

      const item: ClothingItem = data.item;
      setGeneratedItem(item);

      // Instantly equip live on the 3D avatar
      equipItem(item);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Generation failed";
      alert(`Generation Error: ${msg}`);
    } finally {
      setIsGenerating(false);
      setStatusMsg("");
    }
  };

  const equipItem = (item: ClothingItem) => {
    // Add dynamically to active CLOTHING catalog array if not present
    if (!CLOTHING.some((c) => c.id === item.id)) {
      CLOTHING.unshift(item);
    }

    if (item.category === "coat") setCoat(item.id);
    else if (item.category === "shirt") setShirt(item.id);
    else if (item.category === "pants") setPants(item.id);
  };

  const handleSaveToCatalog = () => {
    if (!generatedItem) return;
    if (!CLOTHING.some((c) => c.id === generatedItem.id)) {
      CLOTHING.unshift(generatedItem);
    }
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div
      onPaste={handlePaste}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      className="fixed right-6 top-20 z-40 w-96 max-h-[85vh] overflow-y-auto rounded-2xl border border-white/15 bg-[#0b0f15]/85 p-5 shadow-2xl backdrop-blur-xl transition-all duration-300 text-white"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div>
          <h2 className="text-base font-bold tracking-wide text-white flex items-center gap-2">
            <span className="text-[#c9a66b]">✨</span> Gemini 3D Clothing AI
          </h2>
          <p className="text-xs text-white/60">Generate & fit 3D garments from text or image</p>
        </div>
        <button
          onClick={() => setPanel(null)}
          className="rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-white"
        >
          ✕
        </button>
      </div>

      {/* Controls */}
      <div className="mt-4 space-y-4">
        {/* Category */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-white/70 mb-1.5">
            Clothing Type
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            {CATEGORIES.map((cat, idx) => {
              const isSelected = category === cat.value && (cat.label !== "T-Shirt" || style === "Casual");
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setCategory(cat.value);
                    if (cat.label === "T-Shirt") setStyle("Casual");
                    setPrompt(`${style} ${color} ${cat.label.toLowerCase()}`);
                  }}
                  className={`rounded-lg py-2 text-xs font-medium transition ${
                    isSelected
                      ? "bg-[#c9a66b] text-black font-semibold shadow"
                      : "bg-white/5 border border-white/10 text-white/80 hover:bg-white/10"
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Reference Image Upload / Snipping Tool Paste */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-white/70 mb-1.5">
            📷 Reference Image (Upload / Paste Snipping Tool)
          </label>
          
          {!imageRef ? (
            <label className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-white/25 bg-white/5 p-3.5 text-center cursor-pointer hover:border-[#c9a66b] hover:bg-white/10 transition">
              <span className="text-xs font-semibold text-[#c9a66b]">📷 Upload Image or Ctrl+V (Paste Screenshot)</span>
              <span className="text-[11px] text-white/50">Upload reference garment image or paste Snipping Tool screenshot</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          ) : (
            <div className="relative flex items-center gap-3 rounded-xl border border-[#c9a66b] bg-black/40 p-2.5">
              <img
                src={imageRef}
                alt="Garment Reference"
                className="h-16 w-16 rounded-lg object-cover border border-white/20"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-[#c9a66b] flex items-center gap-1">
                  ✨ Image Reference Attached
                </p>
                <p className="text-[11px] text-white/60 truncate">Gemini Vision AI active for texture & cut matching</p>
              </div>
              <button
                type="button"
                onClick={() => setImageRef(null)}
                className="rounded-full bg-red-500/20 p-1.5 text-xs text-red-400 hover:bg-red-500/40 transition"
                title="Remove Image"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {/* Style */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-white/70 mb-1.5">
            Style / Fit
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            {STYLES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setStyle(s);
                  setPrompt(`${s} ${color} ${category}`);
                }}
                className={`rounded-lg py-1.5 text-[11px] font-medium transition ${
                  style === s
                    ? "bg-[#c9a66b]/30 border border-[#c9a66b] text-[#c9a66b]"
                    : "bg-white/5 border border-white/10 text-white/70 hover:bg-white/10"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Color Palette */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-white/70 mb-1.5">
            Color Palette
          </label>
          <div className="flex flex-wrap gap-2">
            {COLORS.map((c) => (
              <button
                key={c.name}
                type="button"
                onClick={() => {
                  setColor(c.name);
                  setPrompt(`${style} ${c.name} ${category}`);
                }}
                className={`flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs transition ${
                  color === c.name
                    ? "border-[#c9a66b] bg-white/15 text-white"
                    : "border-white/10 bg-white/5 text-white/70 hover:border-white/20"
                }`}
              >
                <span
                  className="h-3 w-3 rounded-full border border-white/20"
                  style={{ backgroundColor: c.hex }}
                />
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* Text Prompt */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-white/70 mb-1.5">
            Garment Description / Prompt
          </label>
          <textarea
            rows={2}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe your desired 3D clothing garment..."
            className="w-full rounded-xl border border-white/15 bg-white/5 p-2.5 text-xs text-white placeholder-white/40 focus:border-[#c9a66b] focus:outline-none"
          />
        </div>

        {/* Status Message */}
        {isGenerating && (
          <div className="rounded-xl border border-[#c9a66b]/40 bg-[#c9a66b]/10 p-3 text-center">
            <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-[#c9a66b] border-t-transparent mb-1" />
            <p className="text-xs font-medium text-[#c9a66b] animate-pulse">{statusMsg}</p>
          </div>
        )}

        {/* Generate Button */}
        <button
          type="button"
          disabled={isGenerating}
          onClick={handleGenerate}
          className="w-full rounded-xl bg-gradient-to-r from-[#c9a66b] to-[#e6ca94] py-3 text-xs font-bold uppercase tracking-wider text-black shadow-lg shadow-[#c9a66b]/20 transition hover:brightness-110 disabled:opacity-50"
        >
          {isGenerating ? "Synthesizing 3D Clothing..." : "✨ Generate 3D Clothing"}
        </button>

        {/* Generated Item Actions */}
        {generatedItem && (
          <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                ✓ 3D Garment Fitted & Equipped!
              </span>
              <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-emerald-300 font-bold">
                Ready
              </span>
            </div>

            <p className="text-xs font-medium text-white/90">{generatedItem.name}</p>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => equipItem(generatedItem)}
                className="flex-1 rounded-lg border border-white/20 bg-white/10 py-1.5 text-[11px] font-semibold text-white hover:bg-white/20"
              >
                👕 Preview
              </button>

              <button
                type="button"
                onClick={handleGenerate}
                className="flex-1 rounded-lg border border-white/20 bg-white/10 py-1.5 text-[11px] font-semibold text-white hover:bg-white/20"
              >
                🔄 Regenerate
              </button>

              <button
                type="button"
                onClick={handleSaveToCatalog}
                className="flex-1 rounded-lg border border-emerald-500/50 bg-emerald-500/20 py-1.5 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-500/30"
              >
                {savedSuccess ? "Saved ✓" : "💾 Save"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
