import { section, type CourseStage } from "../model";

export const STAGE_2: CourseStage = {
  slug: "2", label: "2", title: "Position 2",
  intro: "Frets 2 to 5. Bm is the hard chord of the key: here is the barre, the easier ways round it, and the drop 3 chords that build the hand for barres.",
  sections: [
    section("bm-barre", "The Bm barre", "barre-drop3"),
    section("easier-bm", "Easier Bm", "barre-drop3"),
    section("drop-3", "Drop 3 chords", "barre-drop3"),
    section("arpeggios", "Arpeggios in position 2", "arpeggios"),
    section("joining", "Joining positions 1 and 2", "box-2"),
  ],
};
