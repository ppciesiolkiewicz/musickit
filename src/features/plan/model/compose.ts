import { mulberry32 } from "@/lib/improv/schillinger";
import type { ProgressEntry } from "@/features/progress/log";
import type { Stars } from "@/features/progress/stars";
import type { Area } from "./concepts";
import { daySteps, type DaySteps } from "./daySteps";
import { levelOf } from "../intake/answers";
import { exerciseKeys, hasKeySelector, keyRung, type PlayerKeys } from "./keys";
import { keyTrackOf, playerKeys } from "./keyStages";
import { shownTitle, written, type Given } from "./moves";
import { SOLID_STARS } from "./outcome";
import { PATH, type Track } from "./path";
import { reach } from "./reach";
import { rollVersion, type RollTrace } from "./roll";
import { addDays } from "./schedule";
import type { PlanAnswers, PlanExercise } from "./types";

/*
 * One day's practice plan made of library blocks (NEW7; design: docs/superpowers/specs/2026-11-18-plan-composer-design.md).
 * Pure: the same input gives the same plan; the only randomness comes from `seed`.
 */

/**
 * One choice of a library block as the composer sees it: the composer picks choices. `exercise` is ready to sit in a plan
 * (content, slot and tags together, with the choice's steps, level, moves and minutes, `blockId` and `choiceId`). `use` is
 * the block's; `mine` is the player's newest rating of this choice.
 */
export interface Candidate {
  blockId: string;
  choiceId: string;
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
  /** choice ids of the day before: never picked (another choice of the same block may be) */
  yesterday: string[];
  /** exercises rated today, kept as they are (asking for another plan) */
  keep: PlanExercise[];
  /** choice ids turned down today: never picked */
  declined: string[];
  /** who and which try: `${playerId}:${date}:${attempt}` */
  seed: string;
  /** the player's whole progress log: what each choice's version is rolled from (its rows with that `choiceId`), and the keys they have earned. Absent: none. */
  history?: ProgressEntry[];
  /** who the versions are rolled for; absent: the part of `seed` before its first ":" */
  player?: string;
}

export interface ComposedDay {
  /** kept ones first, then new picks, review blocks last */
  exercises: PlanExercise[];
  /** the steps the new picks work on, in order */
  steps: string[];
  /** under the minutes by more than 5: the library has no more for these steps */
  short: boolean;
}

/** Why a pick was asked for: the stage of `fill` it came from, in the order the stages run. */
export type PickStage = "review" | "fresh" | "open" | "more" | "more review";
/** Why this block among the usable ones: rated low (the newest), not rated yet (one of the least used), or solid (rated longest ago). */
export type PickReason = "low" | "unrated" | "solid";

/** One choice picked, as the composer decided it. */
export interface TracedPick {
  blockId: string;
  choiceId: string;
  title: string;
  minutes: number;
  stage: PickStage;
  /** the step the day asked for */
  asked: string;
  /** the step the block was found on: `asked`, or an earlier step of its track when `asked` had no usable block */
  step: string;
  reason: PickReason;
  /** how many usable blocks the step had */
  among: number;
  /** the minutes filled after this pick */
  total: number;
  /** the version it was given: rolled for a block with moves, the player's keys for one with a Key selector; absent when it has neither */
  given?: Given;
  /** how the version was rolled; only for a block with moves */
  roll?: RollTrace;
}

/** Everything `composeDay` decided, stage by stage, for /dev/compose. Not stored. */
export interface ComposeTrace {
  minutes: { asked: number; kept: number; budget: number; reviewCount: number; reviewCap: number; filled: number };
  /** the steps the day works on (`daySteps`) */
  steps: DaySteps;
  /** the library: all choices handed in, those within the player's reach, those of them not barred (yesterday's, declined, kept, or of a kept block) */
  library: { all: number; inReach: number; usable: number };
  /** in the order they were picked (the day itself puts review last) */
  picks: TracedPick[];
  /** steps the day asked for that had no usable block, on them or earlier in their track */
  empty: string[];
}

/** Minutes a day may end under its budget before the day is short. */
const SLACK = 5;

