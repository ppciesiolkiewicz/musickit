/**
 * Progressions in a mode: the written list (PROG_LIST) and what it becomes in a key (chords, roman numerals, absolute roots).
 * Pure data and maths, no guitar and no sound.
 */
import { analyseDegree, FAMILIES, rotate, shortModeName, spell, TONICS, TRIAD_SUFFIX } from "./theory";

/** One chord in a progression definition. Either a scale degree `d` or a chromatic step `st` from the tonic. */
export type ProgItem =
  | { d: number; q?: "sev" | "tri"; suf?: undefined; tri?: undefined; v?: string; x?: number; roman?: string }
  | { d: number; suf: string; tri?: 1; v?: string; x?: number; roman?: string; q?: undefined }
  | { st: number; root: string; suf: string; roman: string; tri?: 1; v?: string; x?: number };

export interface ProgSection {
  name: string;
  note?: string;
  /** Side trips use loop:false: you leave the main form for them and come back. */
  loop?: boolean;
  items: ProgItem[];
}

export interface Progression {
  fam: number;
  k: number;
  tonic?: number;
  group?: string;
  sub?: string;
  pcs?: number[];
  title: string;
  blurb: string;
  degs?: number[];
  q?: "sev" | "tri" | ("sev" | "tri")[];
  items?: ProgItem[];
  sections?: ProgSection[];
}

