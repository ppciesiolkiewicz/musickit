/**
 * Stub: shows a placeholder until the real view exists. A finger-pattern drill: the spider and finger permutations,
 * one finger per fret, played on each string in turn. Use it for dexterity and finger independence warm-ups.
 * @component finger-pattern basic
 */
export interface FingerPatternProps {
  /** the fretting fingers in playing order, 2-4 different digits 1-4: "1234" (the spider), "1324", "13" */
  fingers: string;
  /** the fret under finger 1, 1-12; default 1 */
  fret?: number;
  /** the strings to play, 1-6 (6 = low E); default all six */
  strings?: number[];
  /** tempo, 40-200; default 80 */
  bpm: number;
}
