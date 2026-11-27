import { chordLabel, parseChordQuery } from "@/lib/chordKit/chordSearch";
import { STRING_GROUPS, triadVoicings } from "@/lib/chordKit/triads";

/** One easier chord for a barre: what it is, one line on when it fits, and its frets as `chord-shapes` takes them. */
export interface Alternative {
  title: string;
  text: string;
  chord: string;
  /** six numbers or "x", low E first */
  frets: string;
}

export type AlternativesResult =
  | { ok: true; chord: string; minor: boolean; items: Alternative[] }
  | { ok: false; reason: "empty" | "unknown" | "type" };

/** Open chords that need no barre, by root pitch class (C = 0). */
const OPEN_MAJOR: Record<number, string> = { 0: "x 3 2 0 1 0", 2: "x x 0 2 3 2", 4: "0 2 2 1 0 0", 7: "3 2 0 0 0 3", 9: "x 0 2 2 2 0" };
const OPEN_MINOR: Record<number, string> = { 2: "x x 0 2 3 1", 4: "0 2 2 0 0 0", 9: "x 0 2 2 1 0" };

const fretsOf = (fs: (number | null)[]) => fs.map((f) => (f === null ? "x" : String(f))).join(" ");
/** The fret that sounds `pc` on an open string tuned to `open`, at or above `min`. */
const fretFor = (pc: number, open: number, min = 0) => {
  let f = (((pc - open) % 12) + 12) % 12;
  while (f < min) f += 12;
  return f;
};

/**
 * The lowest closed triad on three strings ("321" the top three, "432" the middle), in the inversions that put its root on a
 * string a chord box can name it from (not the B string), never needing an open string.
 */
function lowestTriad(rootPc: number, minor: boolean, id: "321" | "432"): string | null {
  const group = STRING_GROUPS.find((g) => g.id === id);
  if (!group) return null;
  const invs = id === "321" ? ([0, 1] as const) : ([0, 2] as const);
  const all = invs.flatMap((inv) => triadVoicings(rootPc, minor ? "min" : "maj", inv, group)).filter((v) => v.lowestFret >= 1);
  const best = all.sort((a, b) => a.lowestFret - b.lowestFret)[0];
  if (!best) return null;
  const fs: (number | null)[] = [null, null, null, null, null, null];
  group.strings.forEach((s, i) => (fs[s] = best.frets[i]));
  return fretsOf(fs);
}

/**
 * Easier chords that do a major or minor barre's job, as `barre-chord-alternatives` teaches them: the barre itself to
 * compare, the open chord where there is one, then the stand-ins, easiest first.
 */
export function barreAlternatives(query: string): AlternativesResult {
  if (!query.trim()) return { ok: false, reason: "empty" };
  const q = parseChordQuery(query);
  if (!q) return { ok: false, reason: "unknown" };
  const semis = [...q.semis].sort((a, b) => a - b).join(",");
  if (semis !== "0,4,7" && semis !== "0,3,7") return { ok: false, reason: "type" };
  const minor = semis === "0,3,7";
  const name = chordLabel(query);
  const root = name.replace(/m$/, "");
  const R = q.rootPc;
  const e = fretFor(R, 4); // root on the low E string
  const a = fretFor(R, 9); // root on the A string
  const items: Alternative[] = [];

  const open = (minor ? OPEN_MINOR : OPEN_MAJOR)[R];
  if (open) items.push({ title: "Open chord", text: `${name} has an open shape, no barre needed.`, chord: name, frets: open });
  else {
    const useE = e >= 1 && (e <= a || a < 1);
    const barre = minor
      ? useE ? [e, e + 2, e + 2, e, e, e] : [null, a, a + 2, a + 2, a + 1, a]
      : useE ? [e, e + 2, e + 2, e + 1, e, e] : [null, a, a + 2, a + 2, a + 2, a];
    items.push({ title: "The barre", text: "The full barre, to compare.", chord: name, frets: fretsOf(barre) });
  }

  if (minor) {
    if (a >= 1) items.push({ title: "Four strings", text: "The open Am shape moved up, on the top four strings. Nothing added, only the low root left out, so it fits almost anywhere the barre does.", chord: name, frets: fretsOf([null, null, a + 2, a + 2, a + 1, a]) });
  } else {
    if (R === 11) items.push({ title: "B7", text: "Adds the ♭7. Fits where B goes to E or Em.", chord: "B7", frets: "x 2 1 2 0 2" });
    const mid = lowestTriad(R, false, "432");
    if (mid) items.push({ title: "Three strings in the middle", text: "The chord's three notes on the D, G and B strings, and nothing else. Slide it along the neck for other chords.", chord: name, frets: mid });
    if (R === 5) items.push({ title: "Fmaj7", text: "Adds the 7th on the open high e string. Softer than F, so try it in the song first.", chord: "Fmaj7", frets: "x x 3 2 1 0" });
    items.push({ title: "maj7, root on the low E", text: "Adds the 7th. Softer and dreamier than the barre.", chord: `${root}maj7`, frets: fretsOf([e, null, e + 1, e + 1, e, null]) });
  }
  const top = lowestTriad(R, minor, "321");
  if (top) items.push({ title: "Top three strings", text: "Thinner than the barre, for a quiet part or when someone else plays the low notes.", chord: name, frets: top });
  if (!minor) {
    const n = fretFor(R, 9, 1);
    items.push({ title: "9 chord", text: "Adds the ♭7 and the 9th: funky and bluesy, for a blues or a funk song.", chord: `${root}9`, frets: fretsOf([null, n, n - 1, n, n, null]) });
  }
  return { ok: true, chord: name, minor, items };
}
