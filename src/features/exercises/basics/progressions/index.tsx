"use client";

import { PLUGINS } from "@/features/creator";
import KeyPanel from "../key-panel/KeyPanel";

const Panel = PLUGINS.find((p) => p.id === "progressions")!.Component;

/** Common chord progressions that suit the key's mode, written as chords in the key; tap one to hear it. */
export function View({ pc, scale }: { pc: number; scale: string }) {
  return (
    <div data-tour="progressions-panel">
      <KeyPanel pc={pc} scale={scale}><Panel /></KeyPanel>
    </div>
  );
}
