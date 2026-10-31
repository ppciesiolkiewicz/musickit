import type { Degree } from "../../timeline/types";
import type { Placement } from "../../cues/placement";

/**
 * A chord's arpeggio in one box on the guitar neck, or across two neighbouring boxes with the notes they share marked as
 * the seam; show only part of it, or make some degrees stand out. Tap a note to hear it, play the box up and down.
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
  /** notes that stand out: degrees (major-relative, from the chord root, not scale-aware) or note names as in `add`: ["3"] or ["c-sharp"] */
  highlight?: (Degree | string)[];
  /** notes drawn faint, same forms as `highlight` */
  mute?: (Degree | string)[];
  /** notes not drawn, same forms as `highlight` */
  hide?: (Degree | string)[];
  /** the notes not listed: "normal", "muted" or "hidden"; default "muted" when something is highlighted, else "normal" */
  others?: "normal" | "muted" | "hidden";
}
