import { Chord, Interval, Note } from "@tonaljs/tonal";

/**
 * Roman numerals → chords in a key. Pure, no audio.
 *
 * Case carries the quality, as musicians write it: "I" major, "i" minor, "vii°" diminished, "iiø7" half-diminished.
 * A suffix adds the rest ("7", "maj7", "sus4", "6", "9"…). Flats and sharps go in front ("bVII", "#iv°").
 * tonal's own `Progression.fromRomanNumerals` ignores lower case ("i" gives a major chord), hence this parser.
 */

export interface ChordInKey {
  /** what was written, e.g. "bVIImaj7" */
  numeral: string;
  /** the chord symbol in the key, e.g. "Cmaj7" */
  symbol: string;
  /** the root's pitch class, 0 = C */
  rootPc: number;
  /** the chord's pitch classes from the root up (root first) */
  pcs: number[];
}

const NUMERALS = ["I", "II", "III", "IV", "V", "VI", "VII"];
/** the major scale's interval for each degree: a numeral is counted from the tonic on the major scale, flats and sharps move it */
const DEGREE_INTERVAL = ["1P", "2M", "3M", "4P", "5P", "6M", "7M"];

const RE = /^([b#♭♯]*)(VII|VI|IV|V|III|II|I|vii|vi|iv|v|iii|ii|i)(.*)$/;

/** The tonal chord type for a numeral's case and suffix. */
function chordType(minor: boolean, suffix: string): string {
  const s = suffix.replace(/^\s+/, "");
  if (s.startsWith("ø")) return "m7b5";
  if (s.startsWith("°") || s.startsWith("o")) return s.slice(1) === "7" ? "dim7" : "dim";
  if (s === "dim" || s === "dim7") return s;
  if (!minor) return s; // "", "7", "maj7", "sus4", "6", "9", "add9"…
  // minor: a bare 7 or 9 is m7 / m9; anything that names its own quality ("maj7") keeps it as "mMaj7"
  if (s === "") return "m";
  if (s === "maj7") return "mMaj7";
  return `m${s}`;
}

const chroma = (n: string) => Note.chroma(n) ?? 0;

/** One numeral in `tonic` ("D", "Bb"), or null when it does not parse to a chord tonal knows. */
export function chordFromNumeral(numeral: string, tonic: string): ChordInKey | null {
  const m = RE.exec(numeral.trim());
  if (!m) return null;
  const [, acc, roman, suffix] = m;
  const degree = NUMERALS.indexOf(roman.toUpperCase());
  const shift = [...acc].reduce((n, a) => n + (a === "b" || a === "♭" ? -1 : 1), 0);
  const base = DEGREE_INTERVAL[degree];
  const interval = shift === 0 ? base : Interval.transposeFifths(base, shift * 7);
  const root = Note.simplify(Note.transpose(tonic, interval));
  const minor = roman === roman.toLowerCase();
  const type = chordType(minor, suffix);
  const chord = Chord.getChord(type, root);
  if (chord.empty) return null;
  const symbol = `${root}${type === "" ? "" : type === "m" ? "m" : type}`;
  return { numeral, symbol, rootPc: chroma(root), pcs: chord.notes.map(chroma) };
}

/** Every numeral in `tonic`; unknown numerals are dropped. */
export const chordsFromNumerals = (numerals: readonly string[], tonic: string): ChordInKey[] => numerals.flatMap((n) => chordFromNumeral(n, tonic) ?? []);