type Rng = () => number;
interface Pick { cand: Candidate; step: string; reason: PickReason; among: number }
/** What a day may not pick: choices (yesterday's, declined, kept, picked) and blocks (one choice of a block a day). */
interface Barred { choices: Set<string>; blocks: Set<string> }
const barred = (c: Candidate, b: Barred): boolean => b.choices.has(c.choiceId) || b.blocks.has(c.blockId);

/** FNV-1a, 32 bits. */
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0;
  return h;
}

/** "trackId:n" read apart; null for anything else. */
function parseRef(ref: string): { track: string; n: number } | null {
  const m = /^(.+):([1-9]\d*)$/.exec(ref);
  return m ? { track: m[1], n: Number(m[2]) } : null;
}

/** A block fits a step when it names it and names no later step of the same track. */
function fits(c: Candidate, step: string): boolean {
  const at = parseRef(step);
  if (!at || !c.steps.includes(step)) return false;
  return c.steps.every((r) => { const o = parseRef(r); return !o || o.track !== at.track || o.n <= at.n; });
}

/**
 * The blocks a player may be given at all: every step they name is on the path and not beyond reach (marked ahead and
 * not `open`). Known, within-reach and open steps are fine, on any track.
 */
function withinReach(blocks: Candidate[], answers: PlanAnswers, solid: Map<string, string>, tracks: Track[]): Candidate[] {
  const marks = reach({ topics: answers.topics, solid: solid.keys() }, tracks);
  const ok = (ref: string) => { const m = marks.get(ref); return !!m && (m.mark !== "ahead" || m.open); };
  return blocks.filter((c) => c.steps.every(ok));
}

/** When a block was rated, in ms; a rating with no time counts as the oldest. */
function ratedMs(c: Candidate): number {
  const t = Date.parse(c.mine?.ratedAt ?? "");
  return Number.isNaN(t) ? -Infinity : t;
}
const byNum = (x: number, y: number) => (x < y ? -1 : x > y ? 1 : 0);

/** The block for a step among usable ones: low rated (newest first), unrated (random among the least used few), solid (longest ago). */
function choose(usable: Candidate[], rng: Rng): { cand: Candidate; reason: PickReason } {
  const low = usable.filter((c) => c.mine && c.mine.stars < SOLID_STARS)
    .sort((a, b) => byNum(ratedMs(b), ratedMs(a)) || a.choiceId.localeCompare(b.choiceId));
  if (low.length) return { cand: low[0], reason: "low" };
  const unrated = usable.filter((c) => !c.mine)
    .sort((a, b) => a.use.seconds - b.use.seconds || a.use.times - b.use.times || a.choiceId.localeCompare(b.choiceId));
  if (unrated.length) {
    const pool = unrated.slice(0, Math.max(3, Math.ceil(unrated.length / 5)));
    return { cand: pool[Math.floor(rng() * pool.length)], reason: "unrated" };
  }
  const solid = usable.filter((c) => c.mine)
    .sort((a, b) => byNum(ratedMs(a), ratedMs(b)) || a.choiceId.localeCompare(b.choiceId))[0];
  return { cand: solid, reason: "solid" };
}

/** A choice for a step not barred by `used`, walking down the track to the nearest earlier step that has one. */
function pickFor(step: string, blocks: Candidate[], used: Barred, rng: Rng): Pick | null {
  const at = parseRef(step);
  if (!at) return null;
  const refs = Array.from({ length: at.n }, (_, i) => `${at.track}:${at.n - i}`);
  for (const ref of refs) {
    const usable = blocks.filter((c) => !barred(c, used) && fits(c, ref));
    if (usable.length) return { ...choose(usable, rng), step: ref, among: usable.length };
  }
  return null;
}

/**
 * Fill a day to its budget: planned review first (placed last), then fresh, open, more blocks on the day's steps, more
 * review. A planned review block fits `reviewCap` minutes (a third of the day); the later "more review" has no cap.
 */
