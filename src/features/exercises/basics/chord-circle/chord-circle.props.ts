/**
 * One chord of the key in the middle, with its sus and extended chords around it (sus2, sus4, add9, 7th, 9th); tap one to hear it. Use it to show what a chord can turn into while it still fits the key.
 * @component chord-circle basic
 */
export interface ChordCircleProps {
  /** the key's root note: "c", "f-sharp", "b-flat" */
  key: string;
  /** scale slug, e.g. "major-ionian", "dorian", "natural-minor-aeolian"; a pentatonic or blues slug is drawn in the major or minor scale it comes from */
  scale: string;
  /** the chord in the middle: the note of the scale it is built on, 1 to 7 (1 is the key's own chord); absent: 1 */
  degree?: number;
}
