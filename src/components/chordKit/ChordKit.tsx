"use client";

import { useState } from "react";
import ShapesTab from "./ShapesTab";
import KeyTab from "./KeyTab";
import ProgressionsTab from "./ProgressionsTab";

const TABS = [
  { id: "shapes", label: "Shapes", hint: "Every movable chord shape, no key needed" },
  { id: "key", label: "In a key", hint: "Pick a key and mode, see the chords that fit" },
  { id: "prog", label: "Progressions", hint: "Forms in modes with shapes to use and neck positions" },
] as const;

export default function ChordKit() {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("shapes");
  const current = TABS.find((t) => t.id === tab)!;
  return (
    <div className="flex flex-col gap-4">
      <div role="tablist" aria-label="Chord explorer sections" className="flex gap-1 overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60 p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`whitespace-nowrap rounded-lg px-4 py-1.5 text-sm transition ${tab === t.id ? "bg-sky-500/20 text-sky-100" : "text-slate-400 hover:text-slate-200"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <p className="text-xs text-slate-500">{current.hint}</p>
      {tab === "shapes" && <ShapesTab />}
      {tab === "key" && <KeyTab />}
      {tab === "prog" && <ProgressionsTab />}
    </div>
  );
}
