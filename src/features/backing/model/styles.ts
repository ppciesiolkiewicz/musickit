/**
 * Styles: how the band plays one bar, as data. Pure, no audio.
 *
 * A style never names a note. Drums are lanes of steps; the bass and the keys say WHEN they play and WHAT ROLE the
 * note has ("root", "the chord's 3rd", "a step below the next chord"). The arranger (`arrange.ts`) turns that into
 * notes for whatever chord is sounding, so one style plays every progression in every key.
 *
 * Time is in 16th-note steps: 4 to a beat, so a 4/4 bar has 16 steps and a 3/4 bar 12.
 */

export const STEPS_PER_BEAT = 4;

export const DRUM_LANES = ["kick", "snare", "clap", "hat", "open", "tom"] as const;
export type DrumLane = (typeof DRUM_LANES)[number];

/**
 * One drum lane, one character per step: "X" accent, "x" normal, "o" ghost (soft), anything else is a rest.
 * Its length is a whole number of bars; a two-bar lane alternates.
 */
export type DrumLine = string;

/**
 * A bass note's role over the chord that sounds when it plays:
 * R root · 3 the chord's third · 5 its fifth · 7 its seventh (the octave on a triad) · b7 a minor 7th above the root ·
 * 6 a major 6th above the root · 8 the octave · A the note a half step below the NEXT chord's root (a walking approach).
 * A note that falls on the first beat of a chord always plays its root.
 */
export type BassRole = "R" | "3" | "5" | "7" | "b7" | "6" | "8" | "A";

export interface BassHit {
  /** step in the bar */
  at: number;
  /** length in steps */
  len: number;
  note: BassRole;
  /** 0-1, 0.8 by default */
  vel?: number;
}

export interface CompHit {
  at: number;
  len: number;
  vel?: number;
  /** one note of the voicing (0 lowest, wraps round) for an arpeggio; the whole chord when left out */
  voice?: number;
}

/** close: the chord's notes stacked inside an octave · shell: only the 3rd and 7th (jazz), the full triad when there is no 7th */
export type Voicing = "close" | "shell";

export interface Style {
  id: string;
  name: string;
  beatsPerBar: 3 | 4;
  /** a comfortable starting tempo */
  bpm: number;
  /** 0 straight eighths, 1 full triplet swing (the off-beat eighth moves to the last triplet) */
  swing: number;
  /** the sampled instrument the chords play on (an id of the sound engine) */
  keys: string;
  voicing: Voicing;
  drums: Partial<Record<DrumLane, DrumLine>>;
  /** drums for the last bar of the progression, when it is 4 bars or longer */
  fill?: Partial<Record<DrumLane, DrumLine>>;
  bass: BassHit[];
  comp: CompHit[];
}

const hits = (spec: [number, number, BassRole, number?][]): BassHit[] => spec.map(([at, len, note, vel]) => ({ at, len, note, ...(vel !== undefined && { vel }) }));
const stabs = (spec: [number, number, number?][]): CompHit[] => spec.map(([at, len, vel]) => ({ at, len, ...(vel !== undefined && { vel }) }));

