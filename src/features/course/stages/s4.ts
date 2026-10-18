import { section, type CourseStage } from "../model";

export const STAGE_4: CourseStage = {
  slug: "4", label: "4", title: "Up the neck",
  intro: "The three remaining CAGED shapes of G, then one arpeggio and the triads followed across the whole neck.",
  sections: [
    section("d-c-a-shapes", "D, C and A shapes", "boxes-3-5"),
    section("one-arpeggio", "One arpeggio through all five shapes", "arpeggios"),
    section("triads-everywhere", "Triads on every string set", "triads"),
  ],
};
