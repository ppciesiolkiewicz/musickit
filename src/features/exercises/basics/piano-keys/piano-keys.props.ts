/**
 * A piano keyboard with the key's notes marked in their degree colours; tap a key to hear it. Use it to show a scale's notes laid out in a row, apart from the guitar.
 * @component piano-keys basic
 */
export interface PianoKeysProps {
  /** the key's root note: "c", "f-sharp", "b-flat" */
  key: string;
  /** scale slug, e.g. "major-ionian", "dorian", "natural-minor-aeolian"; a pentatonic or blues slug is drawn in the major or minor scale it comes from */
  scale: string;
}
