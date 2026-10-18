import { section, type CourseStage } from "../model";

export const STAGE_1: CourseStage = {
  slug: "1", label: "1", title: "Position 1",
  intro: "Stay in the open position in E minor and G major and learn everything that lives there: chords, triads, 5ths, arpeggios, the scale, and the paths between them.",
  sections: [
    section("chords", "Chords", "box-1"),
    section("triads", "Triads", "triads"),
    section("fifths", "5ths & double stops", "fifths"),
    section("arpeggios", "Arpeggios", "arpeggios"),
    section("one-four-five", "1 → 4 → 5 → 1 & the circle of fifths", "paths"),
    section("pentatonic", "E minor pentatonic", "soloing"),
    section("soloing", "Soloing over Em ↔ Am", "soloing"),
    section("move-it", "Move it: G minor", "box-1"),
  ],
};
