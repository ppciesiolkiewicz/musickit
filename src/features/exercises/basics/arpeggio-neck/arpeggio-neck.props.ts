import type { Degree } from "../../timeline/types";
import type { Placement } from "../../cues/placement";

/**
 * A chord's arpeggio in one box on the guitar neck, or across two neighbouring boxes with the notes they share marked as
 * the seam; show only part of it, say which notes are in play (`enable`) and which of them stand out (`highlight`).
 * Tap a note to hear it, play the box up and down.
 * @component arpeggio-neck basic
 */
export interface ArpeggioNeckProps {
  /** the chord: "Am", "G7", "Cmaj7" */
  chord: string;
  /** one box, or two neighbouring boxes (1-based, as numbered in the arpeggio cues): [2] or [2, 3]; absent shows box 1 */
  boxes?: number[];
  /**
   * where on the neck, instead of `boxes`: { "by": "open" } next to open chords, { "by": "root", "string": 6 } the box
   * with the root on the low E (5: the A string, 4: the D string), { "by": "fret", "fret": 7 }, { "by": "chords" } near the
   * chords shown in this exercise, { "by": "box", "box": 2 }; use `boxes` only when the exercise is about the boxes
   */
  placement?: Placement;
  /** only these degrees of the chord (major-relative to the chord root): ["1","b3"] */
  part?: Degree[];
  /** the notes in play: degrees (major-relative, from the chord root) or note names: ["1","3"] or ["c-sharp"]; the rest are muted (see `others`). Absent: every note */
  enable?: (Degree | string)[];
  /** the notes of interest, ringed: the roots, the one new note, the note that differs; they stay playable. Never the same list as `enable` */
  highlight?: (Degree | string)[];
  /** notes drawn faint, same forms as `enable` */
  mute?: (Degree | string)[];
  /** notes not drawn, same forms as `enable` */
  hide?: (Degree | string)[];
  /** the notes not in `enable`: "muted" (default) or "hidden" */
  others?: "muted" | "hidden";
  /**
   * the arpeggio as the arpeggios page draws it, instead of the box: ["neck"] for every note on the whole neck,
   * ["positions"] for the positions it falls into, or both. For a triad or a 7th chord ("Am", "G7", "Cmaj7", "Bm7b5");
   * `boxes`, `placement`, `part` and the marks apply to the box only
   */
  show?: ("neck" | "positions")[];
  /** with `show`: the strings the root is shown on, 2 to 6 (6 is the low E): [6, 5]; absent: all of them */
  roots?: number[];
}
