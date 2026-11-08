import { chordFromNumeral, type ChordInKey } from "./numerals";

/**
 * The curated progressions. Each is written once in Roman numerals and played in any key at run time.
 * A numeral may carry its length in bars after a colon: "V7:2" two bars, "ii7:0.5" half a bar; a bare numeral is one bar.
 */

export type ModeId = "major" | "minor" | "dorian" | "phrygian" | "lydian" | "mixolydian";

export const MODES: { id: ModeId; label: string; scale: string }[] = [
  { id: "major", label: "Major", scale: "major" },
  { id: "minor", label: "Minor", scale: "aeolian" },
  { id: "dorian", label: "Dorian", scale: "dorian" },
  { id: "phrygian", label: "Phrygian", scale: "phrygian" },
  { id: "lydian", label: "Lydian", scale: "lydian" },
  { id: "mixolydian", label: "Mixolydian", scale: "mixolydian" },
];

export interface Progression {
  id: string;
  name: string;
  mode: ModeId;
  numerals: string[];
  /** the style it sounds best in; the person can pick another */
  style: string;
}

export const PROGRESSIONS: Progression[] = [
  // major
  { id: "pop", name: "Pop: I–V–vi–IV", mode: "major", numerals: ["I", "V", "vi", "IV"], style: "pop" },
  { id: "fifties", name: "50s: I–vi–IV–V", mode: "major", numerals: ["I", "vi", "IV", "V"], style: "ballad" },
  { id: "three-chord", name: "Three-chord rock: I–IV–V", mode: "major", numerals: ["I", "I", "IV", "V"], style: "rock" },
  { id: "canon", name: "Canon: I–V–vi–iii–IV–I–IV–V", mode: "major", numerals: ["I", "V", "vi", "iii", "IV", "I", "IV", "V"], style: "ballad" },
  { id: "ii-v-i", name: "Jazz ii–V–I", mode: "major", numerals: ["ii7", "V7", "Imaj7", "Imaj7"], style: "swing" },
  { id: "turnaround", name: "Jazz turnaround: I–vi–ii–V", mode: "major", numerals: ["Imaj7", "vi7", "ii7", "V7"], style: "swing" },
  { id: "blues", name: "12-bar blues", mode: "major", numerals: ["I7", "IV7", "I7", "I7", "IV7", "IV7", "I7", "I7", "V7", "IV7", "I7", "V7"], style: "shuffle" },
  { id: "bossa", name: "Bossa: Imaj7–ii7–V7", mode: "major", numerals: ["Imaj7", "Imaj7", "ii7", "V7"], style: "bossa" },
  { id: "waltz", name: "Waltz: I–IV–V–I", mode: "major", numerals: ["I", "IV", "V7", "I"], style: "waltz" },
  // minor
  { id: "andalusian", name: "Andalusian: i–♭VII–♭VI–V", mode: "minor", numerals: ["i", "bVII", "bVI", "V"], style: "rock" },
  { id: "minor-pop", name: "Minor pop: i–♭VI–♭III–♭VII", mode: "minor", numerals: ["i", "bVI", "bIII", "bVII"], style: "pop" },
  { id: "minor-ii-v", name: "Minor ii–V–i", mode: "minor", numerals: ["iiø7", "V7", "i7", "i7"], style: "bossa" },
  { id: "minor-blues", name: "Minor blues", mode: "minor", numerals: ["i7", "iv7", "i7", "i7", "iv7", "iv7", "i7", "i7", "bVI7", "V7", "i7", "V7"], style: "shuffle" },
  { id: "aeolian", name: "Aeolian vamp: i–♭VI–♭VII", mode: "minor", numerals: ["i", "bVI", "bVII", "i"], style: "rock" },
  // modes: short vamps on each mode's own chord, no V where it would pull back to major or minor
  { id: "dorian", name: "Dorian vamp: i7–IV7", mode: "dorian", numerals: ["i7", "IV7"], style: "funk" },
  { id: "phrygian", name: "Phrygian vamp: i–♭II", mode: "phrygian", numerals: ["i", "bII"], style: "rock" },
  { id: "lydian", name: "Lydian vamp: I–II", mode: "lydian", numerals: ["Imaj7", "II"], style: "ballad" },
  { id: "mixolydian", name: "Mixolydian: I–♭VII–IV–I", mode: "mixolydian", numerals: ["I", "bVII", "IV", "I"], style: "rock" },
  { id: "reggae", name: "One-drop: I–IV", mode: "major", numerals: ["I", "IV"], style: "reggae" },
];

export const findProgression = (id: string): Progression => PROGRESSIONS.find((p) => p.id === id) ?? PROGRESSIONS[0];

/** A chord placed in time: starts at `beat` (from the top of the progression) and lasts `beats`. */
export interface PlacedChord extends ChordInKey {
  beat: number;
  beats: number;
}

/** "V7:2" → ["V7", 2]; a missing or bad length is one bar. */
export function splitLength(token: string): [string, number] {
  const [numeral, len] = token.split(":");
  const bars = Number(len);
  return [numeral, len !== undefined && Number.isFinite(bars) && bars > 0 ? bars : 1];
}

/** The progression laid out in beats in `tonic`, `beatsPerBar` to the bar. Numerals that do not parse are dropped. */
export function layOut(numerals: readonly string[], tonic: string, beatsPerBar: number): { chords: PlacedChord[]; beats: number } {
  let beat = 0;
  const chords: PlacedChord[] = [];
  for (const token of numerals) {
    const [numeral, bars] = splitLength(token);
    const chord = chordFromNumeral(numeral, tonic);
    if (!chord) continue;
    const beats = bars * beatsPerBar;
    chords.push({ ...chord, beat, beats });
    beat += beats;
  }
  return { chords, beats: beat };
}
