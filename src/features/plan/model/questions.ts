import type { Level } from "./types";

/** The levels an exercise is pitched at. Ids go into the prompt with their labels, so the AI reads words, not codes. */
export const LEVELS: { id: Level; label: string; desc: string }[] = [
  { id: "new", label: "Brand new", desc: "Just started, a few chords or none" },
  { id: "beginner", label: "Beginner", desc: "Open chords, simple songs" },
  { id: "intermediate", label: "Intermediate", desc: "Barre chords, some scales, play with others" },
  { id: "advanced", label: "Advanced", desc: "Comfortable all over the neck" },
];

export const labelOf = (list: { id: string; label: string }[], id: string): string => list.find((x) => x.id === id)?.label ?? id;
