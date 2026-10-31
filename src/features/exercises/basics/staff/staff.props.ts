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
  /** degrees that stand out (major-relative, from the key root, not scale-aware) */
  highlight?: Degree[];
  /** the notes not highlighted: "dimmed" (default) or "hidden" */
  others?: "dimmed" | "hidden";
  /** show the "sing with the mic" button; default true */
  mic?: boolean;
}
