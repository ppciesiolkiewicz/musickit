import { Chord, Interval, Note } from "@tonaljs/tonal";
import { ALL_SHAPES, matchesTags, shapeName, type Entry } from "./shapeTools";
import type { ChordShapeChoice } from "./chordShapes";

/**
 * Read a chord symbol typed by a person ("am7", "Bb maj7", "F♯m") with tonal.
 * Returns null unless there is a root note and a known chord type, so plain words fall through to text search.
 */
export function parseChordQuery(q: string): { rootPc: number; semis: number[]; name: string } | null {
  const sym = toSymbol(q);
  if (!sym) return null;
  const ch = Chord.get(sym);
  if (ch.empty || !ch.tonic) return null;
  const rootPc = Note.chroma(ch.tonic);
  if (rootPc === undefined || Number.isNaN(rootPc)) return null;
  const semis = [...new Set(ch.intervals.map((iv) => (((Interval.semitones(iv) ?? 0) % 12) + 12) % 12))];
  return { rootPc, semis, name: q.trim() };
}

/** A typed chord as a tonal symbol: spaces, unicode accidentals, Δ, (maj7), MAJ/MIN and a slash bass are tidied; null if it can't start with a note. */
function toSymbol(q: string): string | null {
  let s = q.trim().replace(/\s+/g, "").replace(/♯/g, "#").replace(/♭/g, "b").replace(/Δ/g, "maj").replace(/\(maj7\)/gi, "Maj7").replace(/\/[A-Ga-g][#b]?$/, "");
  if (!/^[a-g]/i.test(s)) return null;
  s = s[0].toUpperCase() + s.slice(1).replace(/MAJ/g, "maj").replace(/MIN/g, "min");
  return s;
}

/** A neat name for a typed chord ("bb maj7" → "B♭maj7"), or the trimmed text when it is not a chord. */
export function chordLabel(q: string): string {
  const sym = toSymbol(q);
  const ch = sym ? Chord.get(sym) : null;
  if (!sym || !ch || ch.empty || !ch.tonic) return q.trim();
  const root = ch.tonic.replace("#", "♯").replace(/^([A-G])b/, "$1♭");
  const suffix = ch.type === "major" ? "" : ch.type === "minor" ? "m" : sym.slice(ch.tonic.length);
  return root + suffix;
}

const LIBRARY_TAGS = new Set(ALL_SHAPES.flatMap((s) => s.tags));

/** Free-text match over a shape's name, suffix, variant, tags and note. Every word must match. */
export function matchesText(e: Entry, q: string): boolean {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const sh = e.shape;
  const hay = [shapeName(sh.suf), sh.suf, sh.v ?? "", ...sh.tags, sh.note ?? ""].join(" ").toLowerCase();
  return words.every((w) => (LIBRARY_TAGS.has(w) ? sh.tags.includes(w) : hay.includes(w)));
}

/** Chord search results narrowed by the explorer's tag chips (OR within a row, AND between rows), order kept. */
export const filterChoices = (choices: ChordShapeChoice[], selected: string[]): ChordShapeChoice[] =>
  choices.filter((c) => matchesTags({ shape: c.shape }, selected));
