import { Chord, Interval, Note } from "@tonaljs/tonal";
import { shapeName, type Entry } from "./shapeTools";

/**
 * Read a chord symbol typed by a person ("am7", "Bb maj7", "F♯m") with tonal.
 * Returns null unless there is a root note and a known chord type, so plain words fall through to text search.
 */
export function parseChordQuery(q: string): { rootPc: number; semis: number[]; name: string } | null {
  const s = q.trim().replace(/\s+/g, "").replace(/♯/g, "#").replace(/♭/g, "b");
  if (!/^[a-g]/i.test(s)) return null;
  const sym = s[0].toUpperCase() + s.slice(1);
  const ch = Chord.get(sym);
  if (ch.empty || !ch.tonic) return null;
  const rootPc = Note.chroma(ch.tonic);
  if (rootPc === undefined || Number.isNaN(rootPc)) return null;
  const semis = [...new Set(ch.intervals.map((iv) => (((Interval.semitones(iv) ?? 0) % 12) + 12) % 12))];
  return { rootPc, semis, name: q.trim() };
}

/** Free-text match over a shape's name, suffix, variant, tags and note. Every word must match. */
export function matchesText(e: Entry, q: string): boolean {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const sh = e.shape;
  const hay = [shapeName(sh.suf), sh.suf, sh.v ?? "", ...sh.tags, sh.note ?? ""].join(" ").toLowerCase();
  return words.every((w) => hay.includes(w));
}
