import { section, type CourseStage } from "../model";

export const STAGE_5: CourseStage = {
  slug: "5", label: "5", title: "Modes",
  intro: "Change one note of the scale and the mood changes. Modes in E and G, and the harmonic minor that explains B7.",
  sections: [
    section("modes", "Aeolian, Dorian, Phrygian, Mixolydian", "modes"),
    section("harmonic-minor", "Harmonic minor and why B7 works", "modes"),
  ],
};
