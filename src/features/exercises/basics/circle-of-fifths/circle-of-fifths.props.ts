/**
 * The circle of fifths, majors outside and their relative minors inside, with the key's neighbours marked: the keys next to it are the chords of the key. Tapping a key on the circle moves the panel there. Use it for how keys are related and why some keys share most of their chords.
 * @component circle-of-fifths basic
 */
export interface CircleOfFifthsProps {
  /** the key's root note: "c", "f-sharp", "b-flat" */
  key: string;
  /** scale slug, e.g. "major-ionian", "dorian", "natural-minor-aeolian"; a pentatonic or blues slug is drawn in the major or minor scale it comes from */
  scale: string;
}
