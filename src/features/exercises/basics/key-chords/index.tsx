"use client";

import ScaleChords from "@/components/chordKit/ScaleChords";
import { keyChoiceFor, keyContext } from "@/features/creator";

/** The chord on every note of the scale, with its numeral; tap a chord to hear it. */
export function View({ pc, scale }: { pc: number; scale: string }) {
  const ctx = keyContext(keyChoiceFor(pc, scale));
  return <div data-tour="key-chords-panel">{ctx && <ScaleChords ctx={ctx} />}</div>;
}
