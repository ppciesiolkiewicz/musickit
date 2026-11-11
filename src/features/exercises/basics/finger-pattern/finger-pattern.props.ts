/**
 * A finger-pattern drill: the spider and finger permutations,
 * one finger per fret, played on each string in turn. Use it for dexterity and finger independence warm-ups.
 * @component finger-pattern basic
 */
export interface FingerPatternProps {
  /** how hard, in one word; it sets `fingers` and `fret` where you leave them out: "new" 1234 from fret 5 (the frets are closer there), "beginner" 1234 from fret 1, "intermediate" 1324, "advanced" 1423. The tempo is yours to set: a faster `bpm` is the next step inside a level */
  level?: "new" | "beginner" | "intermediate" | "advanced";
  /** the fretting fingers in playing order, 2-4 different digits 1-4: "1234" (the spider), "1324", "13"; needed unless `level` is set */
  fingers?: string;
  /** the fret under finger 1, 1-12; default 1 */
  fret?: number;
  /** the strings to play, 1-6 (6 = low E); default all six */
  strings?: number[];
  /** the row under the tab: "finger" (the fretting finger, for beginners) or "pick" (the pick stroke ↓ ↑); unset, the student switches between them, starting on finger */
  show?: "finger" | "pick";
  /** tempo, 40-200; default 80 */
  bpm: number;
}
