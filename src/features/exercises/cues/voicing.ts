import { parseChordQuery } from "@/lib/chordKit/chordSearch";
import { shapesForTones } from "@/lib/chordKit/chordShapes";
import { ALL_SHAPES, fitsRoot, OPEN_NOTE, rootFretFor, shapeDifficulty, shapeMidi, type RichShape } from "@/lib/chordKit/shapeTools";
import type { RootString } from "@/lib/chordKit/shapes";
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

/** Which RootString each string index (0 = low E) is; the B string is never a shape's root string. */
const ROOT_STRING_AT: (RootString | null)[] = [6, 5, 4, 3, null, 1];

/**
 * A chord played with exactly these frets, written by a person (never the AI): six fret numbers or "x", low E first
 * ("5 7 7 5 x x"). Null when the frets don't parse, play a note outside the chord, or have no root on a string a shape can
 * be rooted on. Fingers come after a bar when written ("1 x 2 2 1 x | 1 x 3 4 2 x"), else from a library shape that frets the
 * same strings the same way, when there is one.
 */
export function shapeFromFrets(name: string, frets: string): VoicedShape | null {
  const q = parseChordQuery(name);
  const [fretPart, fingerPart] = frets.split("|");
  const tokens = fretPart.trim().split(/\s+/);
  if (!q || tokens.length !== 6) return null;
  const abs = tokens.map((t) => (/^x$/i.test(t) ? null : /^\d{1,2}$/.test(t) && Number(t) <= 24 ? Number(t) : undefined));
  if (abs.some((a) => a === undefined) || abs.every((a) => a === null)) return null;
  const want = new Set(q.semis.map((s) => ((s % 12) + 12) % 12));
  const semiAt = (i: number) => (((OPEN_NOTE[i] + (abs[i] as number) - q.rootPc) % 12) + 12) % 12;
  const played = abs.flatMap((a, i) => (a === null ? [] : [i]));
  if (!played.every((i) => want.has(semiAt(i)))) return null;
  const rootOn = played.find((i) => semiAt(i) === 0 && ROOT_STRING_AT[i] !== null);
  // a root only on the B string (the D shape's triad, x x 12 13 12 x … on G B e): the shape is anchored on the low E string,
  // not played, at the fret under the lowest played note that gives the root
  const rootOnB = rootOn === undefined && played.some((i) => semiAt(i) === 0);
  if (rootOn === undefined && !rootOnB) return null;
  const ri = rootOn ?? 0;
  const lowest = Math.min(...played.map((i) => abs[i] as number));
  let anchor = (((q.rootPc - OPEN_NOTE[0]) % 12) + 12) % 12;
  while (anchor + 12 <= lowest) anchor += 12;
  const rootFret = rootOn === undefined ? anchor : (abs[ri] as number);
  const f = abs.map((a) => (a === null ? null : (a as number) - rootFret));
  const semis = [...new Set(played.map(semiAt))].sort((a, b) => a - b);
  const third = semis.some((s) => s === 3 || s === 4);
  // fingers from a library shape: one with the same root string and these frets (an open shape moved up only when none of
  // these strings was open in it: B7's open B string can't lend C7 a finger), else a bigger shape that holds every one
  // of these notes on the same frets (the four-string Bm x x 4 4 3 2 takes the full Bm barre's fingers)
  const holds = (s: RichShape): boolean => {
    if (!s.fg || !fitsRoot(s, q.rootPc)) return false;
    const off = s.f[played[0]];
    if (off === null) return false;
    const at = (abs[played[0]] as number) - off;
    if (s.at !== undefined ? at !== s.at : (((at - rootFretFor(s, q.rootPc)) % 12) + 12) % 12 !== 0) return false;
    return played.every((i) => s.f[i] !== null && (s.f[i] as number) + at === abs[i] && (abs[i] !== 0 || s.fg![i] === 0));
  };
  const lib = ALL_SHAPES.find((s) => s.fg && (s.at === undefined || s.at === rootFret || played.every((i) => s.fg![i] !== 0)) && s.rs === ROOT_STRING_AT[ri] && played.every((i) => s.f[i] === f[i] && (abs[i] !== 0 || s.fg![i] === 0))) ?? ALL_SHAPES.find(holds);
  // fingers written after a bar ("1 x 2 2 1 x | 1 x 3 4 2 x"): one per string, 1 to 4, x on a muted string; they win
  const own = fingerPart?.trim().split(/\s+/);
  if (own && (own.length !== 6 || own.some((g, i) => (abs[i] === null ? !/^x$/i.test(g) : !/^[0-4]$/.test(g))))) return null;
  const fg = own ? own.map((g) => (/^x$/i.test(g) ? null : Number(g))) : lib?.fg?.map((g, i) => (abs[i] === null ? null : g));
  const shape: RichShape = {
    id: -1, rs: ROOT_STRING_AT[ri] as RootString, suf: "", fam: third && semis.includes(3) ? "minor" : "major", ext: "triad", f, tags: [], exp: semis,
    ...(third && semis.includes(2) ? { n: { 2: "9" } } : {}),
    ...(fg ? { fg } : {}),
    diff: shapeDifficulty({ f }), fit: [],
  };
  return { shape, fret: rootFret, midi: shapeMidi(shape, rootFret).sort((a, b) => a - b), fellBack: false };
}
