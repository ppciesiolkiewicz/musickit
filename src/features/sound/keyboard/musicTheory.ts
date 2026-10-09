import { Scale, Note, Chord } from "@tonaljs/tonal";

/**
 * Get all note names in a scale (e.g. "C major" -> ["C", "D", "E", "F", "G", "A", "B"])
 */
export function getScaleNotes(scaleName: string): string[] {
  const scale = Scale.get(scaleName);
  return scale.empty ? [] : scale.notes;
}

/**
 * Check if a note (e.g. "C#4") belongs to a scale (handles enharmonics like C#/Db)
 */
export function isNoteInScale(noteName: string, scaleName: string): boolean {
  const scaleNotes = getScaleNotes(scaleName);
  const noteChroma = Note.get(noteName).chroma;
  if (noteChroma === undefined) return false;
  return scaleNotes.some((n) => Note.get(n).chroma === noteChroma);
}

/**
 * Get scale degree of a note in a scale (1-7 for diatonic, 1-12 for chromatic, or null if not in scale)
 */
export function getScaleDegree(noteName: string, scaleName: string): number | null {
  const scaleNotes = getScaleNotes(scaleName);
  const noteChroma = Note.get(noteName).chroma;
  if (noteChroma === undefined) return null;
  const idx = scaleNotes.findIndex((n) => Note.get(n).chroma === noteChroma);
  return idx >= 0 ? idx + 1 : null;
}

/**
 * Get chord tones for a chord (e.g. "Cmaj" -> ["C", "E", "G"])
 */
export function getChordNotes(chordName: string): string[] {
  const chord = Chord.get(chordName);
  return chord.empty ? [] : chord.notes;
}

/**
 * Common scale options for the scale selector
 */
export const SCALE_OPTIONS = [
  { value: "", label: "None" },
  { value: "major", label: "Major" },
  { value: "minor", label: "Minor (natural)" },
  { value: "harmonic minor", label: "Harmonic minor" },
  { value: "melodic minor", label: "Melodic minor" },
  { value: "pentatonic", label: "Pentatonic" },
  { value: "blues", label: "Blues" },
  { value: "dorian", label: "Dorian" },
  { value: "mixolydian", label: "Mixolydian" },
  { value: "chromatic", label: "Chromatic" },
] as const;

export const TONIC_OPTIONS = [
  "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B",
];
