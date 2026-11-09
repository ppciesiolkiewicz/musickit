import { PARTS, type Part } from "./arrange";
import { clampBpm } from "./clock";
import { chordFromNumeral } from "./numerals";
import { PROGRESSIONS, findProgression, splitLength, type ModeId } from "./progressions";
import { STYLES } from "./styles";

/** What the person chose: everything the band needs, and what is saved. Pure, tested. */

export const TONICS = ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"] as const;

export interface PartLevel {
  /** 0-1 */
  volume: number;
  muted: boolean;
}

export interface BandSettings {
  progression: string;
  /** a progression of its own (a plan's chords), read in `tonic`; it plays instead of `progression` until one is picked */
  numerals: string[] | null;
  tonic: string;
  style: string;
  bpm: number;
  levels: Record<Part, PartLevel>;
}

export const DEFAULT_SETTINGS: BandSettings = {
  progression: PROGRESSIONS[0].id,
  numerals: null,
  tonic: "C",
  style: PROGRESSIONS[0].style,
  bpm: 100,
  levels: { drums: { volume: 0.8, muted: false }, bass: { volume: 0.8, muted: false }, keys: { volume: 0.7, muted: false } },
};

const level = (v: unknown, fallback: PartLevel): PartLevel => {
  const o = (v && typeof v === "object" ? v : {}) as Partial<PartLevel>;
  const vol = Number(o.volume);
  return { volume: Number.isFinite(vol) ? Math.min(1, Math.max(0, vol)) : fallback.volume, muted: typeof o.muted === "boolean" ? o.muted : fallback.muted };
};

/** Settings from anything (a save, a patch over the current ones): unknown ids and bad numbers fall back to `base`. */
export function clampSettings(raw: unknown, base: BandSettings = DEFAULT_SETTINGS): BandSettings {
  const o = (raw && typeof raw === "object" ? raw : {}) as Partial<Record<keyof BandSettings, unknown>>;
  const pick = (v: unknown, ok: readonly string[], fallback: string) => (typeof v === "string" && ok.includes(v) ? v : fallback);
  const levels = (o.levels && typeof o.levels === "object" ? o.levels : {}) as Partial<Record<Part, unknown>>;
  return {
    progression: pick(o.progression, PROGRESSIONS.map((p) => p.id), base.progression),
    numerals: o.numerals === undefined ? base.numerals : cleanNumerals(o.numerals),
    tonic: pick(o.tonic, TONICS, base.tonic),
    style: pick(o.style, STYLES.map((s) => s.id), base.style),
    bpm: o.bpm === undefined ? base.bpm : clampBpm(Number(o.bpm), base.bpm),
    levels: Object.fromEntries(PARTS.map((p) => [p, level(levels[p], base.levels[p])])) as Record<Part, PartLevel>,
  };
}

/** At most this many chords in a progression of its own. */
export const MAX_NUMERALS = 16;

/** The numerals that read as chords ("V7", "bVII:2"), at most `MAX_NUMERALS`; null when none do. */
export function cleanNumerals(v: unknown): string[] | null {
  const ok = (Array.isArray(v) ? v : []).filter((n): n is string => typeof n === "string" && !!chordFromNumeral(splitLength(n)[0], "C")).slice(0, MAX_NUMERALS);
  return ok.length ? ok : null;
}

/** What the band plays: its own numerals, else the curated progression's. */
export const playedNumerals = (s: BandSettings): string[] => s.numerals ?? findProgression(s.progression).numerals;

/** The scale under the chords: the curated progression's mode; for numerals of its own, minor when the first chord is. */
export function bandMode(s: BandSettings): ModeId {
  if (!s.numerals) return findProgression(s.progression).mode;
  return /^[b#♭♯]*[iv]/.test(s.numerals[0]) ? "minor" : "major";
}
