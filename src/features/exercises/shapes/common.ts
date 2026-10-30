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

/** "strum" or a degree; unknown entries dropped. */
export function parseSteps(v: unknown, from: DegreesFrom): Step[] {
  return arr(v).flatMap((s): Step[] => {
    if (s === "strum") return [{ kind: "strum" }];
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
