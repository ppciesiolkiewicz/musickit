import type { Degree } from "../../timeline/types";
import type { Placement } from "../../cues/placement";

/**
 * The scale on the whole guitar neck, drawn across: only the positions asked for are framed and playable, every other note
 * is faint. A row of position thumbnails under the neck lets the student pick others. With `cross` it shows just the way
 * from one position to the next: the lower position's notes on the low strings, both on the crossing string (the slide),
 * the upper position's on the high strings; the rest of both positions is faint. Use it for positions on the neck and
 * for joining them; `scale-neck` for one position studied on its own.
 * @component position-neck basic
 */
export interface PositionNeckProps {
  /** scale slug, e.g. "minor-pentatonic", "dorian", "major-ionian" */
  scale: string;
  /** the key's root note: "c", "f-sharp", "b-flat" */
  key: string;
  /** the positions framed (1-based, 1 to 5); absent: position 1, or the two in `cross` */
  positions?: number[];
  /** where on the neck, instead of `positions`, as on `scale-neck`: { "by": "root", "string": 5 } frames the position with the root on the A string */
  placement?: Placement;
  /**
   * show only the way across between two positions: { "from": 1, "to": 2 }; `string` is where it crosses, numbered 1 to 6
   * (6 is the low E), default 3 (the G string)
   */
  cross?: { from: number; to: number; string?: number };
  /** notes from outside the scale to play too, as note names: ["e-flat"]; they are highlighted */
  add?: string[];
  /** the notes in play inside the framed positions: degrees or note names, as on `scale-neck`; the rest are muted. Absent: every note */
  enable?: (Degree | string)[];
  /** the notes of interest, ringed: the roots, the crossing notes. Never the same list as `enable` */
  highlight?: (Degree | string)[];
  /** notes drawn faint, same forms as `enable` */
  mute?: (Degree | string)[];
  /** notes not drawn, same forms as `enable` */
  hide?: (Degree | string)[];
  /** the notes not in `enable`: "muted" (default) or "hidden" */
  others?: "muted" | "hidden";
  /** the notes outside the framed positions (or the crossing): "muted" (default, drawn faint) or "hidden" */
  outside?: "muted" | "hidden";
  /** the thumbnails and crossing buttons under the neck; false fixes the view to what the exercise sets */
  picker?: boolean;
}
