import { PATH, type PathStep, type Track } from "@/features/plan/model/path";

/*
 * A proposed path to judge on /dev/path → "Slope" beside the path as it is (docs/superpowers/specs/2026-11-16-path-slope-design.md):
 * the prerequisites the user named, and a double-stops track before triads. Nothing outside /dev/path reads it; once
 * the user settles it, these changes move into PATH (plan/model/path.ts) and this file goes.
 */

/** The steps each step gains to learn first, as "trackId:n" → refs. */
export const ADDED_AFTER: Record<string, string[]> = {
  // Pentatonic before the modes: theory, the neck and the voice
  "modes:1": ["scales:1"],
  "singing-modes:1": ["scales:1"],
  // Pentatonic position 1 before every other first position
  "major-on-neck:1": ["pentatonic-positions:1"],
  "arpeggios:1": ["pentatonic-positions:1"],
  "caged:1": ["pentatonic-positions:1"],
  // Double stops, then the first triads, then barre chords
  "triads:1": ["double-stops:2"],
  "barre:1": ["triads:1"],
};

const N = "new", B = "beginner", I = "intermediate";
const step = (level: PathStep["level"], name: string, holds: string): PathStep => ({ level, name, holds });

export const DOUBLE_STOPS: Track = {
  id: "double-stops", label: "Double stops", area: "guitar", topic: "guitar-caged", merges: [],
  steps: [
    step(N, "5ths on two strings", "root and 5th, the smallest power chord"),
    step(B, "3rds on strings 3 and 2", "in one key"),
    step(B, "6ths on strings 3 and 1", "in one key, string 2 skipped"),
    step(I, "Up the neck in one key", "3rds and 6ths"),
  ],
};

/** The path with the proposal applied. */
export function proposedPath(tracks: Track[] = PATH): Track[] {
  const out = tracks.flatMap((t) => (t.id === "triads" ? [DOUBLE_STOPS, t] : [t]));
  return out.map((t) => ({
    ...t,
    steps: t.steps.map((st, i) => {
      const add = ADDED_AFTER[`${t.id}:${i + 1}`];
      return add ? { ...st, after: [...(st.after ?? []), ...add.filter((r) => !st.after?.includes(r))] } : st;
    }),
  }));
}

/** Whether a step's link is one the proposal adds. */
export const isAdded = (ref: string, after: string) => ADDED_AFTER[ref]?.includes(after) ?? false;
