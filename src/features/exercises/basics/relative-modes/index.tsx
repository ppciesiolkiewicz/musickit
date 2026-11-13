"use client";

import ScaleRelatives from "@/components/chordKit/ScaleRelatives";
import { keyContext } from "@/features/creator";
import { useToolKey } from "../key-panel/KeyPanel";

/** The modes that share the key's notes, each starting from another note of the scale. */
export function View({ pc, scale }: { pc: number; scale: string }) {
  const [key, setKey] = useToolKey(pc, scale);
  const ctx = keyContext(key);
  return <div data-tour="relative-modes-panel">{ctx && <ScaleRelatives ctx={ctx} familyIndex={key.family} onPick={(s) => setKey({ ...key, tonicPc: s.tonicPc, mode: s.modeIndex })} />}</div>;
}
