"use client";

import { PLUGINS } from "@/features/creator";
import KeyPanel from "../key-panel/KeyPanel";

const Panel = PLUGINS.find((p) => p.id === "triads")!.Component;

/** One chord of the key as a triad in its three inversions on one group of three strings; the student picks the chord and the string group on the tool. */
export function View({ pc, scale }: { pc: number; scale: string }) {
  return (
    <div data-tour="triads-panel">
      <KeyPanel pc={pc} scale={scale}><Panel /></KeyPanel>
    </div>
  );
}
