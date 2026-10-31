/**
 * Stub: shows a placeholder until the real view exists. A legato trill: two fingers on one string, alternating by
 * hammer-on and pull-off with no picking after the first note. Use it for legato strength and finger independence.
 * @component legato-trill basic
 */
export interface LegatoTrillProps {
  /** the two fingers, lower one first, two different digits 1-4: "12", "13", "24" */
  fingers: string;
  /** the string, 1-6 (6 = low E) */
  string: number;
  /** the fret under the first finger, 1-12 */
  fret: number;
  /** tempo, 40-200; default 80 */
  bpm: number;
}
