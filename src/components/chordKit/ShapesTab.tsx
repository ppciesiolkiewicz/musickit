"use client";

import { useMemo } from "react";
import ShapeBrowser from "./ShapeBrowser";
import { plainEntries } from "@/lib/chordKit/shapeTools";

/** The key-free explorer: every movable shape, once. */
export default function ShapesTab() {
  const entries = useMemo(() => plainEntries(), []);
  return (
    <ShapeBrowser
      entries={entries}
      header={<p className="text-xs text-slate-400">Every movable shape, drawn once. Slide the root fret, tap a diagram to hear it, tap tags to filter.</p>}
    />
  );
}
