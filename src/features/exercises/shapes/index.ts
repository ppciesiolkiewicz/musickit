import type { Timeline } from "../timeline/types";
import { arpeggioPart } from "./arpeggioPart";
import { chordSteps } from "./chordSteps";
import { isObj } from "./common";
import { melody } from "./melody";
import { progression } from "./progression";
import { soloOver } from "./soloOver";
import { twoScales } from "./twoScales";

export { arpeggioPart, chordSteps, melody, progression, soloOver, twoScales };
export { numeralChord } from "./numerals";
export type * from "./shapes.props";

const SHAPES: Record<string, (raw: unknown) => Timeline | null> = {
  progression, "two-scales": twoScales, "chord-steps": chordSteps, "arpeggio-part": arpeggioPart, melody, "solo-over": soloOver,
};

/** An AI-written shape (`{ shape: "progression", ... }`) expanded to a timeline; null when unknown or unusable. */
export function expandShape(raw: unknown): Timeline | null {
  if (!isObj(raw) || typeof raw.shape !== "string" || !Object.hasOwn(SHAPES, raw.shape)) return null;
  return SHAPES[raw.shape](raw);
}
