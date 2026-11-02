import type { Degree } from "../../timeline/types";

/**
 * The scale on a staff in a voice's range, with the microphone's pitch drawn on it; tap a note to hear it. With `drone` and/or
 * `click` it carries its own backing: one Start runs the backing and the mic, so a singing exercise needs no `click-drone` beside it.
 * @component staff basic
 */
export interface StaffProps {
  /** scale slug, e.g. "major-ionian", "minor-pentatonic" */
  scale: string;
  /** the key's root note: "c", "f-sharp", "b-flat" */
  key: string;
  /** voice range: "bass", "baritone", "tenor", "alto", "mezzo", "soprano" */
  voice?: string;
  /** only these degrees are on the staff (major-relative): ["1","3","5","b7"]; absent shows the whole scale */
  notes?: Degree[];
  /** the notes in play: degrees (major-relative, from the key root, not scale-aware) or note names: ["1","5"] or ["c-sharp"]; the rest are muted (see `others`). Absent: every note */
  enable?: (Degree | string)[];
  /** the notes of interest, lit (when nothing is, the enabled notes are): the root, the one new note; never the same list as `enable` */
  highlight?: (Degree | string)[];
  /** notes drawn faint, same forms as `enable` */
  mute?: (Degree | string)[];
  /** notes not drawn, same forms as `enable` */
  hide?: (Degree | string)[];
  /** the notes not in `enable`: "muted" (default) or "hidden" */
  others?: "muted" | "hidden";
  /** show the "sing with the mic" button; default true */
  mic?: boolean;
  /** a drone on the key's root under the singing: the mic button becomes one Start for the drone and the mic together (Stop stops both); default false */
  drone?: boolean;
  /** a metronome click under the singing, started with the mic like `drone`; default false */
  click?: boolean;
  /** the click's tempo, 30-240; default 60 */
  bpm?: number;
  /** the label under each note: "degree" (1 2 3) or "solfege" (Do Re Mi). Absent: the student's setting, and with the mic never bare note names (degrees then) */
  labels?: "degree" | "solfege";
}
