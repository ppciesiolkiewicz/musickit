import type { Degree } from "../../timeline/types";

/**
 * The scale on a staff in a voice's range, with the microphone's pitch drawn on it; tap a note to hear it.
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
}
