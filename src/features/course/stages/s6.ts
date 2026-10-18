import { section, type CourseStage } from "../model";

export const STAGE_6: CourseStage = {
  slug: "6", label: "6", title: "Other keys",
  intro: "Everything so far was in E minor and G major. Move it to other keys, with the circle of fifths as the map.",
  sections: [
    section("moving-keys", "Moving it all to Am/C, Dm/F", "keys"),
    section("circle-map", "The circle as a map between keys", "keys"),
  ],
};
