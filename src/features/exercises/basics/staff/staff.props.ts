import type { Degree } from "../../timeline/types";

/**
 * The scale on a staff in a voice's range, with the microphone's pitch drawn on it; tap a note to hear it. With `drone` and/or
 * `click` it carries its own backing, so a singing exercise needs no `backing-band` beside it: starting the mic also starts the drone,
 * the drone UI provides start/stop and mute controls, and the step's "Start exercise" starts both together (Stop exercise stops both).
 * Beside a backing-track, `follow` or `line` make the ringed notes change with the chord playing, with a tip line under the staff.
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
  /** also the staff's notes under the lowest Do, down to the voice's lowest note, so a line can dip to Ti under Do; default false */
  under?: boolean;
  /** the notes in play: degrees (major-relative, from the key root, not scale-aware) or note names: ["1","5"] or ["c-sharp"]; the rest are muted (see `others`). Absent: every note */
  enable?: (Degree | string)[];
  /** the notes of interest, ringed (the enabled rest stay plain, the muted faint): the root, the one new note; never the same list as `enable` */
  highlight?: (Degree | string)[];
  /** notes drawn faint, same forms as `enable` */
  mute?: (Degree | string)[];
  /** notes not drawn, same forms as `enable` */
  hide?: (Degree | string)[];
  /** the notes not in `enable`: "muted" (default) or "hidden" */
  others?: "muted" | "hidden";
  /** show the "Start microphone" button; default true */
  mic?: boolean;
  /** a drone on the key's root under the singing, with its own Play; the step's "Start exercise" starts it and the mic together; default false */
  drone?: boolean;
  /** a metronome click under the singing, played like `drone` (with the drone when both are set); default false */
  click?: boolean;
  /** the click's tempo, 30-240; default 60 */
  bpm?: number;
  /** the label under each note: "degree" (1 2 3) or "solfege" (Do Re Mi). Absent: the student's setting, and with the mic never bare note names (degrees then) */
  labels?: "degree" | "solfege";
  /**
   * next to a backing-track in the same step: while it plays, ring the notes of the chord playing now, and say them in a
   * tip line under the staff ("Em7: start on G (4) or D (1)."). "guide-tones" the 3rd and the 7th (a triad: its 3rd and
   * root), "chord" all its notes, "root" its root. The text then never lists the notes per chord: it says "start each
   * chord on a ringed note". Stopped: `highlight` is ringed
   */
  follow?: "guide-tones" | "chord" | "root";
  /**
   * next to a backing-track: a set line to sing, one note per chord of the backing track, in order (major-relative
   * degrees; a note may come twice in a row): ["4","4","3","3"] over ii7 V7 Imaj7 Imaj7. While the track plays, the note to sing now is
   * ringed and named in the tip line under the staff, so the text never spells the line out: "sing the ringed note
   * over each chord". Wins over `follow`
   */
  line?: Degree[];
}
