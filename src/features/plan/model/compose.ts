import { mulberry32 } from "@/lib/improv/schillinger";
import type { Stars } from "@/features/progress/stars";
import { daySteps } from "./daySteps";
import { SOLID_STARS } from "./outcome";
import { PATH, type Track } from "./path";
import { addDays } from "./schedule";
import type { PlanAnswers, PlanExercise } from "./types";

/*
 * One day's practice plan made of library blocks (NEW7; design: docs/superpowers/specs/2026-11-18-plan-composer-design.md).
 * Pure: the same input gives the same plan; the only randomness comes from `seed`.
 */

/** A library block as the composer sees it. `exercise` is ready to sit in a plan (content, slot and tags together). */
export interface Candidate {
  blockId: string;
  steps: string[];
  minutes: number;
  use: { times: number; seconds: number };
  mine: { stars: Stars; ratedAt: string } | null;
  exercise: PlanExercise;
}

export interface ComposeInput {
  answers: PlanAnswers;
  /** solidRatedAt */
  solid: Map<string, string>;
  blocks: Candidate[];
  /** local yyyy-mm-dd */
  date: string;
  /** block ids of the day before: never picked */
  yesterday: string[];
  /** exercises rated today, kept as they are (asking for another plan) */
  keep: PlanExercise[];
  /** block ids turned down today: never picked */
  declined: string[];
  /** who and which try: `${playerId}:${date}:${attempt}` */
  seed: string;
}

export interface ComposedDay {
  /** kept ones first, then new picks, review blocks last */
  exercises: PlanExercise[];
  /** the steps the new picks work on, in order */
  steps: string[];
  /** under the minutes by more than 5: the library has no more for these steps */
  short: boolean;
}

/** Minutes a day may end under its budget before the day is short. */
const SLACK = 5;

type Rng = () => number;
interface Pick { cand: Candidate; step: string }

/** FNV-1a, 32 bits. */
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0;
  return h;
}

const trackOf = (ref: string) => ref.slice(0, ref.lastIndexOf(":"));
const numOf = (ref: string) => Number(ref.slice(ref.lastIndexOf(":") + 1));

/** A block fits a step when it names it and names no later step of the same track. */
function fits(c: Candidate, step: string): boolean {
  if (!c.steps.includes(step)) return false;
  const track = trackOf(step);
  return c.steps.every((r) => trackOf(r) !== track || numOf(r) <= numOf(step));
}

/** The block for a step among usable ones: low rated (newest first), unrated (random among the least used few), solid (longest ago). */
function choose(usable: Candidate[], rng: Rng): Candidate {
  const low = usable.filter((c) => c.mine && c.mine.stars < SOLID_STARS)
    .sort((a, b) => Date.parse(b.mine!.ratedAt) - Date.parse(a.mine!.ratedAt) || a.blockId.localeCompare(b.blockId));
  if (low.length) return low[0];
  const unrated = usable.filter((c) => !c.mine)
    .sort((a, b) => a.use.seconds - b.use.seconds || a.use.times - b.use.times || a.blockId.localeCompare(b.blockId));
  if (unrated.length) {
    const pool = unrated.slice(0, Math.max(3, Math.ceil(unrated.length / 5)));
    return pool[Math.floor(rng() * pool.length)];
  }
  return usable.filter((c) => c.mine)
    .sort((a, b) => Date.parse(a.mine!.ratedAt) - Date.parse(b.mine!.ratedAt) || a.blockId.localeCompare(b.blockId))[0];
}

/** A block for a step not in `used`, walking down the track to the nearest earlier step that has one. */
function pickFor(step: string, blocks: Candidate[], used: Set<string>, rng: Rng): Pick | null {
  const track = trackOf(step);
  const n = numOf(step);
  const refs = track && Number.isInteger(n) && n > 0 ? Array.from({ length: n }, (_, i) => `${track}:${n - i}`) : [step];
  for (const ref of refs) {
    const usable = blocks.filter((c) => !used.has(c.blockId) && fits(c, ref));
    if (usable.length) return { cand: choose(usable, rng), step: ref };
  }
  return null;
}

/** Fill a day to its budget: planned review first (placed last), then fresh, open, more blocks on the day's steps, more review. */
function fill(steps: { fresh: string[]; open: string[]; review: string[] }, reviewCount: number, budget: number, blocks: Candidate[], used: Set<string>, rng: Rng) {
  const picks: Pick[] = [];
  const review: Pick[] = [];
  let total = 0;
  const room = () => total < budget;
  const take = (step: string, into: Pick[]): boolean => {
    const p = pickFor(step, blocks, used, rng);
    if (!p) return false;
    used.add(p.cand.blockId);
    total += p.cand.minutes;
    into.push(p);
    return true;
  };

  let r = 0;
  for (; r < steps.review.length && review.length < reviewCount && room(); r++) take(steps.review[r], review);

  const inDay: string[] = [];
  for (const step of [...steps.fresh, ...steps.open]) {
    if (!room()) break;
    if (take(step, picks)) inDay.push(step);
  }
  for (let added = true; added && room();) {
    added = false;
    for (const step of inDay) {
      if (!room()) break;
      if (take(step, picks)) added = true;
    }
  }
  for (; r < steps.review.length && room(); r++) take(steps.review[r], review);

  return { picks: [...picks, ...review], total };
}

export function composeDay(input: ComposeInput, tracks: Track[] = PATH): ComposedDay {
  const { answers, keep } = input;
  const kept = keep.reduce((s, e) => s + e.minutes, 0);
  const left = answers.minutes - kept;
  const budget = left <= SLACK ? answers.minutes : left;
  const steps = daySteps({ answers, solid: input.solid, date: input.date }, tracks);
  const reviewCount = answers.minutes >= 30 ? 2 : 1;
  const used = new Set([...input.yesterday, ...input.declined, ...keep.flatMap((e) => (e.blockId ? [e.blockId] : []))]);
  const { picks, total } = fill(steps, reviewCount, budget, input.blocks, used, mulberry32(hash(input.seed)));
  return {
    exercises: [...keep, ...picks.map((p) => p.cand.exercise)],
    steps: [...new Set(picks.map((p) => p.step))],
    short: budget - total > SLACK,
  };
}

/** Seven days for a teacher's student: each day gets the days before it as its history; no ratings arrive in between. */
export function composeWeek(input: Omit<ComposeInput, "keep" | "declined" | "yesterday">, days = 7, tracks: Track[] = PATH): ComposedDay[] {
  const out: ComposedDay[] = [];
  for (let i = 0; i < days; i++) {
    const yesterday = i ? out[i - 1].exercises.flatMap((e) => (e.blockId ? [e.blockId] : [])) : [];
    out.push(composeDay({ ...input, date: addDays(input.date, i), seed: `${input.seed}:${i}`, yesterday, keep: [], declined: [] }, tracks));
  }
  return out;
}
