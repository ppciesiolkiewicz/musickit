/**
 * The modes that share the key's notes, each starting from another note of the scale. Tap one to see the same notes from its own root. Use it to show that a mode is the key's notes heard from a new home note; it has nothing to play along with.
 * @component relative-modes basic
 */
export interface RelativeModesProps {
  /** the key's root note: "c", "f-sharp", "b-flat" */
  key: string;
  /** scale slug, e.g. "major-ionian", "dorian", "natural-minor-aeolian"; a pentatonic or blues slug is drawn in the major or minor scale it comes from */
  scale: string;
}
