import type { Level, PlanAnswers } from "./types";

/** The questionnaire's choices. Ids go into the prompt with their labels, so the AI reads words, not codes. */
export const LEVELS: { id: Level; label: string; desc: string }[] = [
  { id: "new", label: "Brand new", desc: "Just started, a few chords or none" },
  { id: "beginner", label: "Beginner", desc: "Open chords, simple songs" },
  { id: "intermediate", label: "Intermediate", desc: "Barre chords, some scales, play with others" },
  { id: "advanced", label: "Advanced", desc: "Comfortable all over the neck" },
];

export const MINUTES = [10, 15, 20, 30, 45, 60];

export const DEFAULT_ANSWERS: PlanAnswers = { levels: { guitar: "beginner" }, ratings: {}, focus: [], minutes: 20, styles: "", notes: "" };

export const labelOf = (list: { id: string; label: string }[], id: string): string => list.find((x) => x.id === id)?.label ?? id;