function fill(steps: { fresh: string[]; open: string[]; review: string[] }, reviewCount: number, reviewCap: number, budget: number, blocks: Candidate[], used: Barred, rng: Rng, trace?: ComposeTrace) {
  const picks: Pick[] = [];
  const review: Pick[] = [];
  let total = 0;
  let stage: PickStage = "review";
  const room = () => total < budget;
  const take = (step: string, into: Pick[], from = blocks): boolean => {
    const p = pickFor(step, from, used, rng);
    if (!p) {
      if (trace && !trace.empty.includes(step)) trace.empty.push(step);
      return false;
    }
    used.choices.add(p.cand.choiceId);
    used.blocks.add(p.cand.blockId);
    total += p.cand.minutes;
    into.push(p);
    trace?.picks.push({ blockId: p.cand.blockId, choiceId: p.cand.choiceId, title: shownTitle(p.cand.exercise), minutes: p.cand.minutes, stage, asked: step, step: p.step, reason: p.reason, among: p.among, total });
    return true;
  };

  // round-robin: one block on each step in order, again and again, until the minutes are filled or a pass adds nothing
  const rounds = (refs: string[], into: Pick[]) => {
    for (let added = true; added && room();) {
      added = false;
      for (const step of refs) {
        if (!room()) break;
        if (take(step, into)) added = true;
      }
    }
  };

  // a review step with no block short enough is passed over for the next one
  const short = blocks.filter((c) => c.minutes <= reviewCap);
  let r = 0;
  for (; r < steps.review.length && review.length < reviewCount && room(); r++) take(steps.review[r], review, short);

  const inDay: string[] = [];
  for (const [kind, refs] of [["fresh", steps.fresh], ["open", steps.open]] as const) {
    stage = kind;
    for (const step of refs) {
      if (!room()) break;
      if (take(step, picks)) inDay.push(step);
    }
  }
  stage = "more";
  rounds(inDay, picks);
  stage = "more review";
  // the review steps not tried yet first, then the planned ones again
  rounds([...steps.review.slice(r), ...steps.review.slice(0, r)], review);

  return { picks: [...picks, ...review], total };
}

/**
 * The player's keys for an exercise with a Key selector: the keys of their rung in the exercise's area (the answer to
 * the keys question, else the area's level), a different few by `turn` where the rung has many, and the earlier keys
 * to go back to. An exercise with no Key selector, or no area, gets none and stays in the key it was written in.
 */
function keysFor(e: PlanExercise, answers: PlanAnswers, turn: number): PlayerKeys | null {
  const area = e.area as Area | undefined;
  if (!area || !hasKeySelector(e)) return null;
  return exerciseKeys(area, keyRung(answers.keys, levelOf(answers, area)), turn);
}

/** What a choice's version is rolled from: the player, the choice, and their newest rated play of it. A new rating is a new roll; nothing else is. */
export const rollSeed = (player: string, choiceId: string, newestRowId: string | undefined): string => `${player}:${choiceId}:${newestRowId ?? ""}`;

/** An ISO time in ms; no time counts as the oldest. */
const at = (row: ProgressEntry): number => { const t = Date.parse(row.at ?? ""); return Number.isNaN(t) ? -Infinity : t; };

/**
 * The version an exercise is given. A choice with `moves` gets a rolled one (model/roll.ts): from the player's rated
 * plays of this choice (their rows with its `choiceId`; a row with none, of a hashed block or older, is no choice's), in
 * the keys of its track (the first step it names on the path; earned keys are per track), with dice seeded by `rollSeed`,
 * so it is the same on every day and every try until the choice is rated again. A block of the old shape, with its own
 * Key selector, gets the player's keys as before. Any other block gets none.
 */
export function versionFor(e: PlanExercise, input: { answers: PlanAnswers; seed: string; history?: ProgressEntry[]; player?: string }, tracks: Track[] = PATH): { given: Given; roll?: RollTrace } | null {
  if (!e.moves) {
    const keys = keysFor(e, input.answers, hash(`${input.seed}:${e.choiceId ?? ""}`));
    return keys ? { given: { keys } } : null;
  }
  const log = input.history ?? [];
  const history = log.filter((r) => !!e.choiceId && r.choiceId === e.choiceId).sort((a, b) => at(b) - at(a));
  const on = keyTrackOf(e.steps, tracks);
  const keys = on ? playerKeys(on.track, on.step, log, input.answers.keys ?? 0) : null;
  const player = input.player ?? input.seed.split(":")[0];
  const { given, trace } = rollVersion({ moves: e.moves, written: written(e), keys, history }, mulberry32(hash(rollSeed(player, e.choiceId ?? "", history[0]?.id))));
  return given.keys || given.bpm ? { given, roll: trace } : null;
}

