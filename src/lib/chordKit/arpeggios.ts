import { OPEN_MIDI } from "./shapeTools";
import { degreeLabel, type KeyContext } from "@/features/theory/theory";

/** Arpeggio qualities you can lay over any root of a scale. "diatonic" uses the chord the scale itself stacks there. */
export interface ArpQuality {
  id: string;
  label: string;
  /** semitones above the root for each chord tone */
  semis: number[];
  /** role labels, same order as semis */
  roles: string[];
}

export const ARP_QUALITIES: ArpQuality[] = [
  { id: "maj", label: "Major", semis: [0, 4, 7], roles: ["R", "3", "5"] },
  { id: "min", label: "Minor", semis: [0, 3, 7], roles: ["R", "♭3", "5"] },
  { id: "dim", label: "Diminished", semis: [0, 3, 6], roles: ["R", "♭3", "♭5"] },
  { id: "aug", label: "Augmented", semis: [0, 4, 8], roles: ["R", "3", "♯5"] },
  { id: "maj7", label: "Maj7", semis: [0, 4, 7, 11], roles: ["R", "3", "5", "7"] },
  { id: "7", label: "Dominant 7", semis: [0, 4, 7, 10], roles: ["R", "3", "5", "♭7"] },
  { id: "m7", label: "Min7", semis: [0, 3, 7, 10], roles: ["R", "♭3", "5", "♭7"] },
  { id: "m7b5", label: "Min7♭5", semis: [0, 3, 6, 10], roles: ["R", "♭3", "♭5", "♭7"] },
  { id: "dim7", label: "Dim7", semis: [0, 3, 6, 9], roles: ["R", "♭3", "♭5", "♭♭7"] },
  { id: "mmaj7", label: "Min(maj7)", semis: [0, 3, 7, 11], roles: ["R", "♭3", "5", "7"] },
];

export type ArpSource = "triad" | "seventh" | "ninth" | string;

export interface ArpNote {
  pc: number;
  name: string;
  role: string;
  /** true when the note is not in the underlying scale */
  outside: boolean;
}

export interface Arpeggio {
  rootPc: number;
  rootName: string;
  title: string;
  notes: ArpNote[];
}

const LETTERS = ["C", "D", "E", "F", "G", "A", "B"];
const LETTER_PC = [0, 2, 4, 5, 7, 9, 11];
const ACC: Record<string, string> = { "-2": "♭♭", "-1": "♭", "0": "", "1": "♯", "2": "♯♯" };

/** Name a pitch class using a given letter. */
function nameOn(letterIdx: number, pc: number): string {
  const diff = ((pc - LETTER_PC[letterIdx] + 18) % 12) - 6;
  const acc = ACC[String(diff)];
  if (acc !== undefined) return LETTERS[letterIdx] + acc;
  // beyond a double accidental: fall back to the plainest enharmonic spelling
  for (let i = 0; i < 7; i++) {
    const d = ((pc - LETTER_PC[i] + 18) % 12) - 6;
    if (Math.abs(d) <= 1) return LETTERS[i] + ACC[String(d)];
  }
  return LETTERS[letterIdx];
}

const ROLE_BY_STACK = ["R", "3", "5", "7", "9", "11", "13"];

/**
 * Build the arpeggio on scale degree `degree`.
 * `kind` is "triad" | "seventh" | "ninth" for the scale's own chord, or a quality id from ARP_QUALITIES.
 */
export function buildArpeggio(ctx: KeyContext, degree: number, kind: ArpSource): Arpeggio {
  const rootPc = (ctx.tonic.pc + ctx.steps[degree]) % 12;
  const rootName = ctx.names[degree];
  const rootLetter = LETTERS.indexOf(rootName[0]);
  const scalePcs = new Set(ctx.steps.map((s) => (ctx.tonic.pc + s) % 12));
  const q = ARP_QUALITIES.find((x) => x.id === kind);

  if (q) {
    const notes = q.semis.map((s, i) => {
      const pc = (rootPc + s) % 12;
      return { pc, name: nameOn((rootLetter + i * 2) % 7, pc), role: q.roles[i], outside: !scalePcs.has(pc) };
    });
    return { rootPc, rootName, title: `${rootName} ${q.label} arpeggio`, notes };
  }

  const count = kind === "triad" ? 3 : kind === "ninth" ? 5 : 4;
  const stack = [0, 2, 4, 6, 1].slice(0, count);
  const notes = stack.map((off, i) => {
    const sd = (degree + off) % 7;
    const pc = (ctx.tonic.pc + ctx.steps[sd]) % 12;
    const semis = (pc - rootPc + 12) % 12;
    return { pc, name: ctx.names[sd], role: diatonicRole(ROLE_BY_STACK[i], semis), outside: false };
  });
  const c = ctx.chords[degree];
  const label = kind === "triad" ? c.triadName : kind === "seventh" ? c.seventhName : `${rootName}${c.seventh.replace(/^7$/, "9").replace(/^maj7$/, "maj9").replace(/^m7$/, "m9")}`;
  return { rootPc, rootName, title: `${label} arpeggio`, notes };
}

function diatonicRole(role: string, semis: number): string {
  if (role === "R") return "R";
  const natural: Record<string, number> = { "3": 4, "5": 7, "7": 11, "9": 2, "11": 5, "13": 9 };
  const diff = ((semis - natural[role] + 18) % 12) - 6;
  return (diff < 0 ? "♭".repeat(-diff) : diff > 0 ? "♯".repeat(diff) : "") + role;
}

