/**
 * Scale Piano layout: the computer keyboard played as an instrument locked to a key and scale.
 * Every key sounds a note of the chosen scale, so nothing you press is out of key.
 * The rows of the keyboard are stacked octaves, bottom row lowest. Pure maths, no audio and no DOM (tested).
 */

export const NOTE_NAMES = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"] as const;

export interface ScaleDef {
  id: string;
  name: string;
  /** semitones above the root, starting at 0 */
  steps: number[];
}

export const SCALES: ScaleDef[] = [
  { id: "major", name: "Major", steps: [0, 2, 4, 5, 7, 9, 11] },
  { id: "minor", name: "Natural minor", steps: [0, 2, 3, 5, 7, 8, 10] },
  { id: "dorian", name: "Dorian", steps: [0, 2, 3, 5, 7, 9, 10] },
  { id: "phrygian", name: "Phrygian", steps: [0, 1, 3, 5, 7, 8, 10] },
  { id: "lydian", name: "Lydian", steps: [0, 2, 4, 6, 7, 9, 11] },
  { id: "mixolydian", name: "Mixolydian", steps: [0, 2, 4, 5, 7, 9, 10] },
  { id: "locrian", name: "Locrian", steps: [0, 1, 3, 5, 6, 8, 10] },
  { id: "harmonicMinor", name: "Harmonic minor", steps: [0, 2, 3, 5, 7, 8, 11] },
  { id: "melodicMinor", name: "Melodic minor", steps: [0, 2, 3, 5, 7, 9, 11] },
  { id: "majorPentatonic", name: "Major pentatonic", steps: [0, 2, 4, 7, 9] },
  { id: "minorPentatonic", name: "Minor pentatonic", steps: [0, 3, 5, 7, 10] },
  { id: "blues", name: "Blues", steps: [0, 3, 5, 6, 7, 10] },
];

export interface ScalePianoState {
  /** pitch class of the key, 0 = C */
  root: number;
  scale: string;
  /** octave of the bottom row's root (3 = C3, an octave below middle C) */
  octave: number;
}

export const DEFAULT_SCALE_PIANO: ScalePianoState = { root: 0, scale: "major", octave: 3 };
export const MIN_OCTAVE = 0;
export const MAX_OCTAVE = 6;

/** The keyboard rows, bottom (lowest) first. `code` is KeyboardEvent.code, so the layout does not depend on the keyboard language. */
export const KEY_ROWS: { code: string; label: string }[][] = [
  [["KeyZ", "Z"], ["KeyX", "X"], ["KeyC", "C"], ["KeyV", "V"], ["KeyB", "B"], ["KeyN", "N"], ["KeyM", "M"], ["Comma", ","], ["Period", "."], ["Slash", "/"]],
  [["KeyA", "A"], ["KeyS", "S"], ["KeyD", "D"], ["KeyF", "F"], ["KeyG", "G"], ["KeyH", "H"], ["KeyJ", "J"], ["KeyK", "K"], ["KeyL", "L"], ["Semicolon", ";"]],
  [["KeyQ", "Q"], ["KeyW", "W"], ["KeyE", "E"], ["KeyR", "R"], ["KeyT", "T"], ["KeyY", "Y"], ["KeyU", "U"], ["KeyI", "I"], ["KeyO", "O"], ["KeyP", "P"]],
  [["Digit1", "1"], ["Digit2", "2"], ["Digit3", "3"], ["Digit4", "4"], ["Digit5", "5"], ["Digit6", "6"], ["Digit7", "7"], ["Digit8", "8"], ["Digit9", "9"], ["Digit0", "0"]],
].map((row) => row.map(([code, label]) => ({ code, label })));

export const findScale = (id: string): ScaleDef => SCALES.find((s) => s.id === id) ?? SCALES[0];

export const clampState = (s: Partial<ScalePianoState> | undefined): ScalePianoState => {
  const root = Number.isInteger(s?.root) ? ((s!.root as number) % 12 + 12) % 12 : DEFAULT_SCALE_PIANO.root;
  const scale = SCALES.some((x) => x.id === s?.scale) ? (s!.scale as string) : DEFAULT_SCALE_PIANO.scale;
  const oct = Number.isInteger(s?.octave) ? (s!.octave as number) : DEFAULT_SCALE_PIANO.octave;
  return { root, scale, octave: Math.max(MIN_OCTAVE, Math.min(MAX_OCTAVE, oct)) };
};

/** MIDI note of the n-th scale degree counted from the root of octave `octave` (degree 0 = the root). */
export function degreeToMidi(state: ScalePianoState, degree: number): number {
  const steps = findScale(state.scale).steps;
  const oct = Math.floor(degree / steps.length);
  const idx = degree - oct * steps.length;
  return 12 * (state.octave + 1 + oct) + state.root + steps[idx];
}

export interface KeyNote {
  code: string;
  label: string;
  row: number;
  col: number;
  midi: number;
  /** position in the scale, 0 = root */
  degree: number;
  isRoot: boolean;
  name: string;
}

export const noteName = (midi: number) => NOTE_NAMES[((midi % 12) + 12) % 12];

/** Every key with the note it plays. Each row starts on the root, one octave above the row below it. */
export function buildKeyMap(state: ScalePianoState): KeyNote[] {
  const n = findScale(state.scale).steps.length;
  const out: KeyNote[] = [];
  KEY_ROWS.forEach((row, r) => {
    row.forEach((k, c) => {
      const degree = r * n + c;
      const midi = degreeToMidi(state, degree);
      out.push({ code: k.code, label: k.label, row: r, col: c, midi, degree, isRoot: degree % n === 0, name: noteName(midi) });
    });
  });
  return out.filter((k) => k.midi <= 120);
}

/** Pitch classes (0-11) that belong to the scale, for drawing it on a piano. */
export function scalePitchClasses(state: ScalePianoState): Set<number> {
  return new Set(findScale(state.scale).steps.map((s) => (state.root + s) % 12));
}


