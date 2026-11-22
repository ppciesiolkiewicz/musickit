import { place } from "@/features/theory/piano/staff";
import type { Spelled } from "@/features/theory/piano/key";
import { spellName } from "@/features/theory/singing";

/*
 * staff-reading: the game of naming a note on the staff, as pure functions. Which notes a set holds, the next note to
 * ask, whether an answer (a letter tapped, or a pitch class the mic heard) is right, and the words that say where a
 * note sits. Where a note sits comes from the staff's own `place`, so the game and the drawing cannot disagree.
 * Natural notes only: no key signature, no sharps or flats.
 */

export const READING_CLEFS = ["treble", "bass"] as const;
export type ReadingClef = (typeof READING_CLEFS)[number];
export const isReadingClef = (v: unknown): v is ReadingClef => READING_CLEFS.includes(v as ReadingClef);

/**
 * The sets of notes the game asks, easiest first: the five lines, the four spaces, both together, the notes outside
 * the staff (two ledger lines each way, with the note just under and just above the staff), and every one of them.
 */
export const READING_SETS = ["lines", "spaces", "staff", "ledger", "all"] as const;
export type ReadingSet = (typeof READING_SETS)[number];
export const isReadingSet = (v: unknown): v is ReadingSet => READING_SETS.includes(v as ReadingSet);

/** The lowest and highest staff step asked: step 0 is the bottom line, 8 the top line, one step a line or a space. */
export const LOW_STEP = -4;
export const HIGH_STEP = 12;

export const LETTERS = ["C", "D", "E", "F", "G", "A", "B"] as const;
export type Letter = (typeof LETTERS)[number];
const LETTER_PC: Record<Letter, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
export const letterPc = (letter: Letter): number => LETTER_PC[letter];

export interface ReadingNote {
  midi: number;
  letter: Letter;
  /** where it sits: 0 the bottom line, 8 the top line */
  step: number;
  /** the note as the staff draws it */
  spelled: Spelled;
}

const inSet = (set: ReadingSet, step: number): boolean => {
  const onStaff = step >= 0 && step <= 8;
  switch (set) {
    case "lines": return onStaff && step % 2 === 0;
    case "spaces": return onStaff && step % 2 === 1;
    case "staff": return onStaff;
    case "ledger": return !onStaff;
    case "all": return true;
  }
};

/** Every note of a set in a clef, low to high. */
export function notesOf(clef: ReadingClef, set: ReadingSet): ReadingNote[] {
  const out: ReadingNote[] = [];
  for (let midi = 24; midi <= 96; midi++) {
    const letter = LETTERS.find((l) => LETTER_PC[l] === midi % 12);
    if (!letter) continue;
    const spelled = spellName(letter, midi);
    const step = place(spelled, 0, clef).step;
    if (step >= LOW_STEP && step <= HIGH_STEP && inSet(set, step)) out.push({ midi, letter, step, spelled });
  }
  return out;
}

/** A random next note of the pool, never the one just asked while the pool holds another. */
export function nextNote(pool: ReadingNote[], rand: () => number, prev?: ReadingNote): ReadingNote {
  const rest = pool.length > 1 && prev ? pool.filter((n) => n.midi !== prev.midi) : pool;
  return rest[Math.min(rest.length - 1, Math.floor(rand() * rest.length))];
}

/** Is the tapped letter the note's name? */
export const isAnswer = (note: ReadingNote, letter: Letter): boolean => note.letter === letter;

/** Is the pitch class the mic heard this note? Any octave counts: a voice or a guitar may sit an octave or two from the written note. */
export const isHeard = (note: ReadingNote, pc: number | null): boolean => pc !== null && ((pc % 12) + 12) % 12 === note.midi % 12;

const ORDINAL = ["first", "second", "third", "fourth", "fifth"];

/** Where a note sits, in words that finish "It is on …" or "It is in …": lines and spaces are counted from the bottom. */
export function placeOf(step: number): string {
  if (step >= 0 && step <= 8) {
    const n = Math.floor(step / 2);
    if (step % 2 === 0) return `on the ${n === 0 ? "bottom" : n === 2 ? "middle" : n === 4 ? "top" : ORDINAL[n]} line`;
    return `in the ${n === 0 ? "bottom" : n === 3 ? "top" : ORDINAL[n]} space`;
  }
  const side = step < 0 ? "under" : "above";
  const out = step < 0 ? -step : step - 8;
  if (out === 1) return `just ${side} the staff`;
  const line = ORDINAL[Math.floor(out / 2) - 1];
  return out % 2 === 0 ? `on the ${line} ledger line ${side} the staff` : `just ${step < 0 ? "under" : "above"} the ${line} ledger line ${side} the staff`;
}

/** Middle C, the note the two clefs share: the first ledger line under the treble staff and above the bass staff. */
export const isMiddleC = (note: ReadingNote): boolean => note.midi === 60;

/**
 * What the game says once a note is answered, by how: a letter tapped (right or wrong), "heard" for the mic (it only
 * ever answers with the right note), or null for a note skipped. Always the note and where it sits.
 */
export function answerLine(note: ReadingNote, answer: Letter | "heard" | null): string {
  const what = `${isMiddleC(note) ? "middle C" : note.letter}, ${placeOf(note.step)}.`;
  if (answer === null) return `It was ${what}`;
  return answer === "heard" || answer === note.letter ? `Yes, ${what}` : `Not ${answer}. It was ${what}`;
}

/**
 * The notes drawn on the staff: the last few answered, oldest first, then the one being asked. A new note pushes the
 * oldest off, so the staff never has to scroll.
 */
export const TRAIL = 6;
export function withAsked(trail: ReadingNote[], asked: ReadingNote): ReadingNote[] {
  return [...trail.slice(-(TRAIL - 1)), asked];
}
