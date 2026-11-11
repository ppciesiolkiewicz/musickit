/**
 * A legato trill: two fingers on one string, alternating by
 * hammer-on and pull-off with no picking after the first note. Use it for legato strength and finger independence.
 * @component legato-trill basic
 */
export interface LegatoTrillProps {
  /** how hard, in one word; it sets `fingers` where you leave them out, the strong pair first: "new" 12, "beginner" 13, "intermediate" 23, "advanced" 34 (the two weakest fingers). The tempo is yours to set: a faster `bpm` is the next step inside a level */
  level?: "new" | "beginner" | "intermediate" | "advanced";
  /** the two fingers, lower one first, two different digits 1-4: "12", "13", "24"; needed unless `level` is set */
  fingers?: string;
  /** the string, 1-6 (6 = low E) */
  string: number;
  /** the fret under the first finger, 1-12 */
  fret: number;
  /** tempo, 40-200; default 80 */
  bpm: number;
}
