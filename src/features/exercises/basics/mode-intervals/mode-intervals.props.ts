/**
 * The notes of the key on one panel: spelled, numbered from the root and coloured by degree, with the step pattern and what the mode is used for. Use it beside a scale-neck to show what sets a mode apart (the ♭3 of Dorian, the ♯4 of Lydian).
 * @component mode-intervals basic
 */
export interface ModeIntervalsProps {
  /** the key's root note: "c", "f-sharp", "b-flat" */
  key: string;
  /** scale slug, e.g. "major-ionian", "dorian", "natural-minor-aeolian"; a pentatonic or blues slug is drawn in the major or minor scale it comes from */
  scale: string;
}
