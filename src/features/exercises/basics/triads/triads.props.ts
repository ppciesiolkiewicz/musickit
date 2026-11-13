/**
 * One chord of the key as a triad in its three inversions on one group of three strings; the student picks the chord and the string group on the tool. Use it for triad shapes on the guitar; key-chords for the chords of a key as a set.
 * @component triads basic
 */
export interface TriadsProps {
  /** the key's root note: "c", "f-sharp", "b-flat" */
  key: string;
  /** scale slug, e.g. "major-ionian", "dorian", "natural-minor-aeolian"; a pentatonic or blues slug is drawn in the major or minor scale it comes from */
  scale: string;
}
