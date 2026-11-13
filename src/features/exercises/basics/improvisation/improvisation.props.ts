/**
 * Ideas to improvise with in the key: a rhythm made from two counts against each other, and one short motive turned round, written in the key's notes. Use it to give a student something to make up lines from, next to a backing-track or a drone.
 * @component improvisation basic
 */
export interface ImprovisationProps {
  /** the key's root note: "c", "f-sharp", "b-flat" */
  key: string;
  /** scale slug, e.g. "major-ionian", "dorian", "natural-minor-aeolian"; a pentatonic or blues slug is drawn in the major or minor scale it comes from */
  scale: string;
}
