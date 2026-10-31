/**
 * A game to find notes on the fretboard: find a named note, play every note, or name the note shown.
 * @component note-finder basic
 */
export interface NoteFinderProps {
  /** "find" (default), "every" or "name" */
  mode?: "find" | "every" | "name";
  /** which strings, as digits low to high: "123456" (default all) */
  strings?: string;
  /** first fret of the range, 0-24 */
  from?: number;
  /** last fret of the range, 0-24 */
  to?: number;
}
