import { OPEN_MIDI } from "./shapeTools";

/**
 * Closed-position triads on three adjacent strings, generated from the chord tones
 * (no hand-written shape table). String index 0 = low E ... 5 = high e.
 */
export type TriadQuality = "maj" | "min" | "dim" | "aug";

export const TRIAD_QUALITIES: { id: TriadQuality; label: string; symbol: string; semis: [number, number, number]; labels: [string, string, string] }[] = [
  { id: "maj", label: "Major", symbol: "", semis: [0, 4, 7], labels: ["R", "3", "5"] },
  { id: "min", label: "Minor", symbol: "m", semis: [0, 3, 7], labels: ["R", "♭3", "5"] },
  { id: "dim", label: "Diminished", symbol: "dim", semis: [0, 3, 6], labels: ["R", "♭3", "♭5"] },
  { id: "aug", label: "Augmented", symbol: "aug", semis: [0, 4, 8], labels: ["R", "3", "♯5"] },
];

export interface StringGroup {
  id: string;
  label: string;
  /** string indices, low to high */
  strings: [number, number, number];
}

export const STRING_GROUPS: StringGroup[] = [
  { id: "654", label: "Strings 6-5-4 (E A D)", strings: [0, 1, 2] },
  { id: "543", label: "Strings 5-4-3 (A D G)", strings: [1, 2, 3] },
  { id: "432", label: "Strings 4-3-2 (D G B)", strings: [2, 3, 4] },
  { id: "321", label: "Strings 3-2-1 (G B e)", strings: [3, 4, 5] },
];

export const INVERSIONS = [
  { id: 0, label: "Root position", short: "Root", order: [0, 1, 2] },
  { id: 1, label: "1st inversion", short: "1st inv.", order: [1, 2, 0] },
  { id: 2, label: "2nd inversion", short: "2nd inv.", order: [2, 0, 1] },
] as const;

export interface TriadVoicing {
  group: StringGroup;
  quality: TriadQuality;
  inversion: 0 | 1 | 2;
  /** fret per string of the group, low to high */
  frets: [number, number, number];
  /** chord-tone index (0 root, 1 third, 2 fifth) per string */
  tones: [number, number, number];
  midi: [number, number, number];
  lowestFret: number;
}

const MAX_FRET = 17;
const MAX_SPAN = 4;

/** Every closed voicing of one triad quality + inversion on one string group, for a given root pitch class. */
export function triadVoicings(rootPc: number, quality: TriadQuality, inversion: 0 | 1 | 2, group: StringGroup): TriadVoicing[] {
  const q = TRIAD_QUALITIES.find((x) => x.id === quality)!;
  const order = INVERSIONS[inversion].order;
  const out: TriadVoicing[] = [];
  const fretsFor = (stringIdx: number, toneIdx: number): number[] => {
    const pc = (rootPc + q.semis[toneIdx]) % 12;
    const res: number[] = [];
    for (let f = 0; f <= MAX_FRET; f++) if ((OPEN_MIDI[stringIdx] + f) % 12 === pc) res.push(f);
    return res;
  };
  const [sa, sb, sc] = group.strings;
  for (const fa of fretsFor(sa, order[0]))
    for (const fb of fretsFor(sb, order[1]))
      for (const fc of fretsFor(sc, order[2])) {
        const fr = [fa, fb, fc];
        const midi = [OPEN_MIDI[sa] + fa, OPEN_MIDI[sb] + fb, OPEN_MIDI[sc] + fc] as [number, number, number];
        if (!(midi[0] < midi[1] && midi[1] < midi[2])) continue;
        if (midi[2] - midi[0] >= 12) continue; // closed: all three notes inside one octave
        if (Math.max(...fr) - Math.min(...fr) > MAX_SPAN) continue;
        out.push({ group, quality, inversion, frets: [fa, fb, fc], tones: [order[0], order[1], order[2]], midi, lowestFret: Math.min(...fr) });
      }
  return out.sort((a, b) => a.lowestFret - b.lowestFret);
}
