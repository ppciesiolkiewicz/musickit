"use client";

import { PLUGINS } from "@/features/creator";
import KeyPanel from "../key-panel/KeyPanel";

const Panel = PLUGINS.find((p) => p.id === "circle")!.Component;

/** The circle of fifths, majors outside and their relative minors inside, with the key's neighbours marked: the keys next to it are the chords of the key. */
export function View({ pc, scale }: { pc: number; scale: string }) {
  return (
    <div data-tour="circle-of-fifths-panel">
      <KeyPanel pc={pc} scale={scale}><Panel /></KeyPanel>
    </div>
  );
}
