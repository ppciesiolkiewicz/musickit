/**
 * A game to find notes on the fretboard: find a named note, play every note, or name the note shown.
 * @component note-finder basic
 */
export interface NoteFinderProps {
  /** how hard, in one word; it sets the strings, the frets and the notes asked. "new": the low E and A strings, frets 0-5, natural notes only. "beginner": the same two strings up to fret 12. "intermediate": all six strings, frets 0-12, sharps and flats too. "advanced": all six strings up to fret 15. The next step inside a level: `mode` "name" */
  level?: "new" | "beginner" | "intermediate" | "advanced";
  /** "find" (default), "every" or "name" */
  mode?: "find" | "every" | "name";
  /** which strings, as digits low to high: "123456" (default all) */
  strings?: string;
  /** first fret of the range, 0-24 */
  from?: number;
  /** last fret of the range, 0-24 */
  to?: number;
}
