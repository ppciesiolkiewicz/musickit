import type { ArpeggioPartShape, ChordStepsShape, MelodyShape, ProgressionShape, SoloOverShape, TwoScalesShape } from "../shapes/shapes.props";
import type { Degree } from "../timeline/types";

type NoTempo<S> = Omit<S, "bpm" | "repeats">;
/** One of the play-along shapes, without `bpm` and `repeats` (those sit on the play-along itself). */
export type PlayAlongShape =
  | NoTempo<ProgressionShape> | NoTempo<TwoScalesShape> | NoTempo<ChordStepsShape>
  | NoTempo<ArpeggioPartShape> | NoTempo<MelodyShape> | NoTempo<SoloOverShape>;

/**
 * Play along with a click and piano: the music shown as tab, as note names or on the neck, all following one clock.
 * You choose the musical content as a shape; the app computes the notes, frets, strings and timing. Shapes, by name:
 * `progression`, `two-scales`, `chord-steps`, `arpeggio-part`, `melody`, `solo-over` (see each shape's doc).
 * The student can change tempo and view, and pick a backing when the shape offers more than one.
 *
 * Example: `{ "type": "play-along", "shape": { "shape": "chord-steps", "voicing": "barre", "chords": [{ "chord": "G", "steps": ["strum","1","6","1"] }, { "chord": "D", "steps": ["strum","4","5","4"] }] }, "bpm": 70, "repeats": 4 }`
 * @component play-along guided
 */
export interface PlayAlongProps {
  /** the musical content: one shape object, its `shape` field naming it */
  shape: PlayAlongShape;
  /** tempo, 30-240 */
  bpm: number;
  /** how many times the timeline loops (1-50); absent loops until stopped */
  repeats?: number;
  /** first view: "tab" (default), "notes" or "neck" */
  view?: "tab" | "notes" | "neck";
  /** degrees to stand out (major-relative, from the chord root): ["1","3"] */
  highlight?: Degree[];
  /** the notes not highlighted: "dimmed" (default) or "hidden" */
  others?: "dimmed" | "hidden";
}
