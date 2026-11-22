import type { ProgressEntry } from "@/features/progress/log";
import type { PlanAnswers } from "../intake/answers";
import type { Area } from "./concepts";
import { topicsFor } from "../intake/topics";
import { scoringRows } from "./moves";
import { SOLID_STARS, reachIndex } from "./outcome";
import { PATH, stepAt, type Track } from "./path";
import { reach } from "./reach";

/*
 * Which areas a day works on (DayShape1) and which steps of the path in them (NEW7). Pure: the composer picks library
 * blocks for these, one section an area.
 * Nothing here blocks a player; `open` steps are only ahead because a topic's cap is full.
 */

export interface DaySteps {
  /** within reach and not solid, one per topic before any topic's second; the opening topic rotates with the date */
  fresh: string[];
  /** ahead only because the topic's cap is full (`open`), same order */
  open: string[];
  /** solid steps, rated longest ago first */
  review: string[];
}

/** An ISO time in ms; no time (or one that does not parse) counts as the oldest. */
const ms = (at: string | undefined): number => { const t = Date.parse(at ?? ""); return Number.isNaN(t) ? -Infinity : t; };

/** When each solid step was last rated: the newest rating that counts for it (`reachIndex`), as an ISO datetime. */
export function solidRatedAt(entries: ProgressEntry[]): Map<string, string> {
  const newest = new Map<string, ProgressEntry>();
  for (const entry of scoringRows(entries)) {
    const steps = (entry.steps ?? []).filter((r) => stepAt(r));
    for (const id of new Set(steps.map((r) => stepAt(r)!.track.id))) {
      const upTo = reachIndex(id, { steps, entry });
      for (let i = 0; i <= upTo; i++) {
        const ref = `${id}:${i + 1}`;
        const prev = newest.get(ref);
        if (!prev || ms(entry.at) >= ms(prev.at)) newest.set(ref, entry);
      }
    }
  }
  const out = new Map<string, string>();
  for (const [ref, e] of newest) if (e.stars >= SOLID_STARS) out.set(ref, e.at);
  return out;
}

const dayNumber = (date: string) => { const n = Math.floor(Date.parse(`${date}T00:00:00Z`) / 86_400_000); return Number.isNaN(n) ? 0 : n; };

/** The order of a day's sections (DayShape1): voice first, then guitar, then theory. */
export const DAY_ORDER: Area[] = ["voice", "guitar", "theory"];

/** How many sections a day of these minutes has: one under 30 minutes, two from 30 to 49, three from 50. */
export const sectionCount = (minutes: number): number => (minutes < 30 ? 1 : minutes < 50 ? 2 : 3);

/** Which areas a day works on, and how the turn came out. */
export interface DayAreas {
  /** the day's areas, one section each, in `DAY_ORDER` */
  areas: Area[];
  /** the player's other areas, in the order the turn reaches them next */
  rest: Area[];
  /** the player's areas in `DAY_ORDER` */
  picked: Area[];
  /** how many sections the minutes give (`sectionCount`), never more than the areas picked */
  count: number;
  /** where in `picked` the day's turn starts: the day number modulo the areas picked */
  turn: number;
}

/**
 * The areas of one day (DayShape1): as many as the minutes give sections, never more than the player picked, and the
 * turn moves one area on with each date, so a player with more areas than sections gets every area in turn.
 */
export function dayAreas(input: { answers: Pick<PlanAnswers, "areas" | "minutes">; date: string }): DayAreas {
  const picked = DAY_ORDER.filter((a) => input.answers.areas.includes(a));
  const count = Math.min(picked.length, sectionCount(input.answers.minutes));
  const turn = picked.length ? dayNumber(input.date) % picked.length : 0;
  const turned = [...picked.slice(turn), ...picked.slice(0, turn)];
  const inDay = new Set(turned.slice(0, count));
  return { areas: picked.filter((a) => inDay.has(a)), rest: turned.slice(count), picked, count, turn };
}

/**
 * The steps of the path a day works on, in `areas`: one section's area for the composer (`dayAreas`), every area the
 * player picked when left out.
 */
export function daySteps(input: { answers: PlanAnswers; solid: Map<string, string>; date: string; areas?: Area[] }, tracks: Track[] = PATH): DaySteps {
  const { answers, solid, date } = input;
  const inAreas = input.areas ?? answers.areas;
  const areas = new Set<string>(inAreas);
  const mine = (ref: string) => { const at = stepAt(ref, tracks); return at && areas.has(at.track.area) ? at.track.topic : null; };
  const marks = reach({ topics: answers.topics, solid: solid.keys() }, tracks);
  const known = inAreas.flatMap((a) => topicsFor(a).map((t) => t.id));

  const inReach = [...marks.values()].filter((s) => mine(s.ref) !== null);
  const freshRefs = inReach.filter((s) => s.mark === "reach").map((s) => s.ref);
  const openRefs = inReach.filter((s) => s.open).map((s) => s.ref);

  // One topic order for the day: questionnaire order (topics no area lists come last), rotated by the day over the
  // topics that have a fresh or an open step.
  const have = new Set([...freshRefs, ...openRefs].map((r) => mine(r)!));
  const base = [...known, ...have].filter((t, i, all) => have.has(t) && all.indexOf(t) === i);
  const shift = base.length ? dayNumber(date) % base.length : 0;
  const order = [...base.slice(shift), ...base.slice(0, shift)];

  // one step per topic before any topic's second
  const spread = (refs: string[]): string[] => {
    const byTopic = new Map<string, string[]>();
    for (const ref of refs) { const t = mine(ref)!; byTopic.set(t, [...(byTopic.get(t) ?? []), ref]); }
    const out: string[] = [];
    for (let round = 0; out.length < refs.length; round++) for (const t of order) { const r = byTopic.get(t)?.[round]; if (r) out.push(r); }
    return out;
  };

  return {
    fresh: spread(freshRefs),
    open: spread(openRefs),
    review: [...solid].filter(([ref]) => mine(ref) !== null).sort((a, b) => (ms(a[1]) < ms(b[1]) ? -1 : ms(a[1]) > ms(b[1]) ? 1 : 0) || a[0].localeCompare(b[0])).map(([ref]) => ref),
  };
}
