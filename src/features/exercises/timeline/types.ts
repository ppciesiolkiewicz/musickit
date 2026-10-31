import type { CompPattern } from "@/lib/practice/comping";

export type Degree = string;
export type Voicing = "open" | "barre";
export type DegreesFrom = "key" | "chord";
export type BoxPart = "lower" | "upper";
export interface Place { box: number; part?: BoxPart }
export type Step = { kind: "strum" } | { kind: "note"; semis: number; from: DegreesFrom };

/** `at` and `beats` are in beats from the start; `highlight` is semitones above the chord root. */
export type TimelineEvent =
  | { type: "scale"; at: number; key: number; scale: string }
  | { type: "chord"; at: number; beats: number; name: string; voicing: Voicing; place?: Place; backing?: CompPattern; highlight?: number[] }
  | { type: "step"; at: number; beats: number; chord: string; step: Step; place?: Place; cue?: string };

export interface Timeline {
  bpm: number;
  bars: number;
  events: TimelineEvent[];
  repeats?: number;
  backingChoices?: CompPattern[];
  hints?: { at: number; text: string }[];
  /** each chord without a comping `backing` is held under the steps, once per chord */
  pad?: boolean;
  /** a drone on this pitch class sounds under the whole timeline */
  drone?: number;
}
