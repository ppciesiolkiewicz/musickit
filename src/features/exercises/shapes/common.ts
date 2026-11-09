import { parseChordQuery } from "@/lib/chordKit/chordSearch";
import { findModePage } from "@/features/theory/scales";
import { findPentatonic } from "@/features/theory/pentatonics";
import { parseKeySlug } from "@/features/theory/keySlug";
import { degreeSemis } from "../timeline/degrees";
import { BEATS_PER_BAR } from "../timeline/timeline";
import type { DegreesFrom, Place, Step, TimelineEvent } from "../timeline/types";

export { BEATS_PER_BAR };
export type StepEvent = Extract<TimelineEvent, { type: "step" }>;

export const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
export const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
export const num = (v: unknown, fallback: number): number => (typeof v === "number" && Number.isFinite(v) ? v : fallback);
export const keyPc = (v: unknown): number | null => (typeof v === "string" || typeof v === "number" ? parseKeySlug(String(v)) : null);
/** The chord's name as written, or null when it can't be read. */
export const chordName = (v: unknown): string | null => (typeof v === "string" && parseChordQuery(v) ? v.trim() : null);
export const chordRoot = (name: string): number => parseChordQuery(name)!.rootPc;
export const isScale = (v: unknown): v is string => typeof v === "string" && !!(findPentatonic(v) || findModePage(v));
export const voicingOf = (v: unknown) => (v === "barre" ? "barre" : "open") as "open" | "barre";
export const fromOf = (v: unknown): DegreesFrom => (v === "key" ? "key" : "chord");

export function isPlace(v: unknown): v is Place {
  return isObj(v) && typeof v.box === "number" && (v.part === undefined || v.part === "lower" || v.part === "upper");
}
export const placeOf = (v: unknown): Place | undefined => (isPlace(v) ? (v.part ? { box: v.box, part: v.part } : { box: v.box }) : undefined);

/**
 * A grip as the AI writes it, `{ "grip": ["1","3","5"], "strings": "321" }` (optional `"fret": 7`): as many degrees as
 * strings, the strings distinct guitar numbers 1-6; null when unusable. Strings come back low to high (6 first).
 */
export function parseGrip(s: unknown, from: DegreesFrom): Extract<Step, { kind: "grip" }> | null {
  if (!isObj(s) || !Array.isArray(s.grip)) return null;
  const semis = s.grip.map(degreeSemis);
  const strings = typeof s.strings === "string" || typeof s.strings === "number" ? [...String(s.strings)].map(Number) : [];
  if (semis.some((x) => x === null) || semis.length < 2 || semis.length !== strings.length) return null;
  if (strings.some((n) => !Number.isInteger(n) || n < 1 || n > 6) || new Set(strings).size !== strings.length) return null;
  const fret = typeof s.fret === "number" && s.fret >= 0 && s.fret <= 17 ? { fret: s.fret } : {};
  return { kind: "grip", semis: semis as number[], strings: [...strings].sort((a, b) => b - a), from, ...fret };
}

/** "strum", a degree or a grip; unknown entries dropped. */
export function parseSteps(v: unknown, from: DegreesFrom): Step[] {
  return arr(v).flatMap((s): Step[] => {
    if (s === "strum") return [{ kind: "strum" }];
    if (isObj(s)) {
      const g = parseGrip(s, from);
      return g ? [g] : [];
    }
    const semis = degreeSemis(s);
    return semis === null ? [] : [{ kind: "note", semis, from }];
  });
}

/** Steps repeated one per beat over `beats` beats starting at `at`. */
export function fillSteps(steps: Step[], at: number, beats: number, chord: string, place?: Place): StepEvent[] {
  if (!steps.length) return [];
  return Array.from({ length: beats }, (_, i) => ({ type: "step" as const, at: at + i, beats: 1, chord, step: steps[i % steps.length], ...(place ? { place } : {}) }));
}

/** Default cue on a box change from the previous step; a `guide` entry wins at the same step index. */
export function addCues(events: StepEvent[], guide: unknown): StepEvent[] {
  const g = arr(guide);
  let prev: Place | undefined;
  return events.map((e, i) => {
    const text = typeof g[i] === "string" && g[i] ? (g[i] as string) : prev && e.place && e.place.box !== prev.box ? `Box ${e.place.box}${e.place.part ? `, ${e.place.part} part` : ""}` : undefined;
    if (e.place) prev = e.place;
    return text ? { ...e, cue: text } : e;
  });
}

export const repeatsOf = (raw: Record<string, unknown>) => (typeof raw.repeats === "number" ? { repeats: raw.repeats } : {});
