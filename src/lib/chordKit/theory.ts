/**
 * Scale, mode and chord-in-key theory used by the chord explorer.
 * Pure functions, no DOM, no audio. Pitch classes are plain 0-11 (C = 0) unless a name says otherwise.
 */

export const MAJOR = [0, 2, 4, 5, 7, 9, 11];
export const HARMONIC_MINOR = [0, 2, 3, 5, 7, 8, 11];
export const MELODIC_MINOR = [0, 2, 3, 5, 7, 9, 11];

export const ORDINALS = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th"];

export interface ModeInfo {
  char: string;
  mood: string;
  use: string;
  vamp: number[];
}

export interface Family {
  id: "major" | "harm" | "mel";
  label: string;
  parent: number[];
  parentName: string;
  names: string[];
  info: ModeInfo[];
}

export const FAMILIES: Family[] = [
  {
    id: "major",
    label: "Major modes",
    parent: MAJOR,
    parentName: "major scale",
    names: ["Ionian (major)", "Dorian", "Phrygian", "Lydian", "Mixolydian", "Aeolian (natural minor)", "Locrian"],
    info: [
      { char: 'Natural 4th and 7th: the "plain" major sound.', mood: "Bright, resolved, stable.", use: "Pop, folk and classical. Imaj7 over everything.", vamp: [0, 3, 4, 5] },
      { char: "Natural 6th (♮6) over a minor 3rd and ♭7.", mood: "Minor but warm and hopeful: soul, funk, jazz-rock.", use: 'Groove vamps over i7 – IV7 ("So What", Santana).', vamp: [0, 3] },
      { char: "♭2, the half step right above the root.", mood: "Dark, tense, Spanish and flamenco flavored.", use: "i – ♭II vamps; flamenco and metal riffs.", vamp: [0, 1] },
      { char: "♯4, the raised 4th.", mood: "Bright, floating, dreamy: film-score wonder.", use: "Imaj7 – II vamp; the ♯11 colour on IVmaj7.", vamp: [0, 1] },
      { char: "♭7 on an otherwise major scale.", mood: "Bluesy-bright, rock and folk swagger.", use: "I – ♭VII – IV vamps; dominant 7 chords.", vamp: [0, 6, 3] },
      { char: "♭6 (plus ♭3 and ♭7): the natural minor sound.", mood: "Sad, serious: standard rock and pop minor.", use: "i – ♭VI – ♭VII; the relative minor of a major key.", vamp: [0, 5, 6] },
      { char: "♭5 and ♭2: an unstable diminished tonic.", mood: "Dissonant; rarely used as a home key.", use: "Over m7♭5 chords (the ii of a minor ii–V–i).", vamp: [0, 1] },
    ],
  },
  {
    id: "harm",
    label: "Harmonic minor modes",
    parent: HARMONIC_MINOR,
    parentName: "harmonic minor",
    names: ["Harmonic minor", "Locrian ♮6", "Ionian ♯5", "Dorian ♯4", "Phrygian dominant", "Lydian ♯2", "Ultralocrian"],
    info: [
      { char: "Raised 7th, leaving an augmented 2nd between ♭6 and 7.", mood: "Classical drama with a Middle-Eastern tinge.", use: "The V7 – i cadence in minor keys.", vamp: [0, 3, 4] },
      { char: "Natural 6th against the ♭5.", mood: "Dark, but less unstable than plain Locrian.", use: "Over the m7♭5 of a minor ii–V–i.", vamp: [0] },
      { char: "♯5 on a major scale.", mood: "Bright with an unsettled lift.", use: "Over maj7♯5 (the III+ of harmonic minor).", vamp: [0] },
      { char: "♯4 over a minor 3rd and natural 6th.", mood: "Gypsy / Romanian minor.", use: "Over minor chords with a ♯11 colour.", vamp: [0] },
      { char: "♭2 with a major 3rd.", mood: "Spanish, flamenco, Middle-Eastern.", use: "Over V7(♭9) resolving to a minor i.", vamp: [0, 1] },
      { char: "♯2 (augmented 2nd) together with ♯4.", mood: "Exotic and shimmering.", use: "Over maj7♯11 with a ♯9 colour.", vamp: [0] },
      { char: "♭♭7 (a diminished 7th) on top of ♭4 and ♭5.", mood: "Maximum tension.", use: "Over dim7 chords.", vamp: [0] },
    ],
  },
  {
    id: "mel",
    label: "Melodic minor modes",
    parent: MELODIC_MINOR,
    parentName: "melodic minor",
    names: ["Melodic minor", "Dorian ♭2", "Lydian augmented", "Lydian dominant", "Mixolydian ♭6", "Locrian ♮2", "Altered"],
    info: [
      { char: "Natural 6th and 7th over a minor 3rd.", mood: "Smooth, jazzy minor.", use: "Minor-major tonic: m(maj7).", vamp: [0, 3] },
      { char: "♭2 together with a natural 6th.", mood: "Dark yet smooth.", use: "Over m7(♭9) and sus♭9 chords.", vamp: [0] },
      { char: "♯4 and ♯5 on a major scale.", mood: "Floating, ethereal.", use: "Over maj7♯5.", vamp: [0] },
      { char: '♯4 with ♭7: the "overtone" scale.', mood: "Bright dominant sound.", use: "Over 7♯11 chords and tritone-sub dominants.", vamp: [0] },
      { char: "♭6 with a major 3rd.", mood: "Major but sombre.", use: "Over 7♭13 chords.", vamp: [0] },
      { char: "Natural 2nd on a Locrian base.", mood: "A smoother half-diminished.", use: "Over m7♭5 chords.", vamp: [0] },
      { char: "♭9, ♯9, ♭5 and ♯5: every tension altered.", mood: "Maximum dominant tension.", use: "Over 7alt chords resolving to I.", vamp: [0] },
    ],
  },
];

