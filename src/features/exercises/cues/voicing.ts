import { parseChordQuery } from "@/lib/chordKit/chordSearch";
import { shapesForTones } from "@/lib/chordKit/chordShapes";
import { shapeMidi, type RichShape } from "@/lib/chordKit/shapeTools";
import type { Voicing } from "../timeline/types";

export interface VoicedShape {
  shape: RichShape;
  /** fret of the root */
  fret: number;
  /** sounding notes, low to high */
  midi: number[];
  /** true when "barre" was asked for but no barre shape exists, so the open choice is used */
  fellBack: boolean;
}

/** A movable shape rooted on string 6 or 5 with every played string at or above the root fret. */
const isBarre = (sh: RichShape): boolean => sh.at === undefined && (sh.rs === 6 || sh.rs === 5) && sh.f.every((v) => v === null || v >= 0);

/**
 * The shape a chord name is played with. `open` is the chord-shapes tool's choice (first full shape of any
 * difficulty); `barre` is the full barre shape lowest on the neck, or the open choice with `fellBack`.
 */
export function chordShapeFor(name: string, voicing: Voicing): VoicedShape | null {
  const q = parseChordQuery(name);
  if (!q) return null;
  const full = shapesForTones(q.rootPc, q.semis, ["easy", "medium", "hard"]).filter((r) => r.full).map((r) => r.choice);
  const open = full[0];
  if (!open) return null;
  const barre = voicing === "barre" ? full.filter((c) => isBarre(c.shape)).sort((a, b) => a.fret - b.fret)[0] : undefined;
  const c = barre ?? open;
  return { shape: c.shape, fret: c.fret, midi: shapeMidi(c.shape, c.fret).sort((a, b) => a - b), fellBack: voicing === "barre" && !barre };
}
