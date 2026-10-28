import { parseChordQuery } from "@/lib/chordKit/chordSearch";
import { shapesForTones, type ChordShapeChoice } from "@/lib/chordKit/chordShapes";
import { DEGREE_COLOURS, degreeColour } from "../theory/scales";
import type { NeckPath } from "./paths";

/**
 * What a course section shows next to its text: the same chord boxes, necks, circle and scale wheels the explorers use,
 * set up for that lesson. Pure data so the section page stays a server component and the shapes can be tested.
 */
/** `sub` is a second, smaller label under the dot (e.g. solfège under a degree). */
export interface Dot { string: number; fret: number; label: string; fill: string; big?: boolean; sub?: string; outline?: boolean }
export type Visual =
  | { kind: "chords"; caption: string; chords: { name: string; tag?: string; prefer?: string; voicing?: string; rootString?: number }[] }
  | { kind: "neck"; caption: string; from: number; to: number; dots: Dot[]; window?: { from: number; to: number }; legend: { label: string; colour: string }[]; paths?: NeckPath[] }
  | { kind: "circle"; caption: string }
  /** keys lit on a small piano, to set beside the same notes on the neck */
  | { kind: "piano"; caption: string; keys: { midi: number; label: string; colour: string }[]; from?: number; octaves?: number }
  | { kind: "wheels"; caption: string; wheels: { name: string; mood: string; steps: number[] }[] };

/** Open-string pitch classes, low E (string 0) to high e. */
export const OPEN_PCS = [4, 9, 2, 7, 11, 4];
const LETTERS = ["C", "D", "E", "F", "G", "A", "B"];
const NATURAL_PCS = [0, 2, 4, 5, 7, 9, 11];

/** The natural notes on some strings, each letter in its own colour so the same note is easy to spot on both strings. */
export function naturalDots(strings: number[], to: number): Dot[] {
  return strings.flatMap((s) => Array.from({ length: to + 1 }, (_, f) => f).flatMap((f) => {
    const li = NATURAL_PCS.indexOf((OPEN_PCS[s] + f) % 12);
    return li < 0 ? [] : [{ string: s, fret: f, label: LETTERS[li], fill: DEGREE_COLOURS[li], big: f === 0 }];
  }));
}

/** A scale on the neck between two frets, coloured and labelled by degree; `degrees` maps each step to its 0–6 degree and label. */
export function scaleDots(rootPc: number, steps: number[], degrees: { d: number; label: string }[], from: number, to: number): Dot[] {
  const out: Dot[] = [];
  for (let s = 0; s < 6; s++) for (let f = from; f <= to; f++) {
    const i = steps.indexOf((((OPEN_PCS[s] + f - rootPc) % 12) + 12) % 12);
    if (i >= 0) out.push({ string: s, fret: f, label: degrees[i].label, fill: degreeColour(degrees[i].d), big: degrees[i].d === 0 });
  }
  return out;
}

/**
 * The shape a lesson shows for a chord name: the lowest-fret full shape of the named `voicing` (e.g. "drop 3"), optionally on one root string,
 * else the first one tagged `prefer` (e.g. "barre"), else the simplest full voicing.
 */
export function lessonShape(name: string, prefer?: string, voicing?: string, rootString?: number): ChordShapeChoice | undefined {
  const q = parseChordQuery(name);
  if (!q) return undefined;
  const all = shapesForTones(q.rootPc, q.semis, ["easy", "medium", "hard"]).filter((r) => r.full).map((r) => r.choice);
  // shape search places an open-position shape at fret 12; a lesson wants it at the nut
  const voiced = voicing ? all.filter((c) => c.shape.v === voicing && (!rootString || c.shape.rs === rootString)).map((c) => ({ ...c, fret: c.fret % 12 })).sort((a, b) => a.fret - b.fret)[0] : undefined;
  return voiced ||(prefer && all.find((c) => c.shape.tags.includes(prefer))) || all[0];
}
