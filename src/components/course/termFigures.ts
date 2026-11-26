/**
 * The small pictures an explained word's note can show under its meaning, keyed by the term's id in `GLOSSARY`.
 * Pure data, so `Explained` can tell which words have one without loading the sound engine; `TermFigure` draws and plays them.
 * Notes are written with their octave ("E♭4"), C4 being middle C.
 */

/** Notes drawn as dots, higher dots for higher notes; each group has its own Play button. */
export interface TuneFigure {
  kind: "tune";
  groups: { label: string; notes: string[]; /** under each dot: a solfège name or a degree */ under?: string[] }[];
  /** a note held under every group while it plays, drawn as a line */
  drone?: string;
  caption: string;
}

/** A piano keyboard with a group's keys marked; each group has its own Play button. */
export interface KeysFigure {
  kind: "keys";
  groups: { label: string; notes: string[]; /** the notes sound together, as a chord, instead of one after another */ together?: boolean }[];
  caption: string;
}

/** A bar or two of beats split into equal parts, each counted; each tempo has its own Play button. */
export interface BeatsFigure {
  kind: "beats";
  bars: number;
  /** the count of each part of one beat: ["1"] for beats, ["1", "&"] for eighths ("1" is replaced by the beat's number) */
  counts: string[];
  bpms: number[];
  caption: string;
}

export type Figure = TuneFigure | KeysFigure | BeatsFigure;

const C_MAJOR = ["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5"];
const SOLFEGE = ["Do", "Re", "Mi", "Fa", "Sol", "La", "Ti", "Do"];
const MAJOR_MINOR: KeysFigure = {
  kind: "keys",
  groups: [
    { label: "C major", notes: ["C4", "E4", "G4"], together: true },
    { label: "C minor", notes: ["C4", "E♭4", "G4"], together: true },
  ],
  caption: "Only the 3rd moves: E in C major, E♭ in C minor.",
};

