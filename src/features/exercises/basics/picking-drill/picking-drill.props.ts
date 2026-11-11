/**
 * A picking-hand drill: a stroke pattern repeated across the
 * strings. Use it for alternate picking (strokes "DU") and, with skip, for string skipping.
 * @component picking-drill basic
 */
export interface PickingDrillProps {
  /** how hard, in one word; it sets `strokes`, `notesPerString` and `skip` where you leave them out: "new" all downstrokes, four notes a string; "beginner" down-up, four notes a string; "intermediate" down-up, three notes a string (each string starts on the other stroke); "advanced" down-up, two notes a string, skipping a string. The tempo is yours to set: a faster `bpm` is the next step inside a level */
  level?: "new" | "beginner" | "intermediate" | "advanced";
  /** the pick strokes in order, 1-8 of D (down) and U (up): "DU", "DDU"; needed unless `level` is set */
  strokes?: string;
  /** notes picked on each string before moving on, 1-4; default 4 */
  notesPerString?: number;
  /** the strings to play, 1-6 (6 = low E); default all six */
  strings?: number[];
  /** jump over a string each time instead of moving to the next one; default false */
  skip?: boolean;
  /** tempo, 40-200; default 80 */
  bpm: number;
}
