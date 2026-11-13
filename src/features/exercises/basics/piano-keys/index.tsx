"use client";

import { PLUGINS } from "@/features/creator";
import KeyPanel from "../key-panel/KeyPanel";

const Panel = PLUGINS.find((p) => p.id === "keys")!.Component;

/** A piano keyboard with the key's notes marked in their degree colours; tap a key to hear it. */
export function View({ pc, scale }: { pc: number; scale: string }) {
  return (
    <div data-tour="piano-keys-panel">
      <KeyPanel pc={pc} scale={scale}><Panel /></KeyPanel>
    </div>
  );
}
