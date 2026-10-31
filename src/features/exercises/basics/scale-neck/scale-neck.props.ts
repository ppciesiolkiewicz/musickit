import type { Degree } from "../../timeline/types";
import type { Placement } from "../../cues/placement";

/**
 * The scale's positions (boxes) on the guitar neck; tap a note to hear it, play a box up and down. Pick which boxes
 * to show, add notes from outside the scale, and make some degrees stand out.
 * @component scale-neck basic
 */
export interface ScaleNeckProps {
  /** scale slug, e.g. "major-ionian", "natural-minor-aeolian", "minor-pentatonic" */
  scale: string;
  /** the key's root note: "c", "f-sharp", "b-flat" */
  key: string;
  /** which boxes to show (1-based); absent shows all */
  boxes?: number[];
  /**
   * where on the neck, instead of `boxes`: { "by": "open" } next to open chords, { "by": "root", "string": 6 } the box
   * with the root on the low E (5: the A string, 4: the D string), { "by": "fret", "fret": 7 }, { "by": "chords" } near the
   * chords shown in this exercise, { "by": "box", "box": 2 }; use `boxes` only when the exercise is about the boxes
   */
  placement?: Placement;
  /** notes from outside the scale to play too, as note names: ["e-flat"] (the blue note, say); they are highlighted */
  add?: string[];
  /** notes that stand out: degrees (major-relative, from the key root, not scale-aware) or note names as in `add`: ["3"] or ["c-sharp"] */
  highlight?: (Degree | string)[];
  /** notes drawn faint, same forms as `highlight` */
  mute?: (Degree | string)[];
  /** notes not drawn, same forms as `highlight` */
  hide?: (Degree | string)[];
  /** the notes not listed: "normal", "muted" or "hidden"; default "muted" when something is highlighted, else "normal" */
  others?: "normal" | "muted" | "hidden";
}
