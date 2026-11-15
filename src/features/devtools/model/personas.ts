import type { PlanAnswers } from "@/features/plan/model/types";

/** A made-up player for /dev/more-demos: first-questionnaire answers the prompt is built from. */
export interface Persona { id: string; label: string; answers: PlanAnswers }

const p = (id: string, label: string, answers: Partial<PlanAnswers> & Pick<PlanAnswers, "areas">): Persona => ({
  id, label, answers: { topics: {}, minutes: 20, styles: "", notes: "", ...answers },
});

export const PERSONAS: Persona[] = [
  p("guitar-new", "Guitar, brand new", { areas: ["guitar"], minutes: 15, styles: "pop, singer-songwriter", notes: "Just bought my first acoustic." }),
  p("guitar-beginner", "Guitar, beginner", {
    areas: ["guitar"], minutes: 20, styles: "rock, indie",
    topics: { "guitar-basic-chords": 1, "guitar-barre-chords": 0, "guitar-scales": 1, "guitar-techniques": 0 },
  }),
  p("guitar-intermediate", "Guitar + theory, intermediate", {
    areas: ["guitar", "theory"], minutes: 30, styles: "blues, funk",
    topics: { "guitar-basic-chords": 3, "guitar-barre-chords": 2, "guitar-scales": 2, "guitar-caged": 1, "guitar-techniques": 2, "theory-progressions": 2, "theory-scales-keys": 1 },
  }),
  p("guitar-advanced", "Guitar, advanced", {
    areas: ["guitar"], minutes: 45, styles: "jazz, neo-soul",
    topics: { "guitar-basic-chords": 3, "guitar-barre-chords": 3, "guitar-extended-chords": 2, "guitar-scales": 3, "guitar-caged": 2, "guitar-techniques": 3 },
    notes: "I want to comp over ii–V–I with drop voicings.",
  }),
  p("voice-beginner", "Voice, beginner (alto)", {
    areas: ["voice"], minutes: 15, styles: "musicals", voice: { type: "alto" },
    topics: { "voice-pitch": 1, "voice-intervals": 1, "voice-breath-range": 1 },
  }),
  p("voice-intermediate", "Voice + theory, intermediate (tenor)", {
    areas: ["voice", "theory"], minutes: 30, styles: "soul, gospel", voice: { type: "tenor" },
    topics: { "voice-pitch": 2, "voice-intervals": 2, "voice-melodies": 2, "voice-runs": 1, "voice-harmony": 1, "theory-ear": 2 },
  }),
  p("theory-only", "Theory & ear only", {
    areas: ["theory"], minutes: 10,
    topics: { "theory-basics": 2, "theory-ear": 1, "theory-scales-keys": 1, "theory-building-chords": 1 },
  }),
];
