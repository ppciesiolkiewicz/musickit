import { FAMILIES, MAJOR, makeKeyContext, shortModeName, type KeyContext } from "./theory";
import { degreeLabels } from "./scales";

/**
 * Five-note scales. Each one is a mode of the major scale with two notes left out (its "host"): major pentatonic is Ionian
 * without the 4th and 7th, In is Phrygian without the 3rd and 7th. Keeping the host means the notes are spelled, numbered and
 * coloured by their place in a seven-note scale (the 5th of a pentatonic is still the blue 5th, not its 4th note), and the
 * guitar boxes come from the host's boxes. The blues scale is the one with six: minor pentatonic plus a blue note from outside the
 * host, which takes the colour of the degree it alters.
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
  /**
   * A note from outside the host added to the five: the blues scale's ♯4. `degree` is the host degree it is an altered form of
   * (it takes that degree's colour and letter), `semis` its distance above the root.
   */
  blue?: { degree: number; semis: number };
  /** one of the two everyday pentatonics, listed first on the scales page */
  basic?: boolean;
  char: string;
  mood: string;
  use: string;
}

export const PENTATONICS: PentatonicScale[] = [
  {
    slug: "major-pentatonic", name: "Major pentatonic", host: 0, degrees: [0, 1, 2, 4, 5], basic: true,
    char: "The major scale without its 4th and 7th, so there are no half steps and no note that clashes.",
    mood: "Open, sunny, hard to play a wrong note.",
    use: "Country, pop and rock solos over major chords.",
  },
  {
    slug: "minor-pentatonic", name: "Minor pentatonic", host: 5, degrees: [0, 2, 3, 4, 6], basic: true,
    char: "Natural minor without its 2nd and 6th. The same five notes as the major pentatonic a minor 3rd up.",
    mood: "Bluesy, gritty: the rock-solo sound.",
    use: "Blues and rock solos over minor chords, and over the dominant 7ths of a blues.",
  },
  {
    slug: "minor-blues", name: "Minor pentatonic blues", alias: "blues scale", host: 5, degrees: [0, 2, 3, 4, 6], blue: { degree: 3, semis: 6 },
    char: "Minor pentatonic with the blue note: a ♯4 squeezed between the 4th and 5th, so 4 – ♯4 – 5 climbs in half steps.",
    mood: "Bluesy, crying, a little dirty.",
    use: "Blues, rock and jazz solos: over all three chords of a blues, bending or sliding through the ♯4 rather than resting on it.",
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

/** One note of a pentatonic, low to high. */
export interface PentatonicTone {
  /** host degree, for colour: the blue ♯4 is a 4th, so lime */
  degree: number;
  semis: number;
  name: string;
  /** "♭3", "♯4" */
  label: string;
  /** player key on the page: "pc<pitch class>", so the blue ♯4 lights apart from the 4th it shares a colour with */
  key: string;
  blue: boolean;
}

/** A pentatonic in one key: the host mode in that key, with the five kept notes picked out (and the blue note, if any). */
export interface PentatonicContext {
  scale: PentatonicScale;
  /** the seven-note mode it is cut from; index notes, labels and colours with its degrees */
  host: KeyContext;
  /** the kept host degrees (not the blue note) */
  degrees: number[];
  tones: PentatonicTone[];
  /** semitones above the root, one per tone */
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
  const tones: PentatonicTone[] = scale.degrees.map((d) => ({ degree: d, semis: host.steps[d], name: host.names[d], label: labels[d], key: `pc${(tonicPc + host.steps[d]) % 12}`, blue: false }));
  if (scale.blue) {
    const { degree, semis } = scale.blue;
    const diff = semis - MAJOR[degree];
    const label = (diff < 0 ? "♭".repeat(-diff) : "♯".repeat(diff)) + (degree + 1);
    tones.push({ degree, semis, name: alterTo(host.names[degree], (tonicPc + semis) % 12), label, key: `pc${(tonicPc + semis) % 12}`, blue: true });
    tones.sort((a, b) => a.semis - b.semis);
  }
  return {
    scale,
    host,
    degrees: scale.degrees,
    tones,
    steps: tones.map((t) => t.semis),
    names: tones.map((t) => t.name),
    formula: tones.map((t) => t.label),
    title: `${host.names[0]} ${name}`,
  };
}

const LETTER_PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** The note on the same letter as `name` that sounds as `pc`: D -> D♯ for pc 3, A♭ -> A for pc 9. */
function alterTo(name: string, pc: number): string {
  const diff = ((pc - LETTER_PC[name[0]] + 18) % 12) - 6;
  return name[0] + (diff < 0 ? "♭".repeat(-diff) : "♯".repeat(diff));
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
    const steps = p.degrees.map((d) => (host.parent[(p.host + d) % 7] - host.parent[p.host] + 12) % 12).concat(p.blue ? [p.blue.semis] : []);
    return steps.map((s) => (root + s) % 12).sort((a, b) => a - b).join(",");
  };
  const mine = pcs(tonicPc, scale);
  return PENTATONICS.filter((p) => p !== scale).flatMap((p) => {
    for (let r = 0; r < 12; r++) if (pcs(r, p) === mine) return [{ scale: p, tonicPc: r }];
    return [];
  });
}
