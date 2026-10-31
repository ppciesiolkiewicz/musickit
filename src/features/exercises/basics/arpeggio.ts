import { parseChordQuery } from "@/lib/chordKit/chordSearch";
import { boxesOf } from "../cues/cues";
import { degreeSemis } from "../timeline/degrees";
import type { Degree } from "../timeline/types";

export interface ArpNote { string: number; fret: number; midi: number; semis: number; seam: boolean }

/**
 * The notes of a chord's arpeggio in one box or two neighbouring boxes, ascending by midi, each place once.
 * - Box N is `arpPositions` entry N - 1 (the numbering cues use); no `boxes` means box 1. Unknown boxes are skipped.
 * - `part` keeps only those degrees (major-relative to the chord root, not scale-aware: "3" is 4 semitones).
 * - `semis` is the note's semitones above the chord root (0-11).
 * - With two boxes, `seam` marks the places (same string and fret) both boxes hold; boxes sharing none get no seam.
 * Pure (tested).
 */
export function arpeggioPartNotes(chord: string, opts: { part?: Degree[]; boxes?: number[] } = {}): ArpNote[] {
  const q = parseChordQuery(chord);
  if (!q) return [];
  const all = boxesOf(chord);
  const picked = (opts.boxes?.length ? opts.boxes : [1]).map((b) => all[b - 1]).filter(Boolean);
  const keep = opts.part?.length ? new Set(opts.part.map(degreeSemis).filter((s): s is number => s !== null).map((s) => s % 12)) : null;
  const seen = new Map<string, number>();
  const out: ArpNote[] = [];
  for (const box of picked)
    for (const n of box.notes) {
      const semis = (((n.midi - q.rootPc) % 12) + 12) % 12;
      if (keep && !keep.has(semis)) continue;
      const key = `${n.string}:${n.fret}`;
      seen.set(key, (seen.get(key) ?? 0) + 1);
      if (seen.get(key) === 1) out.push({ string: n.string, fret: n.fret, midi: n.midi, semis, seam: false });
    }
  if (picked.length > 1) for (const n of out) n.seam = (seen.get(`${n.string}:${n.fret}`) ?? 0) > 1;
  return out.sort((a, b) => a.midi - b.midi || a.string - b.string);
}
