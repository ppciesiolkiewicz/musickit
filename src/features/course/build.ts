import { degreeColour } from "../theory/scales";
import { solfege } from "../theory/labels";
import { OPEN_PCS, type Dot, type Visual } from "../theory/course/visuals";
import type { CourseLink, Melody, Song } from "../theory/course/stages";
import type { MelodyNote } from "@/lib/chordKit/tab";
import type { NeckPath } from "./paths";
import type { Block, StrumPatternId } from "./model";

/** Small builders for course content, so the stage files read like lesson plans. */

export const text = (...paras: string[]): Block => ({ kind: "text", paras });
export const task = (t: string): Block => ({ kind: "task", text: t });
export const visual = (v: Visual): Block => ({ kind: "visual", visual: v });
export const links = (explore: CourseLink[], practise: CourseLink[] = []): Block => ({ kind: "links", explore, practise });
export const songs = (...s: Song[]): Block => ({ kind: "songs", songs: s });
export const melody = (m: Melody): Block => ({ kind: "melody", melody: m });
export const strum = (pattern: StrumPatternId, chords: string[], caption: string): Block => ({ kind: "strum", pattern, chords, caption });

type ChordEntry = string | { name: string; tag?: string; prefer?: string; voicing?: string; rootString?: number };
export const chords = (caption: string, list: ChordEntry[]): Block =>
  visual({ kind: "chords", caption, chords: list.map((c) => (typeof c === "string" ? { name: c } : c)) });

/** Interval names from the root, and which of the seven degree colours each belongs to. */
const DEGREE = ["R", "♭2", "2", "♭3", "3", "4", "♭5", "5", "♭6", "6", "♭7", "7"];
const NUMBER = ["1", "♭2", "2", "♭3", "3", "4", "♭5", "5", "♭6", "6", "♭7", "7"];
const COLOUR_INDEX = [0, 1, 1, 2, 2, 3, 4, 4, 5, 5, 6, 6];

export interface DotOpts {
  /** "R ♭3 5" (default) or "1 ♭3 5" (scale-number style for do-re-mi) */
  style?: "degree" | "number";
  /** show the solfège syllable under each dot */
  solfege?: boolean;
}

/** A dot for the note at string/fret, named and coloured by its distance from `rootPc`. */
export function toneDot(string: number, fret: number, rootPc: number, o: DotOpts = {}): Dot {
  const semi = (((OPEN_PCS[string] + fret - rootPc) % 12) + 12) % 12;
  const label = (o.style === "number" ? NUMBER : DEGREE)[semi];
  return { string, fret, label, fill: degreeColour(COLOUR_INDEX[semi]), big: semi === 0, ...(o.solfege ? { sub: solfege(DEGREE[semi]) } : {}) };
}

/** Every note of a scale or chord (semitones from the root) between two frets. */
export function toneDots(rootPc: number, semis: number[], from: number, to: number, o: DotOpts = {}): Dot[] {
  const out: Dot[] = [];
  for (let s = 0; s < 6; s++) for (let f = from; f <= to; f++) {
    const semi = (((OPEN_PCS[s] + f - rootPc) % 12) + 12) % 12;
    if (semis.includes(semi)) out.push(toneDot(s, f, rootPc, o));
  }
  return out;
}

/** A path through string/fret pairs, in playing order. */
export const path = (colour: string, ...points: [number, number][]): NeckPath => ({ colour, points: points.map(([string, fret]) => ({ string, fret })) });

/** Path colours that read on the dark neck and differ from the dot colours. */
export const PATH = { amber: "#f59e0b", sky: "#38bdf8", rose: "#fb7185", lime: "#a3e635", violet: "#a78bfa" };

/** A neck picture; the legend lists each label the dots use, in first-seen order. */
export function neck(caption: string, from: number, to: number, dots: Dot[], extra: { paths?: NeckPath[]; window?: { from: number; to: number }; legend?: { label: string; colour: string }[] } = {}): Block {
  const seen = new Map<string, string>();
  dots.forEach((d) => { if (!seen.has(d.label)) seen.set(d.label, d.fill); });
  const legend = extra.legend ?? [...seen].map(([label, colour]) => ({ label, colour }));
  return visual({ kind: "neck", caption, from, to, dots, legend, ...(extra.paths ? { paths: extra.paths } : {}), ...(extra.window ? { window: extra.window } : {}) });
}

/** MIDI numbers (C4 = 60) lit on the mini piano, labelled and coloured like the neck. */
export function pianoKeys(rootPc: number, midis: number[], o: DotOpts = {}): { midi: number; label: string; colour: string }[] {
  return midis.map((midi) => {
    const semi = (((midi - rootPc) % 12) + 12) % 12;
    const deg = (o.style === "number" ? NUMBER : DEGREE)[semi];
    return { midi, label: o.solfege ? solfege(DEGREE[semi]) : deg, colour: degreeColour(COLOUR_INDEX[semi]) };
  });
}

export const MAJOR_SEMIS = [0, 2, 4, 5, 7, 9, 11];
export const MINOR_SEMIS = [0, 2, 3, 5, 7, 8, 10];
export const E = 4, G = 7, A = 9, B = 11, C = 0, D = 2;

/** "E4 E4 F4 G4:2" → melody notes; a number after the colon is the length in beats. */
export const tune = (spec: string): MelodyNote[] => spec.trim().split(/\s+/).map((t) => {
  const [note, beats] = t.split(":");
  return { note, beats: beats ? Number(beats) : 1 };
});