export const PROG_LIST: Progression[] = [
 {fam:0,k:1,title:'i7 – IV7',degs:[0,3],q:'sev',blurb:'Two chords and one scale. The major IV (A7) carries the C♯, the Dorian 6th, which is what separates this from natural minor. The Santana "Oye Como Va" groove lives here.'},
 {fam:0,k:1,title:'i – ii – ♭III – IV',degs:[0,1,2,3],q:'sev',blurb:'A stepwise climb through the first four chords of Dorian. Every root is a scale step from the last, so the neck moves are tiny.'},
 {fam:0,k:1,title:'i7 – IV13',items:[{d:0,suf:'m7'},{d:3,suf:'13'}],blurb:'The same two-chord vamp with the IV stretched to a 13th. A13 adds F♯ (the 13th) and G (the ♭7), the notes that make a dominant chord sound big, and both are in E Dorian.'},
 {fam:0,k:2,title:'i – ♭II',degs:[0,1],q:'tri',blurb:'The Phrygian signature: a half-step up to F (the ♭2) and back. Flamenco, metal and film tension all use this move.'},
 {fam:0,k:2,title:'i – ♭II – ♭III – ♭II',degs:[0,1,2,1],q:'tri',blurb:'Em, F, G, F: the ♭2 chord sits between home and the ♭III, so the loop keeps leaning on that dark half step.'},
 {fam:0,k:3,title:'I – II',degs:[0,1],q:'sev',blurb:'Lydian in two chords. The II chord (F♯7) contains A♯, the raised 4th, which gives the floating, bright sound.'},
 {fam:0,k:3,title:'I – II – V – I',degs:[0,1,4,0],q:'sev',blurb:'Home, the bright II, then the major V (Bmaj7) and back. No minor chords at all, which is why Lydian feels so open.'},
 {fam:0,k:3,title:'Imaj7♯11 – II7 – Imaj7♯11',items:[{d:0,suf:'maj7♯11'},{d:1,suf:'7'},{d:0,suf:'maj7♯11'}],blurb:'Put the Lydian note in the tonic chord itself. The ♯11 (A♯) rubs against the 5th, then F♯7 holds the same note as its 3rd, so the colour never leaves.'},
 {fam:2,k:3,title:'I7♯11 – II7',items:[{d:0,suf:'7♯11'},{d:1,suf:'7'}],blurb:'Lydian dominant (the "overtone" scale): a dominant 7th with the ♯11. E7♯11 holds D and A♯ together, a jazz-fusion sound with the tritone built into the home chord.'},
 {fam:0,k:4,title:'I – ♭VII – IV',degs:[0,6,3],q:'tri',blurb:'E, D, A: the rock and folk staple. The D is the ♭7 of Mixolydian, the note that is not in plain major.'},
 {fam:0,k:4,title:'I – v – ♭VII – IV',degs:[0,4,6,3],q:'tri',blurb:'Mixolydian has a minor v (Bm), so the loop is E, Bm, D, A. A minor v is a good sign you are in Mixolydian and not major.'},
 {fam:0,k:4,title:'I9 – IV6/9',items:[{d:0,suf:'9'},{d:3,suf:'6/9'}],blurb:'Funk and soul colours in one scale. E9 puts the ♭7 (D) on top of a major chord, and A6/9 has a 6th (F♯) and a 9th (B) but no 7th, so the IV stays open and stable.'},
 {fam:0,k:5,title:'i – ♭VI – ♭VII',degs:[0,5,6],q:'tri',blurb:'Em, C, D: the natural-minor anthem. The roots walk up from the ♭6 to the ♭7 and fall back to the tonic.'},
 {fam:0,k:5,title:'i – ♭VI – ♭III – ♭VII',degs:[0,5,2,6],q:'tri',blurb:'Em, C, G, D: a four-chord Aeolian loop built only from the scale\'s major chords plus the tonic.'},
 {fam:0,k:5,group:'E minor with an altered V',sub:'Aeolian plus a borrowed dominant',title:'ii°7 – V7♯9 – i7',items:[{d:1,suf:'m7♭5'},{d:4,suf:'7♯9',roman:'V7♯9'},{d:0,suf:'m7'}],blurb:'The jazz minor ii–V–i with an altered dominant. B7♯9 has D♯ (the 3rd) and D (the ♯9) at once, the "Hendrix chord" sound. The D♯ pulls up a half step to the E, while the D stays as the ♭7 of Em7.'},
 {fam:0,k:5,group:'Minor line cliché',sub:'a minor chord with one note walking down',pcs:[0,2,3,5,7,8,9,10,11],title:'i – i(maj7) – i7 – i6',items:[{d:0,suf:'m',tri:1},{d:0,suf:'m(maj7)'},{d:0,suf:'m7'},{d:0,suf:'m6'}],blurb:'One chord, one moving note. The top voice walks E → D♯ → D → C♯ while the root stays. Em, Em(maj7), Em7, Em6: the noir and spy-film descent.'},
 {fam:1,k:0,title:'i – iv – V7',degs:[0,3,4],q:['tri','tri','sev'],blurb:'Harmonic minor gives the major V: B7 contains D♯, the leading tone that pulls up to the E in the tonic.'},
 {fam:1,k:0,title:'ii°7 – V7 – i',degs:[1,4,0],q:['sev','sev','tri'],blurb:'The minor ii–V–i. F♯m7♭5 and B7 share notes and move by half steps into Em.'},
 {fam:1,k:0,title:'i(maj7) – iv7 – V7',degs:[0,3,4],q:'sev',blurb:'Make the tonic itself carry the raised 7th. Em(maj7) has D♯ in the chord, so even before the V arrives the leading tone is already sounding.'},
 {fam:1,k:0,title:'i – ♭III+ – iv',degs:[0,2,3],q:'tri',blurb:'A chord only harmonic minor has: the augmented ♭III (G aug, notes G B D♯). The D♯ again, now as the raised 5th of the G chord, rising a half step to the E in Am.'},
 {fam:1,k:0,title:'i – iv – V7♯5',items:[{d:0,suf:'m',tri:1},{d:3,suf:'m',tri:1},{d:4,suf:'7♯5'}],blurb:'B7♯5 raises the 5th to G, the ♭6 of E harmonic minor, so it is still inside the scale. B D♯ G is an augmented triad, which gives the V a tense, whole-tone edge.'},
 {fam:1,k:0,title:'i – iv – V7♭9',items:[{d:0,suf:'m',tri:1},{d:3,suf:'m',tri:1},{d:4,suf:'7♭9'}],blurb:'B7♭9 adds the ♭9 (C), the ♭6 of the key, so the V has a diminished 7th chord inside it (D♯ F♯ A C). The strongest pull back to the tonic in minor.'},
 {fam:1,k:0,title:'i – vii°7 – i',items:[{d:0,suf:'m',tri:1},{d:6,suf:'dim7'},{d:0,suf:'m',tri:1}],blurb:'The diminished 7th on the raised 7th degree (D♯ F♯ A C). It is symmetrical, so it can slide up or down by three frets and still be the same chord.'},
 {fam:1,k:4,title:'I – ♭II – I',degs:[0,1,0],q:'tri',blurb:'Phrygian dominant: a major tonic with the ♭2 above it. E major to F and back is the classic Spanish and Middle-Eastern sound.'},
 {fam:1,k:4,title:'I – ♭II – iv – I',degs:[0,1,3,0],q:'tri',blurb:'E, F, Am, E: the major tonic and ♭II frame a minor iv, so the loop moves between major and minor colours.'},
 {fam:1,k:4,title:'I7♭9 – ♭IImaj7 – I7♭9',items:[{d:0,suf:'7♭9'},{d:1,suf:'maj7'},{d:0,suf:'7♭9'}],blurb:'Here the ♭9 of the tonic is the ♭II chord\'s root: F is both the ♭9 of E7♭9 and the root of Fmaj7, so the two chords share notes and the whole thing feels like one colour.'},
 {fam:0,k:4,group:'E blues',sub:'major and minor thirds mixed',pcs:[0,3,4,5,6,7,10],title:'I7♯9 – ♭III – IV',items:[{d:0,suf:'7♯9'},{st:3,root:'G',suf:'',tri:1,roman:'♭III'},{st:5,root:'A',suf:'',tri:1,roman:'IV'}],blurb:'The "Purple Haze" move. E7♯9 mixes a major third (G♯) and a minor third (G) in one chord, then the ♭III and IV major chords walk up.'},
 {fam:0,k:0,tonic:7,group:'Your tune in G',sub:'G Ionian with a Lydian turnaround',title:'Gmaj7 – Am7 – Bm7, turnaround, side trips',
  blurb:'The walk-up on the 6th string: drop 3 voicings at frets 3, 5 and 7, a two-chord turnaround, and two ways to leave and return. Dmaj7 borrows the C♯ from G Lydian (the ♯4), then Cmaj7 brings the natural C back, which is why the turnaround feels like it brightens and then relaxes.',
  sections:[
   {name:'Main tune',note:'Three drop 3 chords climbing the 6th string, with the Bm7 held for two bars.',items:[{d:0,suf:'maj7',v:'drop 3'},{d:1,suf:'m7',v:'drop 3'},{d:2,suf:'m7',v:'drop 3',x:2}]},
   {name:'Turnaround',note:'Dmaj7 (Lydian V) then Cmaj7 (IV), then back to the top.',items:[{d:4,suf:'maj7',v:'drop 3',roman:'Vmaj7'},{d:3,suf:'maj7',v:'drop 3'}]},
   {name:'Side trip: passing diminished',loop:false,note:'A diminished 7th a half step below the next chord slides into it: G♯dim7 into Am7, A♯dim7 into Bm7, C♯dim7 into Dmaj7. Play it and keep going until you want to come back.',items:[{d:0,suf:'maj7',v:'drop 3'},{st:1,root:'G♯',suf:'dim7',roman:'♯i°7'},{d:1,suf:'m7',v:'drop 3'},{st:3,root:'A♯',suf:'dim7',roman:'♯ii°7'},{d:2,suf:'m7',v:'drop 3'}]},
   {name:'Side trip: C6 and Cmaj7',loop:false,note:'Stay on the IV and rock between the 6th and the major 7th: only one note moves (A ↔ B), so it is a gentle shimmer.',items:[{d:3,suf:'6',roman:'IV6'},{d:3,suf:'maj7',v:'drop 3'},{d:3,suf:'6',roman:'IV6'},{d:3,suf:'maj7',v:'drop 3'}]},
  ]},
 {fam:0,k:1,group:'E Dorian groove',sub:'sections with a turnaround',title:'Em7 – A13, Gmaj7 – F♯m7, turnaround',
  blurb:'A longer Dorian form. The A section is the classic i7 – IV13 vamp, the B section climbs down through the ♭III and ii, and the turnaround leans on the minor v (Bm7) before the A13 pulls home.',
  sections:[
   {name:'A section',note:'Two bars of each, the Dorian vamp.',items:[{d:0,suf:'m7',x:2},{d:3,suf:'13',x:2}]},
   {name:'B section',note:'Down the scale: ♭III, ii, back to the tonic.',items:[{d:2,suf:'maj7'},{d:1,suf:'m7'},{d:0,suf:'m7'}]},
   {name:'Turnaround',note:'v then IV13 sets up the repeat.',items:[{d:4,suf:'m7'},{d:3,suf:'13'}]},
  ]},
 {fam:1,k:0,group:'E harmonic minor form',sub:'a long minor-key loop with detours',title:'Em – C – G – D, Am – Em – B7♭9, side trips',
  blurb:'Four sections: a natural-minor loop, a harmonic-minor cadence, then two optional detours through the augmented and diminished chords the raised 7th makes available.',
  sections:[
   {name:'Verse',note:'The Aeolian loop.',items:[{d:0,suf:'m',tri:1},{st:8,root:'C',suf:'',tri:1,roman:'♭VI'},{st:3,root:'G',suf:'',tri:1,roman:'♭III'},{st:10,root:'D',suf:'',tri:1,roman:'♭VII'}]},
   {name:'Cadence',note:'The harmonic-minor part: the V gets a ♭9 and pulls back to the top.',items:[{d:3,suf:'m',tri:1},{d:0,suf:'m',tri:1},{d:4,suf:'7♭9'}]},
   {name:'Side trip: augmented III',loop:false,note:'Em, then the augmented ♭III (G aug) rising to Am.',items:[{d:0,suf:'m',tri:1},{d:2,suf:'aug',tri:1,roman:'♭III+'},{d:3,suf:'m',tri:1}]},
   {name:'Side trip: diminished 7th',loop:false,note:'D♯dim7 between Em chords: all four notes are a minor third apart, so slide it up or down three frets.',items:[{d:0,suf:'m',tri:1},{d:6,suf:'dim7'},{d:0,suf:'m',tri:1}]},
  ]},
];