export const TERM_FIGURES: Record<string, Figure> = {
  "relative-pitch": {
    kind: "tune",
    groups: [
      { label: "In C", notes: ["C4", "D4", "E4", "F4", "G4", "E4", "C4"], under: ["Do", "Re", "Mi", "Fa", "Sol", "Mi", "Do"] },
      { label: "In G", notes: ["G4", "A4", "B4", "C5", "D5", "B4", "G4"], under: ["Do", "Re", "Mi", "Fa", "Sol", "Mi", "Do"] },
    ],
    caption: "Other letters, same steps from Do: the same tune, only higher.",
  },
  solfege: {
    kind: "tune",
    groups: [{ label: "C major", notes: C_MAJOR, under: SOLFEGE }],
    caption: "In C major, Do is C. In any other key, Do is that key's home note.",
  },
  do: {
    kind: "tune",
    groups: [
      { label: "In C", notes: ["C4", "D4", "E4"], under: ["Do", "Re", "Mi"] },
      { label: "In G", notes: ["G4", "A4", "B4"], under: ["Do", "Re", "Mi"] },
    ],
    caption: "Do moves with the key, and Re and Mi move with it.",
  },
  scale: {
    kind: "tune",
    groups: [{ label: "C major", notes: C_MAJOR }],
    caption: "The C major scale: from the root C up to the next C.",
  },
  degree: {
    kind: "tune",
    groups: [{ label: "C major", notes: C_MAJOR, under: ["1", "2", "3", "4", "5", "6", "7", "1"] }],
    caption: "Each note's number, counted from the home note C.",
  },
  "home-note": {
    kind: "tune",
    groups: [
      { label: "Ends on Re", notes: ["E4", "F4", "E4", "D4"], under: ["Mi", "Fa", "Mi", "Re"] },
      { label: "Ends on Do", notes: ["E4", "F4", "D4", "C4"], under: ["Mi", "Fa", "Re", "Do"] },
    ],
    caption: "Play both. The one that ends on Do sounds finished.",
  },
  drone: {
    kind: "tune",
    groups: [{ label: "Tune over a drone", notes: ["C4", "E4", "G4", "F4", "E4", "D4", "C4"], under: ["Do", "Mi", "Sol", "Fa", "Mi", "Re", "Do"] }],
    drone: "C3",
    caption: "The line is the drone, a low C held under the tune.",
  },
  step: {
    kind: "tune",
    groups: [{ label: "Steps", notes: ["C4", "D4", "E4", "F4", "E4", "D4"], under: ["Do", "Re", "Mi", "Fa", "Mi", "Re"] }],
    caption: "Each note goes to the very next one in the scale.",
  },
  skip: {
    kind: "tune",
    groups: [{ label: "Skips", notes: ["C4", "E4", "G4", "E4", "C4"], under: ["Do", "Mi", "Sol", "Mi", "Do"] }],
    caption: "Do to Mi jumps over Re. Mi to Sol jumps over Fa.",
  },
  leap: {
    kind: "tune",
    groups: [
      { label: "Do to Sol", notes: ["C4", "G4"], under: ["Do", "Sol"] },
      { label: "Do to high Do", notes: ["C4", "C5"], under: ["Do", "Do"] },
    ],
    caption: "A leap jumps over two or more notes of the scale.",
  },
  pentatonic: {
    kind: "tune",
    groups: [{ label: "C major pentatonic", notes: ["C4", "D4", "E4", "G4", "A4", "C5"], under: ["1", "2", "3", "5", "6", "1"] }],
    caption: "The C major scale with its 4th (F) and 7th (B) left out.",
  },
  interval: {
    kind: "keys",
    groups: [{ label: "C to E", notes: ["C4", "E4"] }],
    caption: "Count the letters from C: C, D, E. Three letters, so a 3rd.",
  },
  "half-step": {
    kind: "keys",
    groups: [
      { label: "C to C♯", notes: ["C4", "C♯4"] },
      { label: "E to F", notes: ["E4", "F4"] },
    ],
    caption: "The very next key, black or white. E to F has no black key between.",
  },
  "whole-step": {
    kind: "keys",
    groups: [
      { label: "C to D", notes: ["C4", "D4"] },
      { label: "E to F♯", notes: ["E4", "F♯4"] },
    ],
    caption: "Two half steps: one key is skipped on the way.",
  },
  octave: {
    kind: "keys",
    groups: [
      { label: "One after the other", notes: ["C4", "C5"] },
      { label: "Together", notes: ["C4", "C5"], together: true },
    ],
    caption: "Both are C. The higher one is 12 half steps up.",
  },
  chord: {
    kind: "keys",
    groups: [{ label: "C major", notes: ["C4", "E4", "G4"], together: true }],
    caption: "C, E and G played together make the C major chord.",
  },
  triad: {
    kind: "keys",
    groups: [{ label: "C major", notes: ["C4", "E4", "G4"], together: true }],
    caption: "Root C, 3rd E, 5th G.",
  },
  arpeggio: {
    kind: "keys",
    groups: [
      { label: "Arpeggio", notes: ["C4", "E4", "G4", "C5"] },
      { label: "Chord", notes: ["C4", "E4", "G4", "C5"], together: true },
    ],
    caption: "The same notes as the C major chord, one at a time.",
  },
  major: MAJOR_MINOR,
  minor: MAJOR_MINOR,
  "power-chord": {
    kind: "keys",
    groups: [{ label: "C5", notes: ["C4", "G4", "C5"], together: true }],
    caption: "Root C and 5th G, with the root again on top. No 3rd.",
  },
  beat: {
    kind: "beats",
    bars: 1,
    counts: ["1"],
    bpms: [80],
    caption: "Four steady beats, counted 1 2 3 4.",
  },
  bar: {
    kind: "beats",
    bars: 2,
    counts: ["1"],
    bpms: [80],
    caption: "Two bars of four beats. The count starts again at 1.",
  },
  tempo: {
    kind: "beats",
    bars: 1,
    counts: ["1"],
    bpms: [60, 120],
    caption: "The same beats at two tempos: 120 bpm is twice as fast.",
  },
  eighths: {
    kind: "beats",
    bars: 1,
    counts: ["1", "&"],
    bpms: [70],
    caption: "Two even notes in every beat.",
  },
  sixteenths: {
    kind: "beats",
    bars: 1,
    counts: ["1", "e", "&", "a"],
    bpms: [60],
    caption: "Four even notes in every beat.",
  },
};
