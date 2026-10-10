import { TONICS, degreeLabel, type KeyContext } from "./theory";
import { degreeLabels } from "./scales";

/** How a note on the neck is labelled: its name, its interval from the root (R b3 p5), its scale degree, or its job in the chord. */
export type LabelSystem = "note" | "interval" | "degree" | "chord";

export const LABEL_SYSTEMS: { id: LabelSystem; label: string; hint: string }[] = [
  { id: "note", label: "Note names", hint: "C, E, G" },
  { id: "interval", label: "Intervals", hint: "R, b3, p5" },
  { id: "degree", label: "Scale degrees", hint: "1, b3, 5" },
  { id: "chord", label: "Chord tones", hint: "R, 3, 5, 7" },
];

export const DEFAULT_LABEL_SYSTEM: LabelSystem = "note";

const INTERVALS = ["R", "b2", "2", "b3", "3", "p4", "b5", "p5", "b6", "6", "b7", "7"];

/** Interval from the root by semitones: 0 "R", 3 "b3", 7 "p5". */
export function intervalName(semi: number): string {
  return INTERVALS[((semi % 12) + 12) % 12];
}

/** Rewrite a role or degree such as "♭3", "5", "♯4", "11" in the same style: b3, p5, #4, p11. Perfect intervals get a "p". */
export function fmtInterval(label: string): string {
  const s = label.replace(/♭/g, "b").replace(/♯/g, "#");
  return /^(4|5|11)$/.test(s) ? "p" + s : s;
}

/** Scale degree with ASCII accidentals: "b3", "5". */
export function fmtDegree(label: string): string {
  return label.replace(/♭/g, "b").replace(/♯/g, "#");
}

export interface LabelInput {
  name: string;
  /** semitones above the key's root */
  semi: number;
  degreeText: string;
  /** the note's job in the chord, when it has one */
  role?: string | null;
}

export function noteLabel(system: LabelSystem, c: LabelInput): string {
  switch (system) {
    case "note": return c.name;
    case "interval": return intervalName(c.semi);
    case "degree": return fmtDegree(c.degreeText);
    case "chord": return c.role ? fmtInterval(c.role) : intervalName(c.semi);
  }
}

export function isLabelSystem(v: unknown): v is LabelSystem {
  return v === "note" || v === "interval" || v === "degree" || v === "chord";
}

const LETTERS = "CDEFGAB";
const LETTER_PC = [0, 2, 4, 5, 7, 9, 11];
const ACC: Record<number, string> = { [-2]: "♭♭", [-1]: "♭", 0: "", 1: "♯", 2: "♯♯" };

/** Spell pitch class `pc` as the `n`th note above a root named `rootName` (so the 3rd of A♭ is C, not B♯). */
export function spellAbove(rootName: string, n: number, pc: number): string | null {
  const li = LETTERS.indexOf(rootName[0]);
  if (li < 0) return null;
  const L = (li + n - 1) % 7;
  const diff = ((pc - LETTER_PC[L] + 18) % 12) - 6;
  return ACC[diff] === undefined ? null : LETTERS[L] + ACC[diff];
}

export interface ToneInput {
  /** pitch class of the chord root (C = 0) */
  rootPc: number;
  /** the root's spelling, when known ("E♭"); used to spell the other tones */
  rootName?: string;
  /** semitones above the chord root */
  semi: number;
  /** the tone's job in the chord: "R", "♭3", "5", "9" */
  role: string;
  /** the key, when there is one; intervals and degrees are then counted from its tonic */
  ctx?: KeyContext;
}

/** Label for one tone of a chord shape in the chosen system. Without a key, intervals and degrees count from the chord root. */
export function toneLabel(system: LabelSystem, t: ToneInput): string {
  const pc = (((t.rootPc + t.semi) % 12) + 12) % 12;
  const fromKey = t.ctx ? pc - t.ctx.tonic.pc : t.semi;
  switch (system) {
    case "note": {
      const inKey = t.ctx ? t.ctx.steps.findIndex((st) => (t.ctx!.tonic.pc + st) % 12 === pc) : -1;
      if (inKey >= 0) return t.ctx!.names[inKey];
      const n = t.role === "R" ? 1 : Number(t.role.replace(/[^0-9]/g, ""));
      const root = t.rootName ?? TONICS.find((x) => x.pc === ((t.rootPc % 12) + 12) % 12)!.name;
      return (n && spellAbove(root, n, pc)) || TONICS.find((x) => x.pc === pc)!.name;
    }
    case "interval": return intervalName(fromKey);
    case "degree": return t.ctx ? fmtDegree(degreeLabel(pc, t.ctx)) : t.role === "R" ? "1" : fmtDegree(t.role);
    case "chord": return fmtInterval(t.role);
  }
}

/** Label for the `i`th note of a scale. Degrees are written against the major scale (♭3, ♯4); a scale has no chord, so "chord" shows degrees too. */
export function scaleToneLabel(system: LabelSystem, ctx: KeyContext, i: number): string {
  switch (system) {
    case "note": return ctx.names[i];
    case "interval": return intervalName(ctx.steps[i]);
    default: return fmtDegree(degreeLabels(ctx.steps)[i]);
  }
}

/** The second line under a labelled dot: the degree when the dot shows names, otherwise the name. */
export function scaleToneCaption(system: LabelSystem, ctx: KeyContext, i: number): string {
  return system === "note" ? fmtDegree(degreeLabels(ctx.steps)[i]) : ctx.names[i];
}

/** Label for a note of a chord built on the scale (see `modeChords`): its name, interval or degree in the key, or its job in the chord. */
export function chordNoteLabel(system: LabelSystem, ctx: KeyContext, n: { name: string; role: string; scaleDegree: number }): string {
  if (system === "note") return n.name;
  if (system === "chord") return fmtInterval(n.role);
  return scaleToneLabel(system, ctx, n.scaleDegree);
}