/** Strip the bracketed alias from a mode name: "Ionian (major)" -> "Ionian". */
export const shortModeName = (name: string) => name.replace(/ \(.*\)/, "");

/** Rotate a 7-note scale so degree k becomes the root. */
export function rotate(steps: number[], k: number): number[] {
  const base = steps[k];
  return steps.map((_, i) => (steps[(k + i) % 7] - base + 12) % 12);
}

/* ---------------------------------------------------------------- tonics and spelling */

const LETTERS = ["C", "D", "E", "F", "G", "A", "B"];
const LETTER_PC = [0, 2, 4, 5, 7, 9, 11];
const ACCIDENTAL: Record<string, string> = { "-2": "♭♭", "-1": "♭", "0": "", "1": "♯", "2": "♯♯" };

export interface Tonic {
  name: string;
  pc: number;
  letter: number;
}

export const TONICS: Tonic[] = [
  { name: "C", pc: 0, letter: 0 },
  { name: "D♭", pc: 1, letter: 1 },
  { name: "D", pc: 2, letter: 1 },
  { name: "E♭", pc: 3, letter: 2 },
  { name: "E", pc: 4, letter: 2 },
  { name: "F", pc: 5, letter: 3 },
  { name: "F♯", pc: 6, letter: 3 },
  { name: "G", pc: 7, letter: 4 },
  { name: "A♭", pc: 8, letter: 5 },
  { name: "A", pc: 9, letter: 5 },
  { name: "B♭", pc: 10, letter: 6 },
  { name: "B", pc: 11, letter: 6 },
];

/** Name each scale degree with one letter per degree (so G major gives F♯, not G♭). */
export function spell(letterIdx: number, pc: number, steps: number[]): string[] {
  return steps.map((st, d) => {
    const L = (letterIdx + d) % 7;
    const target = (pc + st) % 12;
    const diff = ((target - LETTER_PC[L] + 18) % 12) - 6;
    const acc = ACCIDENTAL[String(diff)];
    return LETTERS[L] + (acc !== undefined ? acc : "?");
  });
}

