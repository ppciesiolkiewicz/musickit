import { FAMILIES, MODE_LIST, makeKeyContext, type KeyContext } from "./theory";

/** Groups of modes you can compare: by parent scale, or by the chord sitting on the tonic. */
export interface ModeGroup {
  id: string;
  label: string;
  /** one line explaining why these modes belong together */
  why: string;
  test: (rel: Set<number>, familyIndex: number) => boolean;
  /** a short lesson: where these modes come from, how they sound, what to listen for, one exercise */
  teach: Teach;
}

export interface Teach { from: string; sound: string; listen: string; practise: string }

const FAMILY_TEACH: Record<string, Teach> = {
  major: {
    from: "All seven are the major scale started on a different note: C major from D is D Dorian, from G is G Mixolydian. Same notes, a different home.",
    sound: "From bright to dark: Lydian (♯4) is the brightest, then Ionian, Mixolydian, Dorian, Aeolian, Phrygian, and Locrian (♭2 and ♭5) the darkest.",
    listen: "Each mode differs from its neighbour by one note. Listen for that note: the ♯4 of Lydian, the ♭7 of Mixolydian, the natural 6 of Dorian, the ♭2 of Phrygian.",
    practise: "Over a drone on one root, play Ionian, then Mixolydian (lower the 7th), then Dorian (lower the 3rd too). Hear the mood darken one note at a time.",
  },
  harm: {
    from: "Harmonic minor is natural minor with the 7th raised a semitone, so the V chord becomes major and pulls hard back to i. Its rotations give exotic modes like Phrygian dominant.",
    sound: "The gap between ♭6 and 7 (three semitones) gives the Middle-Eastern, flamenco and neo-classical sound.",
    listen: "Listen for the leading tone (the raised 7th) leaning into the root, and the wide step from ♭6 up to 7.",
    practise: "In A minor, play E7 then Am and solo with A harmonic minor (G♯ instead of G) over the E7 only. Then try E Phrygian dominant, the same notes from E.",
  },
  mel: {
    from: "Melodic minor is the major scale with a ♭3, or natural minor with a raised 6th and 7th. Jazz uses it in both directions, and its modes include Lydian dominant and the altered scale.",
    sound: "A minor tonic that still has the bright major 6th and 7th: smooth, modern and a little unresolved.",
    listen: "Listen for a minor 3rd sitting next to a major 7th; that pairing is what sets melodic minor apart from every major-family mode.",
    practise: "Play a Cm(maj7) chord, then run C melodic minor over it. Next, play F7♯11 and run the same notes from F (Lydian dominant).",
  },
  other: {
    from: "Seven-note scales that are not modes of major, harmonic minor or melodic minor. Most come from folk and classical traditions: Arabic and Byzantine music, Persian music, Hungarian and Romani music, and opera.",
    sound: "Several half steps and at least one augmented 2nd (three semitones) give them an exotic, strongly coloured sound that is hard to mistake for a plain major or minor key.",
    listen: "Listen for the ♭2 leaning into the root and the wide three-semitone gaps: in double harmonic they sit between ♭2 and 3 and between ♭6 and 7.",
    practise: "Over a drone on C, play C double harmonic major, then flatten the 5th (Persian). Then play C Hungarian minor and compare its ♯4 with the ♭2 of the other two.",
  },
};

export const MODE_GROUPS: ModeGroup[] = [
  ...FAMILIES.map((f, i): ModeGroup => ({
    id: f.id,
    label: f.label,
    why: f.scales ? "Seven-note scales of their own, outside the three mode families." : `The seven rotations of the ${f.parentName}.`,
    test: (_r, fi) => fi === i,
    teach: FAMILY_TEACH[f.id],
  })),
  { id: "tonic-major", label: "Major tonic chord", why: "Every mode whose 1 – 3 – 5 is a major triad.", test: (r) => r.has(4) && r.has(7),
    teach: {
      from: "Any mode with a major 3rd and a perfect 5th: Ionian, Lydian and Mixolydian from the major scale, plus modes of harmonic and melodic minor such as Phrygian dominant and Lydian dominant.",
      sound: "All of them sound major and stable on the tonic chord; the 2nd, 4th, 6th and 7th decide whether that major is sweet, dreamy, bluesy or exotic.",
      listen: "Keep the major chord ringing and listen to the notes around it: the ♯4 (Lydian), ♭7 (Mixolydian) or ♭2 (Phrygian dominant) is the colour.",
      practise: "Strum one major chord for a minute and improvise with each mode in turn. Name the one note that changes the mood each time.",
    } },
  { id: "tonic-minor", label: "Minor tonic chord", why: "Every mode whose 1 – ♭3 – 5 is a minor triad.", test: (r) => r.has(3) && r.has(7),
    teach: {
      from: "Any mode with a minor 3rd and a perfect 5th: Dorian, Aeolian and Phrygian from the major scale, harmonic minor, melodic minor and a few rarer modes.",
      sound: "All sound minor. Dorian (natural 6) is the hopeful one, Aeolian the plain sad one, Phrygian (♭2) the dark Spanish one.",
      listen: "The 6th and the 2nd tell them apart. A natural 6 over a minor chord sounds like Oye Como Va (Dorian); a ♭2 sounds like flamenco (Phrygian).",
      practise: "Loop an Am chord and alternate F (Aeolian) with F♯ (Dorian) in your lines. Then add B♭ (Phrygian) and hear the darkest version.",
    } },
  { id: "tonic-dim", label: "Diminished tonic chord", why: "Every mode whose 1 – ♭3 – ♭5 is a diminished triad.", test: (r) => r.has(3) && r.has(6) && !r.has(7),
    teach: {
      from: "A diminished 1–♭3–♭5 tonic: Locrian from the major scale, Locrian ♮6 from harmonic minor and Locrian ♮2 (half-diminished) from melodic minor.",
      sound: "Unstable and tense: the ♭5 makes the tonic itself want to move, which is why these modes mostly live over m7♭5 chords rather than as a home key.",
      listen: "Listen for the tritone between the root and ♭5; it never settles. The ♮2 of Locrian ♮2 sounds noticeably smoother than Locrian's ♭2.",
      practise: "Play Bm7♭5 → E7 → Am (a minor ii–V–i). Over Bm7♭5 use B Locrian, then try B Locrian ♮2 and compare the 2nd.",
    } },
  { id: "tonic-aug", label: "Augmented tonic chord", why: "Every mode whose 1 – 3 – ♯5 is an augmented triad.", test: (r) => r.has(4) && r.has(8) && !r.has(7),
    teach: {
      from: "An augmented 1–3–♯5 never occurs in the major scale. It appears only in harmonic minor (its 3rd mode, Ionian ♯5) and melodic minor (its 3rd mode, Lydian augmented), which is why there are so few.",
      sound: "The ♯5 makes the tonic restless, dreamlike and unresolved, the sound of a door left open.",
      listen: "Listen for the raised 5th rubbing against the natural 5th your ear expects, and its pull up to the 6th.",
      practise: "Hold a drone on the root and play 1–3–♯5–3 slowly, then resolve ♯5 → 6. Try it over Caug moving to Am/C.",
    } },
];

/** Name of the interval above the tonic, for a column header. */
export const SEMI_LABEL: Record<number, string> = {
  0: "R", 1: "♭2", 2: "2", 3: "♭3", 4: "3", 5: "4", 6: "♯4 / ♭5", 7: "5", 8: "♯5 / ♭6", 9: "6", 10: "♭7", 11: "7",
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
