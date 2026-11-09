import type { Degree } from "../../timeline/types";
import type { Placement } from "../../cues/placement";

/**
 * The scale's positions (boxes) on the guitar neck; tap a note to hear it, play a box up and down. Pick which boxes
 * to show, add notes from outside the scale, say which notes are in play (`enable`) and which of them stand out
 * (`highlight`).
 * @component scale-neck basic
 */
export interface ScaleNeckProps {
  /** scale slug, e.g. "major-ionian", "natural-minor-aeolian", "minor-pentatonic" */
  scale: string;
  /** the key's root note: "c", "f-sharp", "b-flat" */
  key: string;
  /** which boxes to show (1-based); absent shows all */
  boxes?: number[];
  /** true also shows the whole neck above the boxes: tap a position's name to light it up there; absent: only the boxes */
  neck?: boolean;
  /** false hides the boxes, so with `neck` only the neck shows; absent: the boxes show */
  positions?: boolean;
  /**
   * where on the neck, instead of `boxes`: { "by": "open" } next to open chords, { "by": "root", "string": 6 } the box
   * with the root on the low E (5: the A string, 4: the D string), { "by": "fret", "fret": 7 }, { "by": "chords" } near the
   * chords shown in this exercise, { "by": "box", "box": 2 }; use `boxes` only when the exercise is about the boxes
   */
  placement?: Placement;
  /** notes from outside the scale to play too, as note names: ["e-flat"] (the blue note, say); they are highlighted */
  add?: string[];
  /** the notes in play: degrees (major-relative, from the key root, not scale-aware) or note names as in `add`: ["1","b3"] or ["c-sharp"]; the rest are muted (see `others`). Absent: every note */
  enable?: (Degree | string)[];
  /** the notes of interest, ringed: the roots, the one new note, the note that differs; they stay playable. Never the same list as `enable` */
  highlight?: (Degree | string)[];
  /** notes drawn faint, same forms as `enable` */
  mute?: (Degree | string)[];
  /** notes not drawn, same forms as `enable` */
  hide?: (Degree | string)[];
  /** the notes not in `enable`: "muted" (default) or "hidden" */
  others?: "muted" | "hidden";
}