export const tonicName = (pc: number) => (TONICS.find((t) => t.pc === pc) ?? TONICS[0]).name;

/* ---------------------------------------------------------------- chords built on each degree */

export type TriadQuality = "maj" | "min" | "dim" | "aug" | "other";

const SEVENTH_TABLE: Record<TriadQuality, Record<number, string>> = {
  maj: { 11: "maj7", 10: "7" },
  min: { 10: "m7", 11: "m(maj7)" },
  dim: { 10: "m7♭5", 9: "dim7", 11: "dim(maj7)" },
  aug: { 11: "maj7♯5", 10: "7♯5" },
  other: {},
};

const EXTENSION_NAMES: Record<string, Record<string, string>> = {
  maj7: { "9": "maj9", "♭9": "maj7(♭9)", "♯9": "maj7(♯9)", "11": "maj7(11)", "♯11": "maj7♯11", "13": "maj13", "♭13": "maj7(♭13)" },
  "7": { "9": "9", "♭9": "7♭9", "♯9": "7♯9", "11": "11", "♯11": "7♯11", "13": "13", "♭13": "7♭13" },
  m7: { "9": "m9", "♭9": "m7(♭9)", "♯9": "m7(♯9)", "11": "m11", "♯11": "m7(♯11)", "13": "m13", "♭13": "m7(♭13)" },
};

function extensionName(seventh: string, ext: string): string {
  const table = EXTENSION_NAMES[seventh];
  return (table && table[ext]) || `${seventh}(${ext})`;
}

export const TRIAD_SUFFIX: Record<TriadQuality, string> = { maj: "", min: "m", dim: "dim", aug: "aug", other: "?" };
const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII"];

export interface ExtensionSlot {
  label: string;
  note: string;
  kids: { text: string; dashed?: boolean }[];
}

export interface DegreeChord {
  degree: number;
  root: string;
  tri: TriadQuality;
  seventh: string;
  roman: string;
  formula: string[];
  degrees: number[];
  slots: (ExtensionSlot | null)[];
  triadName: string;
  seventhName: string;
}

/** Stack thirds on scale degree d (0-based) and describe the resulting chord. */
export function analyseDegree(steps: number[], names: string[], d: number): DegreeChord {
  const g = (i: number) => (steps[(d + i) % 7] - steps[d] + 12) % 12;
  const second = g(1), third = g(2), fourth = g(3), fifth = g(4), sixth = g(5), sev = g(6);
  const tri: TriadQuality =
    third === 4 && fifth === 7 ? "maj" : third === 3 && fifth === 7 ? "min" : third === 3 && fifth === 6 ? "dim" : third === 4 && fifth === 8 ? "aug" : "other";
  const seventh = SEVENTH_TABLE[tri][sev] || TRIAD_SUFFIX[tri] + "7?";
  const root = names[d];

  const diffMajor = steps[d] - MAJOR[d];
  let numeral = ROMAN[d];
  if (tri === "min" || tri === "dim") numeral = numeral.toLowerCase();
  const prefix = diffMajor < 0 ? "♭".repeat(-diffMajor) : diffMajor > 0 ? "♯".repeat(diffMajor) : "";
  const roman = prefix + numeral + (tri === "dim" ? "°" : tri === "aug" ? "+" : "");
  const formula = ["1", third === 4 ? "3" : "♭3", fifth === 7 ? "5" : fifth === 6 ? "♭5" : "♯5", sev === 11 ? "7" : sev === 10 ? "♭7" : "♭♭7"];
  const degrees = [0, 2, 4, 6].map((o) => ((d + o) % 7) + 1);

  const slots: (ExtensionSlot | null)[] = [null, null, null, null];
  const sn = names[(d + 1) % 7];
  if (second === 1) slots[0] = { label: "♭2", note: sn, kids: [{ text: root + "sus♭2", dashed: true }, { text: root + extensionName(seventh, "♭9"), dashed: true }] };
  else if (second === 2) slots[0] = { label: "M2", note: sn, kids: [{ text: root + "sus2" }, { text: root + extensionName(seventh, "9") }] };
  else if (second === 3) slots[0] = { label: "♯2", note: sn, kids: [{ text: root + extensionName(seventh, "♯9"), dashed: true }] };

  const fn = names[(d + 3) % 7];
  if (fourth === 5) slots[1] = { label: "P4", note: fn, kids: [{ text: root + "sus4" }, { text: root + extensionName(seventh, "11"), dashed: third === 4 }] };
  else if (fourth === 6) slots[1] = { label: "♯4", note: fn, kids: [{ text: root + "sus♯4", dashed: true }, { text: root + extensionName(seventh, "♯11") }] };

  const xn = names[(d + 5) % 7];
  if (sixth === 9) {
    const kids: { text: string; dashed?: boolean }[] = [];
    if (tri === "maj") kids.push({ text: root + "6" });
    else if (tri === "min") kids.push({ text: root + "m6" });
    kids.push({ text: root + extensionName(seventh, "13") });
    slots[2] = { label: "M6", note: xn, kids };
  } else if (sixth === 8) slots[2] = { label: "♭6", note: xn, kids: [{ text: root + extensionName(seventh, "♭13"), dashed: true }] };

  const vn = names[(d + 6) % 7];
  slots[3] = { label: sev === 11 ? "M7" : sev === 10 ? "♭7" : "♭♭7", note: vn, kids: [{ text: root + seventh }] };

  return { degree: d, root, tri, seventh, roman, formula, degrees, slots, triadName: root + TRIAD_SUFFIX[tri], seventhName: root + seventh };
}

