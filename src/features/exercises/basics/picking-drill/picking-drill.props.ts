/**
 * Stub: shows a placeholder until the real view exists. A picking-hand drill: a stroke pattern repeated across the
 * strings. Use it for alternate picking (strokes "DU") and, with skip, for string skipping.
 * @component picking-drill basic
 */
export interface PickingDrillProps {
  /** the pick strokes in order, 1-8 of D (down) and U (up): "DU", "DDU" */
  strokes: string;
  /** notes picked on each string before moving on, 1-4; default 4 */
  notesPerString?: number;
  /** the strings to play, 1-6 (6 = low E); default all six */
  strings?: number[];
  /** jump over a string each time instead of moving to the next one; default false */
  skip?: boolean;
  /** tempo, 40-200; default 80 */
  bpm: number;
}
