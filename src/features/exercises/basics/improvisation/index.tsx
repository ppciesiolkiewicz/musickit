"use client";

import { PLUGINS } from "@/features/creator";
import KeyPanel from "../key-panel/KeyPanel";

const Panel = PLUGINS.find((p) => p.id === "improv")!.Component;

/** Ideas to improvise with in the key: a rhythm made from two counts against each other, and one short motive turned round, written in the key's notes. */
export function View({ pc, scale }: { pc: number; scale: string }) {
  return (
    <div data-tour="improvisation-panel">
      <KeyPanel pc={pc} scale={scale}><Panel /></KeyPanel>
    </div>
  );
}
