import type { Voicing } from "../../timeline/types";

/**
 * One chord diagram per chord, in order, with the finger that frets each note on its dot (a switch shows intervals
 * instead); tap a diagram to strum it. Show a fingering with this, never describe it in text.
 * @component chord-shapes basic
 */
export interface ChordShapesProps {
  /** chord names in order: ["G", "Em", "C", "D7"] */
  chords: string[];
  /** "open" (default, the easy shape) or "barre" (the movable barre shape, lowest on the neck) */
  voicing?: Voicing;
}
