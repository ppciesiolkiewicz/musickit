import { Note } from "@tonaljs/tonal";
import { OPEN_MIDI } from "./shapeTools";

/** A melody written as note names, and the same melody placed on the neck as tab. */
export interface MelodyNote {
  note: string;
  beats: number;
}
export interface TabNote {
  string: number;
  fret: number;
  beats: number;
  midi: number;
}

const MAX_FRET = 15;

/**
 * Place each note on the neck: inside the hand position (frets `position` to `position + 4`) on the highest string that reaches it,
 * otherwise anywhere up to fret 15, lowest fret first. Throws on a note the guitar cannot play.
 */
export function tabFor(notes: MelodyNote[], position = 0): TabNote[] {
  return notes.map(({ note, beats }) => {
    const midi = Note.midi(note.replace("♯", "#").replace("♭", "b"));
    if (midi === null) throw new Error(`Not a note: ${note}`);
    const options = OPEN_MIDI.map((open, string) => ({ string, fret: midi - open })).filter((o) => o.fret >= 0 && o.fret <= MAX_FRET);
    if (!options.length) throw new Error(`${note} is out of range for the guitar`);
    const inPos = options.filter((o) => o.fret >= position && o.fret <= position + 4).sort((a, b) => b.string - a.string);
    const pick = inPos[0] ?? [...options].sort((a, b) => a.fret - b.fret)[0];
    return { ...pick, beats, midi };
  });
}
