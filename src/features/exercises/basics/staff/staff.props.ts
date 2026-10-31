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
  /** notes that stand out: degrees (major-relative, from the key root, not scale-aware) or note names as in `add`: ["3"] or ["c-sharp"] */
  highlight?: (Degree | string)[];
  /** notes drawn faint, same forms as `highlight` */
  mute?: (Degree | string)[];
  /** notes not drawn, same forms as `highlight` */
  hide?: (Degree | string)[];
  /** the notes not listed: "normal", "muted" or "hidden"; default "muted" when something is highlighted, else "normal" */
  others?: "normal" | "muted" | "hidden";
  /** show the "sing with the mic" button; default true */
  mic?: boolean;
}
