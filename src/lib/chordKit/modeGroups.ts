import { FAMILIES, MODE_LIST, makeKeyContext, type KeyContext } from "./theory";

/** Groups of modes you can compare: by parent scale, or by the chord sitting on the tonic. */
export interface ModeGroup {
  id: string;
  label: string;
  /** one line explaining why these modes belong together */
  why: string;
  test: (rel: Set<number>, familyIndex: number) => boolean;
}

export const MODE_GROUPS: ModeGroup[] = [
  ...FAMILIES.map((f, i): ModeGroup => ({
    id: f.id,
    label: f.label,
    why: `The seven rotations of the ${f.parentName}.`,
    test: (_r, fi) => fi === i,
  })),
  { id: "tonic-major", label: "Major tonic chord", why: "Every mode whose 1 – 3 – 5 is a major triad.", test: (r) => r.has(4) && r.has(7) },
  { id: "tonic-minor", label: "Minor tonic chord", why: "Every mode whose 1 – ♭3 – 5 is a minor triad.", test: (r) => r.has(3) && r.has(7) },
  { id: "tonic-dim", label: "Diminished tonic chord", why: "Every mode whose 1 – ♭3 – ♭5 is a diminished triad.", test: (r) => r.has(3) && r.has(6) && !r.has(7) },
  { id: "tonic-aug", label: "Augmented tonic chord", why: "Every mode whose 1 – 3 – ♯5 is an augmented triad.", test: (r) => r.has(4) && r.has(8) && !r.has(7) },
];

/** Name of the interval above the tonic, for a column header. */
export const SEMI_LABEL: Record<number, string> = {
  0: "1", 1: "♭2", 2: "2", 3: "♭3", 4: "3", 5: "4", 6: "♯4 / ♭5", 7: "5", 8: "♯5 / ♭6", 9: "6", 10: "♭7", 11: "7",
};

export interface CompareMode {
  name: string;
  familyIndex: number;
  modeIndex: number;
  ctx: KeyContext;
  /** semitones above the tonic, ascending */
  semis: number[];
}

export interface CompareColumn {
  semi: number;
  label: string;
  /** how many of the modes contain this note */
  count: number;
  /** in every mode of the group */
  core: boolean;
  /** names of the modes that contain it */
  who: string[];
}

export interface Comparison {
  group: ModeGroup;
  modes: CompareMode[];
  columns: CompareColumn[];
  /** semitones shared by every mode */
  core: number[];
  /** for each mode name, the notes it has beyond the core */
  added: Record<string, number[]>;
}

/** Compare the modes of a group in a key: which notes they all share, and what each one adds. Brightest mode first. */
export function compareModes(groupId: string, tonicPc: number): Comparison {
  const group = MODE_GROUPS.find((g) => g.id === groupId) ?? MODE_GROUPS[0];
  const modes: CompareMode[] = [];
  MODE_LIST.forEach((m) => {
    const fi = FAMILIES.indexOf(m.family);
    if (!group.test(m.rel, fi)) return;
    const ctx = makeKeyContext(tonicPc, fi, m.k);
    modes.push({ name: m.name, familyIndex: fi, modeIndex: m.k, ctx, semis: [...m.rel].sort((a, b) => a - b) });
  });
  // brightest (most raised notes) first, so overlaps sit next to each other
  const bright = (m: CompareMode) => m.semis.reduce((a, b) => a + b, 0);
  modes.sort((a, b) => bright(b) - bright(a) || a.familyIndex - b.familyIndex || a.modeIndex - b.modeIndex);

  const all = [...new Set(modes.flatMap((m) => m.semis))].sort((a, b) => a - b);
  const columns = all.map((semi): CompareColumn => {
    const who = modes.filter((m) => m.semis.includes(semi)).map((m) => m.name);
    return { semi, label: SEMI_LABEL[semi], count: who.length, core: who.length === modes.length, who };
  });
  const core = columns.filter((c) => c.core).map((c) => c.semi);
  const added: Record<string, number[]> = {};
  modes.forEach((m) => (added[m.name] = m.semis.filter((s) => !core.includes(s))));
  return { group, modes, columns, core, added };
}

/** The note a mode has at an interval above its tonic, with the scale index (for colour), or null. */
export function noteAt(mode: CompareMode, semi: number): { name: string; index: number } | null {
  const index = mode.semis.indexOf(semi);
  return index < 0 ? null : { name: mode.ctx.names[index], index };
}