/* ---------------------------------------------------------------- a key + mode context */

export interface KeyContext {
  tonic: Tonic;
  familyIndex: number;
  modeIndex: number;
  steps: number[];
  names: string[];
  chords: DegreeChord[];
  modeName: string;
  parentTonic: string;
}

export function makeKeyContext(tonicPc: number, familyIndex: number, modeIndex: number): KeyContext {
  const tonic = TONICS.find((t) => t.pc === tonicPc) ?? TONICS[0];
  const family = FAMILIES[familyIndex];
  const steps = rotate(family.parent, modeIndex);
  const names = spell(tonic.letter, tonic.pc, steps);
  const chords = [0, 1, 2, 3, 4, 5, 6].map((d) => analyseDegree(steps, names, d));
  const parentPc = (tonic.pc - family.parent[modeIndex] + 12) % 12;
  return { tonic, familyIndex, modeIndex, steps, names, chords, modeName: shortModeName(family.names[modeIndex]), parentTonic: tonicName(parentPc) };
}

/** The mode a chord on degree d belongs to when you play from its root. */
export function modeOfDegree(ctx: KeyContext, d: number): string {
  return shortModeName(FAMILIES[ctx.familyIndex].names[(ctx.modeIndex + d) % 7]);
}

/** Scale degree of a pitch class in a key: "3", or "♭3"/"♯4" when it is outside the scale. */
export function degreeLabel(pc: number, ctx: KeyContext): string {
  const rel = (pc - ctx.tonic.pc + 12) % 12;
  const S = ctx.steps;
  let i = S.indexOf(rel);
  if (i >= 0) return String(i + 1);
  i = S.indexOf((rel + 1) % 12);
  if (i >= 0) return "♭" + (i + 1);
  i = S.indexOf((rel + 11) % 12);
  if (i >= 0) return "♯" + (i + 1);
  return "?";
}

/** Every one of the 21 modes, as semitone sets measured from their own root. */
export interface ModeEntry {
  name: string;
  rel: Set<number>;
  family: Family;
  k: number;
}

export const MODE_LIST: ModeEntry[] = FAMILIES.flatMap((family) =>
  family.names.map((nm, k) => ({ name: shortModeName(nm), rel: new Set(rotate(family.parent, k)), family, k })),
);
