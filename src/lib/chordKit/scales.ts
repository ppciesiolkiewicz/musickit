import { FAMILIES, MAJOR, makeKeyContext, shortModeName, TONICS, tonicName, type KeyContext } from "./theory";

/** URL slugs for the 21 modes: "dorian", "harmonic-minor", "phrygian-dominant", ... */
export interface ModePage {
  slug: string;
  name: string;
  familyIndex: number;
  modeIndex: number;
}

const slugify = (s: string) =>
  s.toLowerCase().replace(/♮/g, "natural-").replace(/♭/g, "flat-").replace(/♯/g, "sharp-").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export const MODE_PAGES: ModePage[] = FAMILIES.flatMap((fam, familyIndex) =>
  fam.names.map((full, modeIndex) => {
    const name = shortModeName(full);
    return { slug: slugify(name === "Ionian" ? "major-ionian" : name === "Aeolian" ? "natural-minor-aeolian" : name), name, familyIndex, modeIndex };
  }),
);

export const findModePage = (slug: string) => MODE_PAGES.find((m) => m.slug === slug);

/** Rainbow from red (first/lowest degree) to violet (seventh). `n` is 0-based, of `total` steps. */
export function rainbow(n: number, total = 7): string {
  const hue = (n / Math.max(1, total - 1)) * 270;
  return `hsl(${hue.toFixed(0)} 80% 55%)`;
}

export interface ChordNote {
  /** note name, spelled for the key */
  name: string;
  /** 0-based scale degree of the key (0 = tonic) */
  scaleDegree: number;
  /** role above the chord root: R, 3, 5, 7, 9, 11, 13 (with accidentals when altered) */
  role: string;
  /** semitones above the chord root, 0..11 */
  semis: number;
}

export interface ModeChord {
  degree: number;
  roman: string;
  triadName: string;
  seventhName: string;
  /** stacked thirds: root, 3rd, 5th, 7th, then 9th, 11th, 13th */
  notes: ChordNote[];
}

const ROLES = ["R", "3", "5", "7", "9", "11", "13"];
const STACK = [0, 2, 4, 6, 1, 3, 5];

function roleLabel(role: string, semis: number): string {
  const natural: Record<string, number[]> = { "3": [4], "5": [7], "7": [11], "9": [2], "11": [5], "13": [9] };
  if (role === "R") return "R";
  const nat = natural[role][0];
  const diff = ((semis - nat + 18) % 12) - 6;
  return (diff < 0 ? "♭".repeat(-diff) : diff > 0 ? "♯".repeat(diff) : "") + role;
}

export function modeChords(ctx: KeyContext): ModeChord[] {
  return ctx.chords.map((c) => ({
    degree: c.degree,
    roman: c.roman,
    triadName: c.triadName,
    seventhName: c.seventhName,
    notes: STACK.map((off, i) => {
      const sd = (c.degree + off) % 7;
      const semis = (ctx.steps[sd] - ctx.steps[c.degree] + 12) % 12;
      return { name: ctx.names[sd], scaleDegree: sd, role: roleLabel(ROLES[i], semis), semis };
    }),
  }));
}

export interface Relatives {
  parentName: string;
  parentTonic: string;
  /** modes sharing the same seven notes, one per degree of the parent scale */
  siblings: { name: string; tonic: string; tonicPc: number; modeIndex: number; isThis: boolean }[];
  relativeMajor?: { tonic: string; tonicPc: number };
  relativeMinor?: { tonic: string; tonicPc: number };
  /** how this mode differs from the major scale on the same tonic (parallel major) */
  vsMajor: string[];
  /** and from natural minor on the same tonic */
  vsMinor: string[];
}

const ALT_LABEL = (diff: number, deg: number) => (diff < 0 ? "♭".repeat(-diff) : diff > 0 ? "♯".repeat(diff) : "") + (deg + 1);

function differences(steps: number[], reference: number[]): string[] {
  const out: string[] = [];
  steps.forEach((s, i) => {
    if (s !== reference[i]) out.push(ALT_LABEL(s - reference[i], i));
  });
  return out;
}

export function relativesOf(ctx: KeyContext): Relatives {
  const fam = FAMILIES[ctx.familyIndex];
  const parentPc = (ctx.tonic.pc - fam.parent[ctx.modeIndex] + 12) % 12;
  const siblings = fam.names.map((nm, k) => ({
    name: shortModeName(nm),
    tonic: tonicName((parentPc + fam.parent[k]) % 12),
    tonicPc: (parentPc + fam.parent[k]) % 12,
    modeIndex: k,
    isThis: k === ctx.modeIndex,
  }));
  const minorSteps = [0, 2, 3, 5, 7, 8, 10];
  const rel: Partial<Relatives> = {};
  if (ctx.familyIndex === 0) {
    rel.relativeMajor = { tonic: tonicName(parentPc), tonicPc: parentPc };
    rel.relativeMinor = { tonic: tonicName((parentPc + 9) % 12), tonicPc: (parentPc + 9) % 12 };
  }
  return {
    parentName: fam.parentName,
    parentTonic: tonicName(parentPc),
    siblings,
    vsMajor: differences(ctx.steps, MAJOR),
    vsMinor: differences(ctx.steps, minorSteps),
    ...rel,
  };
}

export { makeKeyContext, TONICS };

/** MIDI notes for the first `count` stacked thirds of a chord on degree d, ascending from around C3. */
export function chordMidi(ctx: KeyContext, d: number, count = 4): number[] {
  const rootMidi = 48 + ((ctx.tonic.pc + ctx.steps[d]) % 12);
  const out: number[] = [];
  STACK.slice(0, count).forEach((off) => {
    const sd = (d + off) % 7;
    let m = rootMidi + ((ctx.steps[sd] - ctx.steps[d] + 12) % 12);
    while (out.length && m <= out[out.length - 1]) m += 12;
    out.push(m);
  });
  return out;
}
