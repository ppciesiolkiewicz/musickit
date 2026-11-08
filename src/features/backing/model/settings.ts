import { PARTS, type Part } from "./arrange";
import { clampBpm } from "./clock";
import { PROGRESSIONS } from "./progressions";
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
  tonic: string;
  style: string;
  bpm: number;
  levels: Record<Part, PartLevel>;
}

export const DEFAULT_SETTINGS: BandSettings = {
  progression: PROGRESSIONS[0].id,
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
    tonic: pick(o.tonic, TONICS, base.tonic),
    style: pick(o.style, STYLES.map((s) => s.id), base.style),
    bpm: o.bpm === undefined ? base.bpm : clampBpm(Number(o.bpm), base.bpm),
    levels: Object.fromEntries(PARTS.map((p) => [p, level(levels[p], base.levels[p])])) as Record<Part, PartLevel>,
  };
}
