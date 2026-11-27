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
  /**
   * per chord, in the same order: the exact frets, six numbers or "x", low E first ("5 7 7 5 x x"), optionally followed by the fingers after a bar, 1 to 4 or 0 for
   * an open string, x where muted ("1 x 2 2 1 x | 1 x 3 4 2 x"); null or absent: the
   * voicing's shape. Written by a person in an article or a seed block, never offered to the AI (`PROMPT_HIDDEN_PROPS`)
   */
  frets?: (string | null)[];
}