/** One day's plan with every decision that made it (`ComposeTrace`): what /dev/compose draws. `composeDay` is its `day`. */
export function explainDay(input: ComposeInput, tracks: Track[] = PATH): { day: ComposedDay; trace: ComposeTrace } {
  const { answers, keep } = input;
  const kept = keep.reduce((s, e) => s + e.minutes, 0);
  const left = answers.minutes - kept;
  const budget = left <= SLACK ? answers.minutes : left;
  const steps = daySteps({ answers, solid: input.solid, date: input.date }, tracks);
  const reviewCount = answers.minutes >= 30 ? 2 : 1;
  // choice ids: yesterday's, declined and kept ones are never picked; nor a second choice of a block already in the day
  const used: Barred = {
    choices: new Set([...input.yesterday, ...input.declined, ...keep.flatMap((e) => (e.choiceId ? [e.choiceId] : []))]),
    blocks: new Set(keep.flatMap((e) => (e.blockId ? [e.blockId] : []))),
  };
  // a planned review block fits a third of the day (at least 5 minutes), so most of a short day stays new
  const reviewCap = Math.max(5, answers.minutes / 3);
  const inReach = withinReach(input.blocks, answers, input.solid, tracks);
  const trace: ComposeTrace = {
    minutes: { asked: answers.minutes, kept, budget, reviewCount, reviewCap, filled: 0 },
    steps,
    library: { all: input.blocks.length, inReach: inReach.length, usable: inReach.filter((c) => !barred(c, used)).length },
    picks: [],
    empty: [],
  };
  const { picks, total } = fill(steps, reviewCount, reviewCap, budget, inReach, used, mulberry32(hash(input.seed)), trace);
  trace.minutes.filled = total;
  // the versions last: they change no pick, only what each exercise opens in
  const versions = new Map<string, { given: Given; roll?: RollTrace }>();
  for (const p of picks) {
    const v = versionFor(p.cand.exercise, input, tracks);
    if (v) versions.set(p.cand.choiceId, v);
  }
  for (const t of trace.picks) {
    const v = versions.get(t.choiceId);
    if (v) Object.assign(t, { given: v.given }, v.roll ? { roll: v.roll } : {});
  }
  const day: ComposedDay = {
    exercises: [...keep, ...picks.map((p) => (versions.has(p.cand.choiceId) ? { ...p.cand.exercise, given: versions.get(p.cand.choiceId)!.given } : p.cand.exercise))],
    steps: [...new Set(picks.map((p) => p.step))],
    short: budget - total > SLACK,
  };
  return { day, trace };
}

export const composeDay = (input: ComposeInput, tracks: Track[] = PATH): ComposedDay => explainDay(input, tracks).day;

/**
 * Seven days for a teacher's student: each day gets the days before it as its history; no ratings arrive in between.
 * `yesterday` holds the choice ids of the day before the first one (the last day of the week before), `[]` when left out.
 * With `rest` (which days, from 0, have no practice) those days come back empty and never short, and the day after one
 * is kept apart from the last day that was composed, as if it were its yesterday.
 */
export function composeWeek(input: Omit<ComposeInput, "keep" | "declined" | "yesterday"> & { yesterday?: string[] }, days = 7, tracks: Track[] = PATH, rest: (day: number) => boolean = () => false): ComposedDay[] {
  const out: ComposedDay[] = [];
  let last = input.yesterday ?? [];
  for (let i = 0; i < days; i++) {
    if (rest(i)) {
      out.push({ exercises: [], steps: [], short: false });
      continue;
    }
    const yesterday = last;
    out.push(composeDay({ ...input, date: addDays(input.date, i), seed: `${input.seed}:${i}`, yesterday, keep: [], declined: [] }, tracks));
    last = out[i].exercises.flatMap((e) => (e.choiceId ? [e.choiceId] : []));
  }
  return out;
}
