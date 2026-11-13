"use client";

import { PLUGINS } from "@/features/creator";
import KeyPanel from "../key-panel/KeyPanel";

const Panel = PLUGINS.find((p) => p.id === "tunings")!.Component;

/** An instrument's tuning, string by string, with the open strings that are notes of the key lit, since they ring freely in it; the student picks the instrument and the tuning on the tool. */
export function View({ pc, scale }: { pc: number; scale: string }) {
  return (
    <div data-tour="tunings-panel">
      <KeyPanel pc={pc} scale={scale}><Panel /></KeyPanel>
    </div>
  );
}
