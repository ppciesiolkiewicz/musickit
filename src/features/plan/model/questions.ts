import type { Instrument, Level, PlanAnswers } from "./types";

/** The questionnaire's choices. Ids go into the prompt with their labels, so the AI reads words, not codes. */
export const INSTRUMENTS: { id: Instrument; label: string }[] = [
  { id: "guitar", label: "Guitar" },
  { id: "piano", label: "Piano / keys" },
  { id: "voice", label: "Voice" },
];

export const LEVELS: { id: Level; label: string; desc: string }[] = [
  { id: "new", label: "Brand new", desc: "Just started, a few chords or none" },
  { id: "beginner", label: "Beginner", desc: "Open chords, simple songs" },
  { id: "intermediate", label: "Intermediate", desc: "Barre chords, some scales, play with others" },
  { id: "advanced", label: "Advanced", desc: "Comfortable all over the neck" },
];

/** Where the player wants to go. */
export const GOALS: { id: string; label: string }[] = [
  { id: "songs", label: "Play songs I love" },
  { id: "improvise", label: "Improvise and solo" },
  { id: "write", label: "Write my own music" },
  { id: "theory", label: "Understand theory" },
  { id: "fretboard", label: "Know the fretboard" },
  { id: "ear", label: "Play by ear" },
  { id: "rhythm", label: "Tighter rhythm" },
  { id: "sing", label: "Sing and play" },
  { id: "band", label: "Play with others" },
];

/** What holds them back: the plan should work on these even if the goals don't ask. */
export const STRUGGLES: { id: string; label: string }[] = [
  { id: "timing", label: "Keeping time" },
  { id: "changes", label: "Chord changes" },
  { id: "notes", label: "Finding notes" },
  { id: "hearing", label: "Hearing intervals" },
  { id: "stuck", label: "Stuck in one box" },
  { id: "motivation", label: "Practising regularly" },
  { id: "pitch", label: "Singing in tune" },
];

export const MINUTES = [10, 15, 20, 30, 45, 60];

export const DEFAULT_ANSWERS: PlanAnswers = { instrument: "guitar", level: "beginner", goals: [], struggles: [], styles: "", minutes: 20, notes: "" };

export const labelOf = (list: { id: string; label: string }[], id: string): string => list.find((x) => x.id === id)?.label ?? id;
