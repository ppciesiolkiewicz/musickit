import type { TourStep } from "../tour";

/** The fretboard notes page tour. The start, neck, extras and answer targets are shared with the note finder exercise. */
export const NOTES_TOUR: TourStep[] = [
  {
    target: "notes-setup",
    title: "Pick a game",
    text: "Find a note on one string, find it everywhere on your strings, or name a lit dot.",
  },
  {
    target: "note-finder-start",
    title: "Start",
    text: "Press Start and the game asks for a note. Your streak counts the right answers in a row.",
  },
  {
    target: "note-finder-neck",
    title: "The neck",
    text: "The game shows its notes here. Answer by tapping the neck or by picking a name, depending on the game.",
  },
  {
    target: "note-finder-extras",
    title: "Sprint and weak spots",
    text: "A 60-second sprint to test your speed, and the places on the neck where you miss most.",
  },
  {
    target: "note-finder-answer-by",
    title: "How you answer",
    text: "Tap the neck, or play the note on your guitar and let the mic hear it.",
  },
  {
    target: "notes-settings",
    title: "Strings and frets",
    text: "Pick the strings and frets to practise. Start with the natural notes on the low E and A strings.",
  },
];
