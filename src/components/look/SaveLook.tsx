"use client";

import { useState } from "react";
import { useLookStore } from "@/store/lookStore";

export function SaveLook() {
  const saveLook = useLookStore((s) => s.saveLook);
  const [name, setName] = useState("");
  const [saved, setSaved] = useState(false);

  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        saveLook(name || "Untitled Look");
        setName("");
        setSaved(true);
        setTimeout(() => setSaved(false), 1500);
      }}
    >
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Look name"
        className="min-w-0 flex-1 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-[#f4f1ea] outline-none placeholder:text-white/30 focus:border-[#c9a66b]/40"
      />
      <button
        type="submit"
        className="rounded-xl bg-[#c9a66b]/30 px-3 py-2 text-sm text-[#f4f1ea] hover:bg-[#c9a66b]/45"
      >
        {saved ? "Saved" : "Save"}
      </button>
    </form>
  );
}
