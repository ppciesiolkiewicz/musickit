import { layOut, type PlacedChord } from "./progressions";
import { DRUM_LANES, STEPS_PER_BEAT, type BassRole, type DrumLane, type Style, type Voicing } from "./styles";

/**
 * The arranger: a progression in a key + a style → every note of one time round, in beats. Pure and deterministic, so
 * it is tested without audio; the band (`../audio/band.ts`) only schedules what comes out of here.
 */

export type Part = "drums" | "bass" | "keys";
export const PARTS: Part[] = ["drums", "bass", "keys"];

export interface NoteEvent {
  part: Part;
  /** start, in beats from the top of the progression (swing already applied) */
  beat: number;
  /** length in beats */
  beats: number;
  /** 0-1 */
  vel: number;
  /** the pitch, for the bass and the keys */
  midi?: number;
  /** the drum, for the drums */
  lane?: DrumLane;
}

export interface Arrangement {
  /** one time round, in beats */
  beats: number;
  beatsPerBar: number;
  chords: PlacedChord[];
  /** sorted by beat */
  events: NoteEvent[];
}

const DRUM_VEL: Record<string, number> = { X: 1, x: 0.7, o: 0.35 };
const EPS = 1e-9;

/** The beat of a step in the bar, the off-beat eighths pushed late by the swing (fully swung, to the last triplet). */
export function stepBeat(step: number, swing: number): number {
  const beat = step / STEPS_PER_BEAT;
  return step % STEPS_PER_BEAT === 2 ? beat + swing / 6 : beat;
}

/** The chord sounding at `beat` (0 ≤ beat < the progression's length). */
export function chordAt(chords: readonly PlacedChord[], beat: number): number {
  let i = 0;
  while (i + 1 < chords.length && chords[i + 1].beat <= beat + EPS) i++;
  return i;
}

/** The bass's root for a pitch class: between E1 and D♯2, so every key sits in the same register. */
export const bassRoot = (pc: number): number => {
  const k = ((pc % 12) + 12) % 12;
  return k >= 4 ? 24 + k : 36 + k;
};

const intervalTo = (from: number, to: number) => (((to - from) % 12) + 12) % 12;

/** A bass role over `chord` as a MIDI note; `next` is the chord after it (for the approach note). */
export function bassNote(role: BassRole, chord: PlacedChord, next: PlacedChord): number {
  const root = bassRoot(chord.rootPc);
  const above = (i: number) => root + intervalTo(chord.rootPc, chord.pcs[i] ?? chord.rootPc);
  switch (role) {
    case "R":
      return root;
    case "3":
      return above(1);
    case "5": {
      const fifth = chord.pcs.find((pc) => intervalTo(chord.rootPc, pc) === 7);
      return fifth === undefined ? above(2) : root + 7;
    }
    case "7":
      return chord.pcs.length > 3 ? above(3) : root + 12;
    case "b7":
      return root + 10;
    case "6":
      return root + 9;
    case "8":
      return root + 12;
    case "A": {
      const target = bassRoot(next.rootPc);
      return target - 1;
    }
  }
}

/** The notes a voicing keeps, as pitch classes, lowest role first. */
function voicingPcs(chord: PlacedChord, voicing: Voicing): number[] {
  const pcs = chord.pcs.slice(0, 4);
  if (voicing === "shell" && pcs.length >= 4) return [pcs[1], pcs[3]];
  return pcs;
}

const KEYS_LOW = 53; // F3
const KEYS_CENTRE = 62;

