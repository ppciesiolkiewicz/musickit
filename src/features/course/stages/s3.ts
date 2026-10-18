import { section, type CourseStage } from "../model";

export const STAGE_3: CourseStage = {
  slug: "3", label: "3", title: "Position 1 flavours",
  intro: "Back home in position 1, with colour: 6, 7, sus and add9 chords on the same paths you already know.",
  sections: [
    section("six-chords", "6 chords", "colour"),
    section("sevenths", "maj7 & 7", "colour"),
    section("sus-add9", "sus & add9", "colour"),
    section("colour-paths", "The same paths with colour", "paths"),
  ],
};
