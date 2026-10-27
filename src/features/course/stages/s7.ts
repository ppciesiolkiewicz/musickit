import { section, type CourseStage } from "../model";

export const STAGE_7: CourseStage = {
  slug: "7", label: "7", title: "Jazz colours",
  intro: "Shell voicings, 9ths and 13ths, and the jazz standards that use them.",
  sections: [
    // Planned: root, 3rd and 7th only, on the 6th and 5th strings; how jazz and soul players comp.
    section("shells", "Shell voicings", "colour"),
    // Planned: add the 9th and 13th on top of the shells; D9, G13.
    section("extended", "9ths & 13ths", "colour"),
    // Planned: Autumn Leaves and Fly Me to the Moon with shells; ii–V–I.
    section("jazz-standards", "Jazz standards", "colour"),
  ],
};