export const STYLES: Style[] = [
  {
    id: "pop",
    name: "Pop",
    beatsPerBar: 4,
    bpm: 100,
    swing: 0,
    keys: "PIANO",
    voicing: "close",
    drums: { kick: "x.......x.x.....", snare: "....X.......X...", hat: "x.x.x.x.x.x.x.x." },
    fill: { kick: "x.......x.......", snare: "....X.......XxXx", hat: "x.x.x.x.x.x....." },
    bass: hits([[0, 6, "R"], [6, 2, "R", 0.6], [8, 6, "R"], [14, 2, "5", 0.6]]),
    comp: stabs([[0, 6, 0.7], [6, 4, 0.5], [10, 6, 0.6]]),
  },
  {
    id: "rock",
    name: "Rock",
    beatsPerBar: 4,
    bpm: 112,
    swing: 0,
    keys: "PIANO",
    voicing: "close",
    drums: { kick: "x.....x.x.x.....", snare: "....X.......X...", hat: "x.x.x.x.x.x.x.x." },
    fill: { kick: "x...............", snare: "....X...x.x.XxXx", tom: "........x.x.....", hat: "x.x.x.x........." },
    bass: hits([[0, 2, "R", 0.9], [2, 2, "R", 0.6], [4, 2, "R", 0.8], [6, 2, "R", 0.6], [8, 2, "R", 0.9], [10, 2, "R", 0.6], [12, 2, "R", 0.8], [14, 2, "R", 0.6]]),
    comp: stabs([[0, 3, 0.7], [4, 3, 0.55], [8, 3, 0.65], [12, 3, 0.55]]),
  },
  {
    id: "ballad",
    name: "Ballad",
    beatsPerBar: 4,
    bpm: 72,
    swing: 0,
    keys: "PIANO",
    voicing: "close",
    drums: { kick: "x.......x.......", snare: "....x.......x...", hat: "x.x.x.x.x.x.x.x." },
    bass: hits([[0, 8, "R"], [8, 8, "5", 0.7]]),
    // a sustained arpeggio: each note rings to the end of the bar, as with the pedal down
    comp: [0, 1, 2, 3, 2, 1, 2, 1].map((voice, i) => ({ at: i * 2, len: 16 - i * 2, voice, vel: i === 0 ? 0.65 : 0.45 })),
  },
  {
    id: "swing",
    name: "Swing",
    beatsPerBar: 4,
    bpm: 140,
    swing: 1,
    keys: "ELEC_PIANO",
    voicing: "shell",
    // the ride's "spang-a-lang" on the hat, a feathered kick, the hat's foot on 2 and 4 on the clap lane, softly
    drums: { hat: "X...x.x.X...x.x.", kick: "o...o...o...o...", clap: "....o.......o..." },
    bass: hits([[0, 4, "R"], [4, 4, "3", 0.7], [8, 4, "5", 0.75], [12, 4, "A", 0.7]]),
    // the Charleston: on 1 and on the "and" of 2
    comp: stabs([[0, 3, 0.6], [6, 2, 0.5]]),
  },
  {
    id: "shuffle",
    name: "Blues shuffle",
    beatsPerBar: 4,
    bpm: 96,
    swing: 1,
    keys: "PIANO",
    voicing: "close",
    drums: { kick: "x.......x.......", snare: "....X.......X...", hat: "x.x.x.x.x.x.x.x." },
    fill: { kick: "x.......x.......", snare: "....X...x.x.x.x.", tom: "..........x...x.", hat: "x.x.x.x........." },
    // the boogie line: R 3 5 6 ♭7 6 5 3
    bass: hits([[0, 2, "R"], [2, 2, "3", 0.6], [4, 2, "5", 0.75], [6, 2, "6", 0.6], [8, 2, "b7", 0.75], [10, 2, "6", 0.6], [12, 2, "5", 0.75], [14, 2, "3", 0.6]]),
    comp: stabs([[4, 2, 0.55], [12, 2, 0.55]]),
  },
  {
    id: "bossa",
    name: "Bossa nova",
    beatsPerBar: 4,
    bpm: 120,
    swing: 0,
    keys: "ELEC_PIANO",
    voicing: "shell",
    drums: { kick: "x..x....x..x....", clap: "x..x..x...x..x..", hat: "oooooooooooooooo" },
    bass: hits([[0, 6, "R"], [6, 2, "5", 0.6], [8, 6, "5", 0.75], [14, 2, "R", 0.6]]),
    comp: stabs([[0, 3, 0.55], [3, 3, 0.45], [6, 4, 0.5], [10, 3, 0.45], [13, 3, 0.5]]),
  },
  {
    id: "funk",
    name: "Funk",
    beatsPerBar: 4,
    bpm: 98,
    swing: 0,
    keys: "ELEC_PIANO",
    voicing: "close",
    drums: { kick: "x.x....x..x.....", snare: "....X..o.o..X..o", hat: "xoxoxoxoxoxoxoxo" },
    fill: { kick: "x.x....x........", snare: "....X..o..x.XxXx", hat: "xoxoxoxo........" },
    bass: hits([[0, 2, "R"], [3, 1, "R", 0.6], [6, 1, "8", 0.7], [7, 1, "R", 0.6], [10, 2, "b7", 0.7], [12, 1, "R", 0.75], [14, 1, "5", 0.6], [15, 1, "8", 0.65]]),
    comp: stabs([[2, 1, 0.55], [4, 1, 0.6], [7, 1, 0.5], [10, 1, 0.55], [12, 1, 0.6], [15, 1, 0.5]]),
  },
  {
    id: "reggae",
    name: "Reggae",
    beatsPerBar: 4,
    bpm: 76,
    swing: 0,
    keys: "PIANO",
    voicing: "close",
    // the one drop: kick and snare together on 3, nothing on 1
    drums: { kick: "........X.......", clap: "........x.......", hat: "x.x.x.x.x.x.x.x." },
    bass: hits([[0, 4, "R"], [6, 2, "R", 0.6], [8, 2, "5", 0.75], [10, 4, "8", 0.65]]),
    // the skank on every off-beat
    comp: stabs([[2, 1, 0.55], [6, 1, 0.55], [10, 1, 0.55], [14, 1, 0.55]]),
  },
  {
    id: "waltz",
    name: "Waltz (3/4)",
    beatsPerBar: 3,
    bpm: 120,
    swing: 0,
    keys: "PIANO",
    voicing: "close",
    drums: { kick: "x...........", snare: "....o...o...", hat: "x...x...x..." },
    bass: hits([[0, 4, "R"]]),
    comp: stabs([[4, 3, 0.5], [8, 3, 0.5]]),
  },
];

export const findStyle = (id: string): Style => STYLES.find((s) => s.id === id) ?? STYLES[0];

/** Problems with a style's data (empty when it is sound): every pattern a whole number of bars, every hit inside its bar. */
export function checkStyle(style: Style): string[] {
  const bar = style.beatsPerBar * STEPS_PER_BEAT;
  const out: string[] = [];
  for (const [where, lines] of [["drums", style.drums], ["fill", style.fill ?? {}]] as const)
    for (const [lane, line] of Object.entries(lines)) if (!line || line.length % bar !== 0) out.push(`${style.id} ${where}.${lane}: ${line?.length} steps is not whole bars of ${bar}`);
  for (const [where, list] of [["bass", style.bass], ["comp", style.comp]] as const)
    list.forEach((h, i) => {
      if (h.at < 0 || h.at >= bar || h.len <= 0) out.push(`${style.id} ${where}[${i}] is outside the bar`);
    });
  if (style.swing < 0 || style.swing > 1) out.push(`${style.id} swing must be 0-1`);
  return out;
}