/* ---------------------------------------------------------------- resolving a progression */

export interface ProgChord {
  key: string;
  roman: string;
  name: string;
  /** Absolute pitch class, C = 0. */
  rootPc: number;
  suf: string;
  /** true = use the 3-note triad shapes */
  tri: boolean;
  v?: string;
  /** how many bars/repeats */
  x: number;
}

export interface ResolvedSection {
  name: string;
  note?: string;
  loop: boolean;
  chords: ProgChord[];
}

export interface ResolvedProgression {
  prog: Progression;
  steps: number[];
  names: string[];
  tonicPc: number;
  /** pitch classes of the scale for the neck dots, counted from E like Instance.pcs */
  scalePcs: number[];
  seq: ProgChord[];
  uniq: ProgChord[];
  sections: ResolvedSection[];
  loopKeys: Set<string>;
  hasSections: boolean;
  /** heading, e.g. "E Dorian" */
  modeName: string;
  sub: string;
}

const DEFAULT_TONIC_PC = 4; // E

export function resolveProgression(P: Progression): ResolvedProgression {
  const fam = FAMILIES[P.fam];
  const tonic = TONICS.find((t) => t.pc === (P.tonic ?? DEFAULT_TONIC_PC)) ?? TONICS[4];
  const steps = rotate(fam.parent, P.k);
  const names = spell(tonic.letter, tonic.pc, steps);
  const scalePcs = P.pcs ?? steps.map((s) => (tonic.pc - 4 + 12 + s) % 12);

  const raw: ProgSection[] = P.sections ?? [
    {
      name: "",
      loop: true,
      items: P.items ?? (P.degs ?? []).map((d, i): ProgItem => ({ d, q: Array.isArray(P.q) ? P.q[i] : P.q })),
    },
  ];

  const make = (it: ProgItem): ProgChord => {
    if ("st" in it) {
      return { key: it.root + it.suf + (it.v ?? ""), roman: it.roman, name: it.root + it.suf, rootPc: (tonic.pc + it.st) % 12, suf: it.suf, tri: !!it.tri, v: it.v, x: it.x ?? 1 };
    }
    const a = analyseDegree(steps, names, it.d);
    const rootPc = (tonic.pc + steps[it.d]) % 12;
    if (it.suf !== undefined) {
      return { key: names[it.d] + it.suf + (it.v ?? ""), roman: it.roman ?? a.roman, name: names[it.d] + it.suf, rootPc, suf: it.suf, tri: !!it.tri, v: it.v, x: it.x ?? 1 };
    }
    const sev = it.q === "sev";
    const name = sev ? a.seventhName : a.triadName;
    return { key: name + (it.v ?? ""), roman: a.roman, name, rootPc, suf: sev ? a.seventh : TRIAD_SUFFIX[a.tri], tri: !sev, v: it.v, x: it.x ?? 1 };
  };

  const sections: ResolvedSection[] = raw.map((sc) => ({ name: sc.name, note: sc.note, loop: sc.loop !== false, chords: sc.items.map(make) }));
  const seq = sections.flatMap((s) => s.chords);
  const uniq: ProgChord[] = [];
  seq.forEach((c) => {
    if (!uniq.some((u) => u.key === c.key)) uniq.push(c);
  });
  const loopKeys = new Set(sections.filter((s) => s.loop).flatMap((s) => s.chords.map((c) => c.key)));
  return {
    prog: P,
    steps,
    names,
    tonicPc: tonic.pc,
    scalePcs,
    seq,
    uniq,
    sections,
    loopKeys,
    hasSections: !!P.sections,
    modeName: P.group ?? `${names[0]} ${shortModeName(fam.names[P.k])}`,
    sub: P.sub ?? names.join(" "),
  };
}

/** Pairs [from, to] (indices into uniq) the root travels between: inside each section, plus the loop back round. */
export function progressionSteps(D: ResolvedProgression): [number, number][] {
  const idx = (c: ProgChord) => D.uniq.findIndex((u) => u.key === c.key);
  const out: [number, number][] = [];
  const add = (a: number, b: number) => {
    if (a !== b && !out.some((s) => s[0] === a && s[1] === b)) out.push([a, b]);
  };
  if (!D.hasSections) {
    const q = D.seq.map(idx);
    q.forEach((a, i) => add(a, q[(i + 1) % q.length]));
    return out;
  }
  D.sections.forEach((sc) => {
    for (let i = 0; i < sc.chords.length - 1; i++) add(idx(sc.chords[i]), idx(sc.chords[i + 1]));
  });
  const loops = D.sections.filter((s) => s.loop);
  loops.forEach((sc, i) => {
    const next = loops[(i + 1) % loops.length];
    if (sc.chords.length && next.chords.length) add(idx(sc.chords[sc.chords.length - 1]), idx(next.chords[0]));
  });
  return out;
}
