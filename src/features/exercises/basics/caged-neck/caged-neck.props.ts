/**
 * The CAGED shapes of the key's chord on the guitar neck (the minor shapes when the scale has a minor 3rd): with `shapes`, those shapes one under another, each with its chord, arpeggio, pentatonic and scale; without, all five on the whole neck. Use it for how the five shapes join up the neck.
 * @component caged-neck basic
 */
export interface CagedNeckProps {
  /** the key's root note: "c", "f-sharp", "b-flat" */
  key: string;
  /** scale slug, e.g. "major-ionian", "dorian", "natural-minor-aeolian"; a pentatonic or blues slug is drawn in the major or minor scale it comes from */
  scale: string;
  /** the shapes to show, from "C", "A", "G", "E", "D"; absent: all five on the whole neck */
  shapes?: string[];
  /**
   * on the whole neck (no `shapes`): frame each shape's whole chord in the shape's colour, all six strings high like a barre,
   * a note two shapes share inside both frames. "only": frame each shape's island instead, the notes the open chord's fingers press, moved up, with the chord's
   * other notes faded. Either way the island's notes are ringed in the shape's colour. Written by a person in an article or a seed block, never offered to the AI (`PROMPT_HIDDEN_PROPS`)
   */
  islands?: boolean | "only";
}
