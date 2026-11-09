import { findGroove, type BassHit, type BassRole, type Groove } from "@/features/instruments/model";

export type { BassHit, BassRole };

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

/** A 4/4 style: the groove (drums, bass, swing, tempo) from the instruments, plus what only the backing track plays. */
const withGroove = (id: Groove["id"], rest: Omit<Style, keyof Groove | "beatsPerBar">): Style => ({ ...(findGroove(id) as Groove), beatsPerBar: 4, ...rest });

const hits = (spec: [number, number, BassRole, number?][]): BassHit[] => spec.map(([at, len, note, vel]) => ({ at, len, note, ...(vel !== undefined && { vel }) }));
const stabs = (spec: [number, number, number?][]): CompHit[] => spec.map(([at, len, vel]) => ({ at, len, ...(vel !== undefined && { vel }) }));

export const STYLES: Style[] = [
  withGroove("pop", {
    keys: "PIANO",
    voicing: "close",
    fill: { kick: "x.......x.......", snare: "....X.......XxXx", hat: "x.x.x.x.x.x....." },
    comp: stabs([[0, 6, 0.7], [6, 4, 0.5], [10, 6, 0.6]]),
  }),
  withGroove("rock", {
    keys: "PIANO",
    voicing: "close",
    fill: { kick: "x...............", snare: "....X...x.x.XxXx", tom: "........x.x.....", hat: "x.x.x.x........." },
    comp: stabs([[0, 3, 0.7], [4, 3, 0.55], [8, 3, 0.65], [12, 3, 0.55]]),
  }),
  withGroove("ballad", {
    keys: "PIANO",
    voicing: "close",
    // a sustained arpeggio: each note rings to the end of the bar, as with the pedal down
    comp: [0, 1, 2, 3, 2, 1, 2, 1].map((voice, i) => ({ at: i * 2, len: 16 - i * 2, voice, vel: i === 0 ? 0.65 : 0.45 })),
  }),
  withGroove("swing", {
    keys: "ELEC_PIANO",
    voicing: "shell",
    // the Charleston: on 1 and on the "and" of 2
    comp: stabs([[0, 3, 0.6], [6, 2, 0.5]]),
  }),
  withGroove("shuffle", {
    keys: "PIANO",
    voicing: "close",
    fill: { kick: "x.......x.......", snare: "....X...x.x.x.x.", tom: "..........x...x.", hat: "x.x.x.x........." },
    comp: stabs([[4, 2, 0.55], [12, 2, 0.55]]),
  }),
  withGroove("bossa", {
    keys: "ELEC_PIANO",
    voicing: "shell",
    comp: stabs([[0, 3, 0.55], [3, 3, 0.45], [6, 4, 0.5], [10, 3, 0.45], [13, 3, 0.5]]),
  }),
  withGroove("funk", {
    keys: "ELEC_PIANO",
    voicing: "close",
    fill: { kick: "x.x....x........", snare: "....X..o..x.XxXx", hat: "xoxoxoxo........" },
    comp: stabs([[2, 1, 0.55], [4, 1, 0.6], [7, 1, 0.5], [10, 1, 0.55], [12, 1, 0.6], [15, 1, 0.5]]),
  }),
  withGroove("reggae", {
    keys: "PIANO",
    voicing: "close",
    // the skank on every off-beat
    comp: stabs([[2, 1, 0.55], [6, 1, 0.55], [10, 1, 0.55], [14, 1, 0.55]]),
  }),
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
