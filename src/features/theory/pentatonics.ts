import { FAMILIES, makeKeyContext, shortModeName, type KeyContext } from "./theory";
import { degreeLabels } from "./scales";

/**
 * Five-note scales. Each one is a mode of the major scale with two notes left out (its "host"): major pentatonic is Ionian
 * without the 4th and 7th, In is Phrygian without the 3rd and 7th. Keeping the host means the notes are spelled, numbered and
 * coloured by their place in a seven-note scale (the 5th of a pentatonic is still the blue 5th, not its 4th note), and the
 * guitar boxes come from the host's boxes.
 */
export interface PentatonicScale {
  slug: string;
  name: string;
  /** another name it goes by: "Egyptian", "blues minor" */
  alias?: string;
  /** mode of the major scale it is cut from (0 = Ionian ... 6 = Locrian) */
  host: number;
  /** the five 0-based degrees of the host it keeps */
  degrees: number[];
  char: string;
  mood: string;
  use: string;
}

export const PENTATONICS: PentatonicScale[] = [
  {
    slug: "major-pentatonic", name: "Major pentatonic", host: 0, degrees: [0, 1, 2, 4, 5],
    char: "The major scale without its 4th and 7th, so there are no half steps and no note that clashes.",
    mood: "Open, sunny, hard to play a wrong note.",
    use: "Country, pop and rock solos over major chords.",
  },
  {
    slug: "minor-pentatonic", name: "Minor pentatonic", host: 5, degrees: [0, 2, 3, 4, 6],
    char: "Natural minor without its 2nd and 6th. The same five notes as the major pentatonic a minor 3rd up.",
    mood: "Bluesy, gritty: the rock-solo sound.",
    use: "Blues and rock solos over minor chords, and over the dominant 7ths of a blues.",
  },
  {
    slug: "suspended-pentatonic", name: "Suspended pentatonic", alias: "Egyptian", host: 1, degrees: [0, 1, 3, 4, 6],
    char: "No 3rd at all, so it is neither major nor minor: 2, 4, 5 and ♭7 around the root.",
    mood: "Floating, open, ancient.",
    use: "Over sus4 and 7sus4 chords; Celtic and modal folk tunes.",
  },
  {
    slug: "man-gong", name: "Man gong", alias: "blues minor", host: 2, degrees: [0, 2, 3, 5, 6],
    char: "Minor 3rd, 4th, ♭6 and ♭7, with no 2nd and no 5th.",
    mood: "Dark, heavy, brooding.",
    use: "Minor riffs that lean on the ♭6; over minor chords with a ♭6 colour.",
  },
  {
    slug: "ritusen", name: "Ritusen", alias: "blues major", host: 4, degrees: [0, 1, 3, 4, 5],
    char: "Major pentatonic with the 4th in place of the 3rd: 2, 4, 5 and 6, no 3rd.",
    mood: "Bright but suspended, folky.",
    use: "Over sus2, sus4 and 6/9 sounds; Japanese court music (ritsu) and Chinese folk tunes.",
  },
  {
    slug: "hirajoshi", name: "Hirajōshi", host: 5, degrees: [0, 1, 2, 4, 5],
    char: "R 2 ♭3 5 ♭6: half steps from the 2nd to the ♭3 and from the 5th to the ♭6, big gaps between.",
    mood: "Japanese, dark and delicate (a koto tuning).",
    use: "Atmospheric lines over a minor drone; film and metal.",
  },
  {
    slug: "in-scale", name: "In", alias: "Miyako-bushi", host: 2, degrees: [0, 1, 3, 4, 5],
    char: "R ♭2 4 5 ♭6: half steps up from the root and up from the 5th.",
    mood: "Haunting, melancholy Japanese (the sound of Sakura).",
    use: "Over a Phrygian drone or a minor chord with a ♭2.",
  },
  {
    slug: "iwato", name: "Iwato", host: 6, degrees: [0, 1, 3, 4, 6],
    char: "R ♭2 4 ♭5 ♭7: In with the 5th and ♭6 lowered a half step.",
    mood: "Very dark and unsettled.",
    use: "Over m7♭5 chords or a drone; Japanese temple music.",
  },
  {
    slug: "kumoi", name: "Kumoi", host: 1, degrees: [0, 1, 2, 4, 5],
    char: "R 2 ♭3 5 6: minor 3rd with a natural 6th, the Dorian pentatonic.",
    mood: "Gentle, bittersweet.",
    use: "Over m6 and m7 chords; a softer minor pentatonic.",
  },
];

export const findPentatonic = (slug: string) => PENTATONICS.find((p) => p.slug === slug);

/** "Suspended pentatonic (Egyptian)" for menus. */
export const pentatonicLabel = (p: PentatonicScale) => (p.alias ? `${p.name} (${p.alias})` : p.name);

/** The host mode's name: "Ionian", "Phrygian". */
export const hostName = (p: PentatonicScale) => shortModeName(FAMILIES[0].names[p.host]);

/** A pentatonic in one key: the host mode in that key, with the five kept notes picked out. */
export interface PentatonicContext {
  scale: PentatonicScale;
  /** the seven-note mode it is cut from; index notes, labels and colours with its degrees */
  host: KeyContext;
  degrees: number[];
  /** semitones above the root, one per kept degree */
  steps: number[];
  names: string[];
  /** "R 2 3 5 6" */
  formula: string[];
  /** "E major pentatonic", "E Hirajōshi" */
  title: string;
}

export function pentatonicContext(tonicPc: number, scale: PentatonicScale): PentatonicContext {
  const host = makeKeyContext(tonicPc, 0, scale.host);
  const labels = degreeLabels(host.steps);
  const name = /pentatonic/.test(scale.name) ? scale.name.toLowerCase() : scale.name;
  return {
    scale,
    host,
    degrees: scale.degrees,
    steps: scale.degrees.map((d) => host.steps[d]),
    names: scale.degrees.map((d) => host.names[d]),
    formula: scale.degrees.map((d) => labels[d]),
    title: `${host.names[0]} ${name}`,
  };
}

/** Semitones from one note of the scale to the next, as W (2), H (1) or W+H (3): "W W W+H W W+H" for major pentatonic. */
export function pentatonicSteps(steps: number[]): string[] {
  return steps.map((s, i) => {
    const d = (i === steps.length - 1 ? 12 : steps[i + 1]) - s;
    return d === 1 ? "H" : d === 2 ? "W" : d === 3 ? "W+H" : d === 4 ? "2W" : String(d);
  });
}

/**
 * The other pentatonics made of exactly the same five notes, each on its own root: C major pentatonic is also A minor
 * pentatonic, D suspended, E man gong and G ritusen.
 */
export function samePentatonicNotes(tonicPc: number, scale: PentatonicScale): { scale: PentatonicScale; tonicPc: number }[] {
  const pcs = (root: number, p: PentatonicScale) => {
    const host = FAMILIES[0];
    const steps = p.degrees.map((d) => (host.parent[(p.host + d) % 7] - host.parent[p.host] + 12) % 12);
    return steps.map((s) => (root + s) % 12).sort((a, b) => a - b).join(",");
  };
  const mine = pcs(tonicPc, scale);
  return PENTATONICS.filter((p) => p !== scale).flatMap((p) => {
    for (let r = 0; r < 12; r++) if (pcs(r, p) === mine) return [{ scale: p, tonicPc: r }];
    return [];
  });
}
