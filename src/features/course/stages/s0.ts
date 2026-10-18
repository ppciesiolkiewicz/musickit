import { section, type CourseStage } from "../model";

export const STAGES_0: CourseStage[] = [
  {
    slug: "0-1", label: "0.1", title: "Guitar basics",
    intro: "How the guitar is tuned, how to read tab and chord boxes, and the names of the notes on the two lowest strings.",
    sections: [
      section("strings-and-tuning", "Strings & tuning", "basics"),
      section("tab-and-chord-boxes", "Tab & chord boxes", "basics"),
      section("notes-on-e-and-a", "Notes on E and A", "basics"),
    ],
  },
  {
    slug: "0-2", label: "0.2", title: "First open chords",
    intro: "Five open chords, clean changes between them, and three strumming patterns to play them with.",
    sections: [
      section("em-and-am", "Em & Am", "open-chords"),
      section("c-d-g", "C, D, G", "open-chords"),
      section("one-minute-changes", "One-minute changes", "open-chords"),
      section("all-downstrums", "All downstrums", "strumming"),
      section("island-strum", "Island strum", "strumming"),
      section("sixteenths", "16th strumming pattern", "strumming"),
      section("first-songs", "First songs", "open-chords"),
    ],
  },
  {
    slug: "0-3", label: "0.3", title: "One note, three views",
    intro: "The same notes on piano, on guitar and as do-re-mi. Once you can see all three, every later idea has a name.",
    sections: [
      section("piano-and-guitar", "Piano ↔ guitar", "three-views"),
      section("solfege", "Solfège", "three-views"),
      section("do-re-mi", "The major scale as do-re-mi", "three-views"),
      section("hearing-do-fa-sol", "Hearing do, fa, sol", "three-views"),
    ],
  },
  {
    slug: "0-4", label: "0.4", title: "Single notes",
    intro: "Simple tunes one note at a time, so the picking hand is ready for arpeggios.",
    sections: [section("melodies", "Melodies in tab", "melody")],
  },
];
