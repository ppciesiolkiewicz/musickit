/**
 * The course at a glance: four stages down, three tracks across. A student moves down each track at their own pace,
 * so their chords can be at stage 3 while their lead playing is still at stage 2. Nothing has to be mastered first.
 */
import type { IconName } from "@/components/Icon";
import type { Tone } from "../sections";

export type TrackId = "chords" | "lead" | "ear";

/** Each track keeps one colour and icon everywhere it appears: the hub, the stage pages and their jump links. */
export const TRACKS: { id: TrackId; label: string; desc: string; tone: Tone; icon: IconName }[] = [
  { id: "chords", label: "Chords", desc: "Rhythm: shapes, changes, songs", tone: "amber", icon: "grid-3x3" },
  { id: "lead", label: "Lead", desc: "Melody, scales, improvising", tone: "sky", icon: "music" },
  { id: "ear", label: "Ear & fretboard", desc: "Theory, note names, listening", tone: "violet", icon: "ear" },
];

export interface StageOutline {
  n: 1 | 2 | 3 | 4;
  title: string;
  level: string;
  cells: Record<TrackId, string[]>;
}

export const STAGES: StageOutline[] = [
  {
    n: 1, title: "First chords", level: "Beginner",
    cells: {
      chords: ["Open Em Am C D G E A Dm", "One-minute changes", "First songs"],
      lead: ["Single-string melodies in tab", "Ode to Joy, When the Saints"],
      ear: ["Note names on the E and A strings", "Piano → guitar, part 1", "Ear: major vs minor"],
    },
  },
  {
    n: 2, title: "More chords, first solos", level: "Improver",
    cells: {
      chords: ["Fmaj7, B7 and the open 7th chords", "sus2, sus4, Cadd9", "Power chords"],
      lead: ["Minor pentatonic box 1", "12-bar blues improv"],
      ear: ["Chords in a key: I IV V vi", "Intervals on and across strings", "Ear: P4, P5, octave"],
    },
  },
  {
    n: 3, title: "Barres and the neck", level: "Intermediate",
    cells: {
      chords: ["E-shape and A-shape barre chords", "Triads on string sets"],
      lead: ["Pentatonic in all 5 boxes", "Major pentatonic"],
      ear: ["Circle of fifths", "Relative minor", "Ear: all intervals"],
    },
  },
  {
    n: 4, title: "Colour and the whole neck", level: "Advanced",
    cells: {
      chords: ["CAGED", "Shape neighbours", "7th, extended and shell voicings"],
      lead: ["Major scale boxes and arpeggios", "Modes", "Harmonic and melodic minor"],
      ear: ["Mode compare", "Tunings and drones", "Your own cheatsheet"],
    },
  },
];

export const stageHref = (n: number, track?: TrackId): string => `/theory/stage/${n}${track ? `#${track}` : ""}`;
