/**
 * An instrument's tuning, string by string, with the open strings that are notes of the key lit, since they ring freely in it; the student picks the instrument and the tuning on the tool. Use it for open and alternate tunings.
 * @component tunings basic
 */
export interface TuningsProps {
  /** the key's root note: "c", "f-sharp", "b-flat" */
  key: string;
  /** scale slug, e.g. "major-ionian", "dorian", "natural-minor-aeolian"; a pentatonic or blues slug is drawn in the major or minor scale it comes from */
  scale: string;
}