/** Every inversion of `pcs` stacked upwards from its lowest note in [KEYS_LOW, KEYS_LOW + 11]. */
function inversions(pcs: number[]): number[][] {
  return pcs.map((_, r) => {
    const order = [...pcs.slice(r), ...pcs.slice(0, r)];
    const out: number[] = [];
    for (const pc of order) {
      let n = out.length ? out[out.length - 1] + 1 : KEYS_LOW;
      n += intervalTo(n, pc);
      out.push(n);
    }
    return out;
  });
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

/** How far a voicing moves from the last one: every note's distance to the nearest previous note, plus a pull to the middle. */
function moveCost(next: number[], prev: number[] | null): number {
  const drift = Math.abs(mean(next) - KEYS_CENTRE) * 0.5;
  if (!prev) return drift;
  return next.reduce((sum, n) => sum + Math.min(...prev.map((p) => Math.abs(n - p))), 0) + drift;
}

/** One voicing per chord, each the inversion closest to the one before (smooth voice leading), round the loop and back. */
export function voiceLead(chords: readonly PlacedChord[], voicing: Voicing): number[][] {
  const pick = (prev: number[] | null, c: PlacedChord) => inversions(voicingPcs(c, voicing)).reduce((best, v) => (moveCost(v, prev) < moveCost(best, prev) ? v : best));
  // go round twice, so the first chord is voiced coming from the last one, as it is heard when the loop repeats
  let prev: number[] | null = null;
  for (const c of chords) prev = pick(prev, c);
  return chords.map((c) => (prev = pick(prev, c)));
}

/** A voicing's `i`th note for an arpeggio: past the top it goes on an octave up. */
const arpNote = (voicing: number[], i: number) => voicing[i % voicing.length] + 12 * Math.floor(i / voicing.length);

/** Lay out `numerals` in `tonic` and arrange one time round for `style`. */
export function arrange(numerals: readonly string[], tonic: string, style: Style): Arrangement {
  const bpb = style.beatsPerBar;
  const { chords, beats } = layOut(numerals, tonic, bpb);
  const events: NoteEvent[] = [];
  if (!chords.length) return { beats: 0, beatsPerBar: bpb, chords, events };
  const voicings = voiceLead(chords, style.voicing);
  const stepsPerBar = bpb * STEPS_PER_BEAT;
  const bars = Math.ceil(beats / bpb - EPS);
  const endOf = (i: number) => chords[i].beat + chords[i].beats;

  for (let bar = 0; bar < bars; bar++) {
    const top = bar * bpb;
    const useFill = style.fill && bars >= 4 && bar === bars - 1;
    const lines = useFill ? style.fill! : style.drums;
    for (const lane of DRUM_LANES) {
      const line = lines[lane];
      if (!line) continue;
      const from = (bar * stepsPerBar) % line.length;
      for (let s = 0; s < stepsPerBar; s++) {
        const vel = DRUM_VEL[line[from + s]];
        const beat = top + stepBeat(s, style.swing);
        if (vel && beat < beats - EPS) events.push({ part: "drums", beat, beats: 0.25, vel, lane });
      }
    }

    for (const h of style.bass) {
      const beat = top + stepBeat(h.at, style.swing);
      if (beat >= beats - EPS) continue;
      const i = chordAt(chords, beat);
      const chord = chords[i];
      const role = Math.abs(beat - chord.beat) < EPS ? "R" : h.note;
      const len = Math.min(h.len / STEPS_PER_BEAT, endOf(i) - beat);
      events.push({ part: "bass", beat, beats: len, vel: h.vel ?? 0.8, midi: bassNote(role, chord, chords[(i + 1) % chords.length]) });
    }

    for (const h of style.comp) {
      const beat = top + stepBeat(h.at, style.swing);
      if (beat >= beats - EPS) continue;
      const i = chordAt(chords, beat);
      const len = Math.min(h.len / STEPS_PER_BEAT, endOf(i) - beat);
      const notes = h.voice === undefined ? voicings[i] : [arpNote(voicings[i], h.voice)];
      for (const midi of notes) events.push({ part: "keys", beat, beats: len, vel: h.vel ?? 0.6, midi });
    }
  }

  // a chord that starts between the style's hits (half-bar chords) still gets heard: the keys play it as it comes in
  chords.forEach((c, i) => {
    if (events.some((e) => e.part === "keys" && Math.abs(e.beat - c.beat) < EPS)) return;
    for (const midi of voicings[i]) events.push({ part: "keys", beat: c.beat, beats: Math.min(2, c.beats), vel: 0.55, midi });
  });

  events.sort((a, b) => a.beat - b.beat);
  return { beats, beatsPerBar: bpb, chords, events };
}

/**
 * The events to play between song beats `from` (inclusive) and `to` (exclusive), the arrangement repeating from
 * song beat `origin`. Each comes with its song beat (`at`), so a window across the loop point gets both ends.
 */
export function eventsBetween(arr: Arrangement, origin: number, from: number, to: number): { at: number; ev: NoteEvent }[] {
  if (arr.beats <= 0 || to <= from) return [];
  const out: { at: number; ev: NoteEvent }[] = [];
  let round = Math.floor((from - origin) / arr.beats);
  for (;;) {
    const start = origin + round * arr.beats;
    if (start >= to) break;
    for (const ev of arr.events) {
      const at = start + ev.beat;
      if (at >= from - EPS && at < to - EPS) out.push({ at, ev });
    }
    round++;
  }
  return out;
}
