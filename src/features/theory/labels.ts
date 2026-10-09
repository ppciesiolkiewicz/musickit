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
