/**
 * The singing page's Intervals drill: a root from the scale on the staff, an interval to sing from it, and the target note
 * spelled as that interval (a 3rd up from E is a G of some kind, never an F𝄪). Pure functions, no React (tested).
 */
import { INTERVALS } from "@/lib/chordKit/intervals";
import { EAR_LEVELS } from "@/lib/practice/earGame";
import { spellName, type Ladder, type LadderNote, type Range } from "./singing";
import type { Spelled } from "./piano/key";

export type IntervalDirection = "up" | "down" | "both";

export interface IntervalQuestion {
  root: LadderNote;
  /** semitones from the root, + up */
  semis: number;
  target: Spelled;
}

const LETTERS: Spelled["letter"][] = ["C", "D", "E", "F", "G", "A", "B"];
const LETTER_PC = [0, 2, 4, 5, 7, 9, 11];
const GLYPH: Record<number, string> = { [-2]: "𝄫", [-1]: "♭", 0: "", 1: "♯", 2: "𝄪" };
const SHARPS = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];
/** letter steps of each simple interval (the tritone as an augmented 4th) */
const LETTER_STEPS: Record<number, number> = { 1: 1, 2: 1, 3: 2, 4: 2, 5: 3, 6: 3, 7: 4, 8: 5, 9: 5, 10: 6, 11: 6, 12: 7 };

/** The intervals a level sings (semitones), every one before it included. */
export const levelSemis = (level: number): number[] =>
  [...new Set(EAR_LEVELS.filter((l) => l.n <= level).flatMap((l) => l.semis))].sort((a, b) => a - b);

/** "major 3rd up", "perfect 5th down" */
export function intervalName(semis: number): string {
  const name = INTERVALS.find((i) => i.semis === Math.abs(semis))!.name;
  return `${name} ${semis < 0 ? "down" : "up"}`;
}

/** The note `semis` from `root`, spelled as that interval from the root's letter; a spelling past a double sharp or flat falls back to sharps. */
export function spellInterval(root: Spelled, semis: number): Spelled {
  const midi = root.midi + semis;
  const steps = Math.sign(semis) * LETTER_STEPS[Math.abs(semis)];
  const li = (((LETTERS.indexOf(root.letter) + steps) % 7) + 7) % 7;
  let alter = (((midi - LETTER_PC[li]) % 12) + 12) % 12;
  if (alter > 6) alter -= 12;
  const name = Math.abs(alter) <= 2 ? LETTERS[li] + GLYPH[alter] : SHARPS[((midi % 12) + 12) % 12];
  return spellName(name, midi);
}

/**
 * A question: a root from the ladder with the interval landing inside the range, a direction from the setting, and an
 * interval other than the last one asked when there is a choice. null when no root in the range fits any interval.
 */
export function nextIntervalQuestion(ladder: Ladder, range: Range, semis: number[], dir: IntervalDirection, rand: () => number, prev?: IntervalQuestion | null): IntervalQuestion | null {
  const signed = semis.flatMap((s) => (dir === "up" ? [s] : dir === "down" ? [-s] : [s, -s]));
  const fits = (r: LadderNote, s: number) => r.midi + s >= range.low && r.midi + s <= range.high;
  const usable = signed.filter((s) => ladder.notes.some((r) => fits(r, s)));
  if (!usable.length) return null;
  const pool = usable.length > 1 && prev ? usable.filter((s) => s !== prev.semis) : usable;
  const pick = <T>(xs: T[]) => xs[Math.min(xs.length - 1, Math.floor(rand() * xs.length))];
  const s = pick(pool);
  const root = pick(ladder.notes.filter((r) => fits(r, s)));
  return { root, semis: s, target: spellInterval(root.spelled, s) };
}
