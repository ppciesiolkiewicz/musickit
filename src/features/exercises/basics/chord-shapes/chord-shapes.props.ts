import type { Voicing } from "../../timeline/types";

/**
 * One chord diagram per chord, in order; tap a diagram to strum it.
 * @component chord-shapes basic
 */
export interface ChordShapesProps {
  /** chord names in order: ["G", "Em", "C", "D7"] */
  chords: string[];
  /** "open" (default, the easy shape) or "barre" (the movable barre shape, lowest on the neck) */
  voicing?: Voicing;
}
