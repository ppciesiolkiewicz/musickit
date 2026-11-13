"use client";

import { ChordBubble } from "@/components/chordKit/ChordBubbles";
import { keyChoiceFor, keyContext } from "@/features/creator";

/** One chord of the key in the middle, with its sus and extended chords around it (sus2, sus4, add9, 7th, 9th); tap one to hear it. */
export function View({ pc, scale, degree }: { pc: number; scale: string; degree: number }) {
  const ctx = keyContext(keyChoiceFor(pc, scale));
  return <div data-tour="chord-circle-panel">{ctx && <ChordBubble ctx={ctx} degree={degree - 1} />}</div>;
}
