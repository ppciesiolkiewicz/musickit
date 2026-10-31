import type { Degree } from "../../timeline/types";

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
  /** only these degrees of the chord (major-relative to the chord root): ["1","b3"] */
  part?: Degree[];
  /** degrees that stand out (major-relative to the chord root, not scale-aware) */
  highlight?: Degree[];
  /** the notes not highlighted: "dimmed" (default) or "hidden" */
  others?: "dimmed" | "hidden";
}
