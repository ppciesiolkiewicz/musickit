"use client";

import { PLUGINS } from "@/features/creator";
import KeyPanel from "../key-panel/KeyPanel";

const Panel = PLUGINS.find((p) => p.id === "scale")!.Component;

/** The notes of the key on one panel: spelled, numbered from the root and coloured by degree, with the step pattern and what the mode is used for. */
export function View({ pc, scale }: { pc: number; scale: string }) {
  return (
    <div data-tour="mode-intervals-panel">
      <KeyPanel pc={pc} scale={scale}><Panel /></KeyPanel>
    </div>
  );
}
