import { NOTE_NAMES } from "./fx";

/**
 * The mood of what is being played, for the mood effects: how much energy (higher up the neck, higher notes, faster and louder
 * picks) and how bright (a major key or a minor one, from the recent notes). Pure: NeckView feeds it and draws it.
 */

/** A note heard or passed, at `t` seconds (any clock, the same one as `now`). */
export interface Heard { t: number; midi: number | null; level: number }
export interface Mood {
  /** 0 calm to 1 wild */
  energy: number;
  /** −1 minor to 1 major, 0 when the key isn't clear */
  bright: number;
  /** 0 settled (the home note) to 1 tense (a note outside the key), from the last note against the key */
  tension: number;
}
export const CALM: Mood = { energy: 0, bright: 0, tension: 0 };

const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
/** How long notes count toward the energy, and toward the key (s). */
const ENERGY_WINDOW = 2.5, KEY_WINDOW = 8;

/** How high up the neck: the nut 0, fret 14 and above 1. */
export const fretHeat = (fret: number) => clamp(fret / 14);
/** How high a note: the low E (40) 0, two octaves and a bit up (E5, 76) 1. */
export const pitchHeat = (midi: number) => clamp((midi - 40) / 36);

/** Krumhansl–Kessler key profiles, from C. */
const MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const MINOR = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];
function corr(a: number[], b: number[]) {
  const ma = a.reduce((t, v) => t + v, 0) / a.length, mb = b.reduce((t, v) => t + v, 0) / b.length;
  let n = 0, da = 0, db = 0;
  for (let i = 0; i < a.length; i++) { n += (a[i] - ma) * (b[i] - mb); da += (a[i] - ma) ** 2; db += (b[i] - mb) ** 2; }
  return da && db ? n / Math.sqrt(da * db) : 0;
}

export interface Key { tonic: number; minor: boolean; name: string; /** −1 minor to 1 major, scaled by how sure */ bright: number }
/**
 * The key the recent notes sound most like (Krumhansl–Schmuckler, newer notes counting more), or null under three different
 * notes. `bright` leans to the winner as far as the best major and best minor keys are apart.
 */
export function keyOf(heard: Heard[], now: number): Key | null {
  const hist = new Array<number>(12).fill(0);
  for (const h of heard) {
    if (h.midi === null || now - h.t > KEY_WINDOW || h.t > now) continue;
    hist[((h.midi % 12) + 12) % 12] += 1 - (now - h.t) / KEY_WINDOW;
  }
  if (hist.filter((v) => v > 0).length < 3) return null;
  let best = { r: -2, tonic: 0, minor: false }, bestMaj = -2, bestMin = -2;
  for (let tonic = 0; tonic < 12; tonic++) {
    const rot = (p: number[]) => p.map((_, i) => p[(i - tonic + 12) % 12]);
    const maj = corr(hist, rot(MAJOR)), min = corr(hist, rot(MINOR));
    bestMaj = Math.max(bestMaj, maj); bestMin = Math.max(bestMin, min);
    if (maj > best.r) best = { r: maj, tonic, minor: false };
    if (min > best.r) best = { r: min, tonic, minor: true };
  }
  return {
    tonic: best.tonic, minor: best.minor,
    name: `${NOTE_NAMES[best.tonic]} ${best.minor ? "minor" : "major"}`,
    bright: clamp((bestMaj - bestMin) * 6, -1, 1),
  };
}

/**
 * How tense a note sounds in a key, from its distance above the home note in semitones: the home note 0, the 5th and the
 * 3rd low, the other notes of the scale more, the 7th that leads home more still, a note outside the key high, the tritone most.
 */
export function tensionOf(semis: number, minor: boolean): number {
  const d = ((semis % 12) + 12) % 12;
  if (d === 0) return 0;
  if (d === 7) return 0.1;
  if (d === 6) return 1;
  const third = minor ? 3 : 4, seventh = minor ? 10 : 11;
  if (d === third) return 0.2;
  if (d === seventh || (minor && d === 11)) return 0.6;
  const scale = minor ? [2, 5, 8] : [2, 5, 9];
  return scale.includes(d) ? 0.35 : 0.85;
}
/** How long the last note's tension counts (s). */
const TENSION_WINDOW = 1.5;

/**
 * The mood to head for now: energy from where the fretting hand is (or, with no hand on the neck, how high the recent notes
 * are), how many notes a second and how loud; brightness from the key.
 */
export function moodTarget(heard: Heard[], now: number, fret: number | null): Mood {
  const recent = heard.filter((h) => now - h.t <= ENERGY_WINDOW && h.t <= now);
  const pitched = recent.filter((h) => h.midi !== null);
  const height = fret !== null ? fretHeat(fret)
    : pitched.length ? pitchHeat(pitched.reduce((t, h) => t + h.midi!, 0) / pitched.length) : 0;
  const pace = clamp(recent.length / ENERGY_WINDOW / 6);
  const loud = recent.length ? recent.reduce((t, h) => t + h.level, 0) / recent.length : 0;
  const key = keyOf(heard, now);
  const last = pitched[pitched.length - 1];
  const tension = key && last && now - last.t <= TENSION_WINDOW ? tensionOf(last.midi! - key.tonic, key.minor) : 0;
  return { energy: clamp(0.45 * height + 0.35 * pace + 0.2 * loud), bright: key?.bright ?? 0, tension };
}

/** Eased toward `target` over `dt` seconds: energy rises fast and falls slowly, so a run builds; brightness drifts. */
export function easeMood(prev: Mood, target: Mood, dt: number): Mood {
  const step = (from: number, to: number, rate: number) => from + (to - from) * (1 - Math.exp(-rate * Math.max(0, dt)));
  return {
    energy: step(prev.energy, target.energy, target.energy > prev.energy ? 4 : 0.6),
    bright: step(prev.bright, target.bright, 0.8),
    tension: step(prev.tension, target.tension, target.tension > prev.tension ? 8 : 1.5),
  };
}

/** The mood's colour: minor cool (blue to violet), major warm (amber), unclear magenta; more energy, hotter and more saturated. */
export function moodColour(m: Mood): { hue: number; sat: number; light: number } {
  // −1 → 235 (blue), 0 → 300 (magenta), 1 → 395 = 35 (amber), going round through red
  const hue = (300 + m.bright * (m.bright < 0 ? 65 : 95) + 360) % 360;
  // energy pulls a cool colour toward violet and a warm one toward red-orange
  const heated = (hue + (m.bright < 0 ? 40 : -20) * m.energy + 360) % 360;
  // tension pulls toward an acid green, away from the key's colour
  const t = m.tension * 0.6;
  const tense = heated + ((((130 - heated) % 360) + 540) % 360 - 180) * t;
  return { hue: (tense + 360) % 360, sat: Math.min(100, 60 + 40 * m.energy + 20 * m.tension), light: 50 + 15 * m.energy };
}

/** A CSS filter for the video: duller and darker when calm, saturated and punchy when wild. */
export function moodFilter(m: Mood): string {
  const e = m.energy, r = (v: number) => Math.round(v * 100) / 100;
  return `saturate(${r(0.6 + 1.1 * e)}) contrast(${r(0.95 + 0.25 * e)}) brightness(${r(0.85 + 0.2 * e)})`;
}
