import { DYAD_MAX_FRET, DYAD_MAX_SPAN, dyadPairId, dyadPairs } from "@/lib/chordKit/scaleChords";

/* double-stops-neck: what its props may hold. Pure; the pairs themselves are `dyadWalk` in lib/chordKit/scaleChords. */

/** The intervals the tool draws, as its `interval` prop names them. */
export const DYAD_NAMES = ["3rds", "6ths"] as const;
export type DyadName = (typeof DYAD_NAMES)[number];
export const isDyadName = (v: unknown): v is DyadName => DYAD_NAMES.includes(v as DyadName);
/** The size chordKit knows each by. */
export const DYAD_SIZE: Record<DyadName, 3 | 6> = { "3rds": 3, "6ths": 6 };

/** The string pairs an interval can sit on, as guitar numbers, the lowest pair first: "65" … "21" for 3rds, "64" … "31" for 6ths. */
export const dyadStrings = (interval: DyadName): string[] => dyadPairs(DYAD_SIZE[interval]).map(dyadPairId);
/** The pair drawn when the tool names none: the G and B strings for 3rds, the G and high e strings for 6ths. */
export const DYAD_DEFAULT_STRINGS: Record<DyadName, string> = { "3rds": "32", "6ths": "31" };

/** The frets a walk may run between: `to` at least a double stop's widest reach above `from`. */
export const LIMITS = { minFret: 0, maxFret: DYAD_MAX_FRET, minSpan: DYAD_MAX_SPAN };