/* ---------------------------------------------------------------- the neck */

export const ARP_FRETS = 17;

export interface NeckCell {
  string: number; // 0 = low E
  fret: number;
  pc: number;
  midi: number;
  inScale: boolean;
  scaleDegree: number | null; // 0-based
  arp: ArpNote | null;
  /** note name for display: arpeggio spelling, else scale spelling */
  name: string;
  /** degree label in the key, e.g. "♭3" */
  degreeText: string;
  /** semitones above the key root */
  semi: number;
}

export function neckCells(ctx: KeyContext, arp: Arpeggio): NeckCell[] {
  const scalePcs = ctx.steps.map((s) => (ctx.tonic.pc + s) % 12);
  const out: NeckCell[] = [];
  for (let s = 0; s < 6; s++) {
    for (let f = 0; f <= ARP_FRETS; f++) {
      const midi = OPEN_MIDI[s] + f;
      const pc = midi % 12;
      const deg = scalePcs.indexOf(pc);
      const a = arp.notes.find((n) => n.pc === pc) ?? null;
      out.push({
        string: s, fret: f, pc, midi,
        inScale: deg >= 0,
        scaleDegree: deg >= 0 ? deg : null,
        arp: a,
        name: a ? a.name : deg >= 0 ? ctx.names[deg] : "",
        degreeText: degreeLabel(pc, ctx),
        semi: (pc - ctx.tonic.pc + 12) % 12,
      });
    }
  }
  return out;
}

/** Fret windows ("positions") for narrowing the neck. */
export const WINDOWS: { id: string; label: string; from: number; to: number }[] = [
  { id: "all", label: "Whole neck", from: 0, to: ARP_FRETS },
  { id: "p1", label: "Frets 0–4", from: 0, to: 4 },
  { id: "p2", label: "3–7", from: 3, to: 7 },
  { id: "p3", label: "5–9", from: 5, to: 9 },
  { id: "p4", label: "7–11", from: 7, to: 11 },
  { id: "p5", label: "9–13", from: 9, to: 13 },
  { id: "p6", label: "12–16", from: 12, to: 16 },
];

/** MIDI notes for playing the arpeggio up and back, starting on the root near C3. */
export function arpeggioMidi(arp: Arpeggio, octaves = 1): number[] {
  const root = 48 + arp.rootPc;
  const ups: number[] = [];
  for (let o = 0; o < octaves; o++) arp.notes.forEach((n) => ups.push(root + o * 12 + ((n.pc - arp.rootPc + 12) % 12)));
  // keep ascending (stacked thirds can wrap)
  for (let i = 1; i < ups.length; i++) while (ups[i] <= ups[i - 1]) ups[i] += 12;
  const top = ups[0] + 12 * octaves;
  return [...ups, top, ...ups.slice(1).reverse()];
}

/** An arpeggio shape that starts on its root (Do) on one string and climbs across the higher strings. */
export interface ArpPosition {
  /** unique per position, e.g. "0@12" */
  id: string;
  /** string the root sits on, 0 = low E */
  rootString: number;
  rootFret: number;
  /** lowest to highest pitch, each once */
  notes: NeckCell[];
  from: number;
  to: number;
}

/** Guitar string number for a 0 = low E index: 6 is the low E, 1 the high e. */
export const stringNumber = (s: number) => 6 - s;

/**
 * One position per root string, from the 6th string to the 2nd. Each starts on the root at its lowest fret on that string
 * (moved up an octave when the shape would run off the nut). A root on the open string gets two: open and at the 12th fret.
 * Each climbs one chord tone at a time. Every note goes on the
 * string, at or above the current one, whose fret lies closest to the root's, inside a hand span of two frets behind the
 * root to three past it.
 */
export function arpPositions(cells: NeckCell[]): ArpPosition[] {
  const at = (s: number, f: number) => cells.find((c) => c.string === s && c.fret === f);
  const out: ArpPosition[] = [];
  for (let rs = 0; rs < 5; rs++) {
    const roots = cells.filter((c) => c.string === rs && c.arp?.role === "R").map((c) => c.fret);
    const first = roots.find((f) => f >= 2) ?? roots[0];
    if (first === undefined) continue;
    for (const rootFret of roots[0] === 0 ? [0, 12] : [first]) {
    const lo = Math.max(0, rootFret - 2), hi = Math.min(ARP_FRETS, rootFret + 3);
    const notes: NeckCell[] = [at(rs, rootFret)!];
    for (let s = rs; ; ) {
      const last = notes[notes.length - 1].midi;
      let best: NeckCell | null = null;
      for (let midi = last + 1; midi <= last + 12 && !best; midi++) {
        for (let t = s; t < 6; t++) {
          const f = midi - OPEN_MIDI[t];
          const c = f >= lo && f <= hi ? at(t, f) : undefined;
          if (c?.arp && (!best || Math.abs(f - rootFret) < Math.abs(best.fret - rootFret))) best = c;
        }
      }
      if (!best) break;
      notes.push(best);
      s = best.string;
    }
    const frets = notes.map((n) => n.fret);
    out.push({ id: `${rs}@${rootFret}`, rootString: rs, rootFret, notes, from: Math.min(...frets), to: Math.max(...frets) });
    }
  }
  return out;
}
