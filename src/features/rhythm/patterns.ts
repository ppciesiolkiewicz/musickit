/** A rhythm to play over one 4/4 bar: where each hit falls, in beats from the bar's start (0 = beat 1, 0.5 = the "and" of 1). */
export interface Pattern { id: string; name: string; hint: string; beats: number[] }

export const PATTERNS: Pattern[] = [
  { id: "quarters", name: "Quarters", hint: "1 2 3 4", beats: [0, 1, 2, 3] },
  { id: "eighths", name: "Eighths", hint: "1 & 2 & 3 & 4 &", beats: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5] },
  { id: "offbeats", name: "Offbeats", hint: "& & & &", beats: [0.5, 1.5, 2.5, 3.5] },
  { id: "folk", name: "Folk strum", hint: "1 2 & & 4 &", beats: [0, 1, 1.5, 2.5, 3, 3.5] },
  { id: "push", name: "Push", hint: "1 & & 4", beats: [0, 1.5, 2.5, 3] },
];

export const BEATS_PER_BAR = 4;
export const MIN_BPM = 40;
export const MAX_BPM = 200;

export const patternById = (id: string): Pattern => PATTERNS.find((p) => p.id === id) ?? PATTERNS[0];

/** A round: one bar of count-in clicks, then `bars` bars of the pattern. Times are seconds on the audio clock, from `start`. */
export interface Round { clicks: { time: number; accent: boolean; countIn: boolean }[]; targets: number[]; end: number; beat: number }

export function buildRound(pattern: Pattern, bpm: number, bars: number, start: number): Round {
  const beat = 60 / bpm;
  const clicks: Round["clicks"] = [];
  for (let i = 0; i < BEATS_PER_BAR * (bars + 1); i++) clicks.push({ time: start + i * beat, accent: i % BEATS_PER_BAR === 0, countIn: i < BEATS_PER_BAR });
  const first = start + BEATS_PER_BAR * beat;
  const targets: number[] = [];
  for (let b = 0; b < bars; b++) for (const at of pattern.beats) targets.push(first + (b * BEATS_PER_BAR + at) * beat);
  return { clicks, targets, end: first + bars * BEATS_PER_BAR * beat, beat };
}
