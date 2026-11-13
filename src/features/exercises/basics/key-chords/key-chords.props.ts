/**
 * The chord on every note of the scale, with its numeral; tap a chord to hear it. Use it for the chords of a key as a set; triads for one chord's shapes on the guitar.
 * @component key-chords basic
 */
export interface KeyChordsProps {
  /** the key's root note: "c", "f-sharp", "b-flat" */
  key: string;
  /** scale slug, e.g. "major-ionian", "dorian", "natural-minor-aeolian"; a pentatonic or blues slug is drawn in the major or minor scale it comes from */
  scale: string;
}
