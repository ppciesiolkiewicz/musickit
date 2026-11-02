import type { CompPattern } from "@/lib/practice/comping";

/**
 * Chords for a singer: the app plays a progression on the piano with a click, one chord a bar, looping until stopped,
 * and shows it as a row of chord boxes, the one playing lit and the next one outlined, so the singer sees which chord
 * sounds now and what comes next. Nothing to play: use it whenever a singer sings over chords (guide tones, chord notes,
 * a line of their own), next to a staff with the mic. For a guitarist playing over chords, use guitar-play-along.
 *
 * Example: `{ "type": "chord-backing", "chords": ["Dm7", "G7", "Cmaj7", "Cmaj7"], "bpm": 72 }` shows
 * [ Dm7 · · · · ] [ G7 ] [ Cmaj7 ] [ Cmaj7 ], the bar playing lit with its beat
 * @component chord-backing basic
 */
export interface ChordBackingProps {
  /** the chords in order, one per bar, looping; repeat a chord to hold it longer: ["D", "D", "A", "A"] */
  chords?: string[];
  /** instead of `chords`: major-key numerals, one per bar (I ii iii IV V vi vii°, V7, bVII), read in `key` */
  numerals?: string[];
  /** the key as a note, needed with `numerals`: "d", "f-sharp", "b-flat" */
  key?: string;
  /** tempo, 30-240 */
  bpm: number;
  /** how the piano plays the chords, the student can switch: "block" (default), "strum", "bass-chord", "arp-up", "arp-down", "arp-updown", "fingerstyle"; the first plays first */
  backing?: CompPattern[];
}
