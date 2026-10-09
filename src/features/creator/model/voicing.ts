/**
 * Chords as notes you can play: a chord suffix ("m7", "7♯9", "maj7♯11") and a root become MIDI numbers in close position.
 * Pure. The suffixes are the ones the theory feature writes (TRIAD_SUFFIX, the seventh table and the progression list).
 */

const S: Record<string, number[]> = {
  "": [0, 4, 7],
  m: [0, 3, 7],
  dim: [0, 3, 6],
  aug: [0, 4, 8],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
  "6": [0, 4, 7, 9],
  m6: [0, 3, 7, 9],
  "6/9": [0, 4, 7, 9, 14],
  "7": [0, 4, 7, 10],
  maj7: [0, 4, 7, 11],
  m7: [0, 3, 7, 10],
  "m(maj7)": [0, 3, 7, 11],
  "m7♭5": [0, 3, 6, 10],
  dim7: [0, 3, 6, 9],
  "7♯5": [0, 4, 8, 10],
  "7♭9": [0, 4, 7, 10, 13],
  "7♯9": [0, 4, 7, 10, 15],
  "7♯11": [0, 4, 7, 10, 18],
  "maj7♯11": [0, 4, 7, 11, 18],
  "9": [0, 4, 7, 10, 14],
  maj9: [0, 4, 7, 11, 14],
  m9: [0, 3, 7, 10, 14],
  "13": [0, 4, 7, 10, 14, 21],
  "7alt": [0, 4, 6, 10, 13],
};

/** Semitones above the root for a chord suffix; a major triad for one we do not know. */
export function chordSemis(suffix: string): number[] {
  return S[suffix] ?? S[""];
}

export const knownSuffix = (suffix: string): boolean => suffix in S;

/** The chord's notes as MIDI numbers, the root in the octave starting at `base` (48 = C3). */
export function voice(rootPc: number, suffix: string, base = 48): number[] {
  const root = base + (((rootPc - base) % 12) + 12) % 12;
  return chordSemis(suffix).map((s) => root + s);
}
