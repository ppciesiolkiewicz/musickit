import { mulberry32 } from "@/lib/improv/schillinger";
import type { ProgressEntry } from "@/features/progress/log";
import type { Stars } from "@/features/progress/stars";
import type { Area } from "./concepts";
import { DAY_ORDER, dayAreas, daySteps, type DaySteps } from "./daySteps";
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
 * A day is laid out in sections by its minutes (DayShape1): one area a section, one section under 30 minutes, two from
 * 30 to 49, three from 50, never more than the areas the player picked; which areas turns with the date (`dayAreas`).
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
  /** exercises rated today, kept as they are (asking for another plan), each first in the section of its area */
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

/** One section of a day: an area, the minutes it was asked to hold, and its exercises (kept ones first, then new picks, review last). */
export interface DaySection {
  area: Area;
  /** its even share of the day's minutes; 0 for a section added because the day's own could not fill the minutes */
  minutes: number;
  exercises: PlanExercise[];
}

export interface ComposedDay {
  /** the flat list, in section order: kept exercises of an area with no section today first, then each section's (kept ones, new picks, review last) */
  exercises: PlanExercise[];
  /** the day's sections that hold an exercise, voice first, then guitar, then theory. Absent only on a day from a server before DayShape1. */
  sections?: DaySection[];
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
  /** the section it was picked for */
  section: Area;
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

/** One section as the composer filled it. */
export interface SectionTrace {
  area: Area;
  /** why the day has it: its place in the date's turn, or added because the turn's sections left the day short */
  why: "turn" | "added";
  /** its even share of the day's minutes (0 when added) */
  asked: number;
  /** the minutes of the kept exercises in it */
  kept: number;
  /** how many review blocks were planned for it: 1, or 2 when its share is 30 minutes or more */
  reviewCount: number;
  /** the steps of its area the day works on (`daySteps`) */
  steps: DaySteps;
  /** the minutes of its new picks */
  filled: number;
  /** the minutes it could not fill on its own run, handed to the next section (the last one's go back to the earlier ones) */
  unused: number;
}

/** Everything `composeDay` decided, stage by stage, for /dev/compose. Not stored. */
export interface ComposeTrace {
  /** `reviewCount`: the planned review blocks of the turn's sections together */
  minutes: { asked: number; kept: number; budget: number; reviewCount: number; reviewCap: number; filled: number };
  /** which areas the day got: the player's areas in day order, how many sections the minutes give, where the date's turn starts */
  areas: { picked: Area[]; count: number; turn: number };
  /** the day's sections, voice first, then guitar, then theory; an empty one stays listed */
  sections: SectionTrace[];
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
 * One section's filling, which can stop and go on: planned review first (placed last), then fresh, open, more blocks on
 * the section's steps, more review. A planned review block fits `reviewCap` minutes (a third of the day); the later
 * "more review" has no cap. `run(target)` picks until the day's new minutes (`day.total`, shared by the sections) reach
 * `target` or the section has nothing left; a later `run` goes on where the last one stopped.
 */
function sectionFill(area: Area, steps: DaySteps, reviewCount: number, reviewCap: number, blocks: Candidate[], used: Barred, rng: Rng, day: { total: number }, trace?: ComposeTrace) {
  const picks: Pick[] = [];
  const review: Pick[] = [];
  let stage: PickStage = "review";
  const take = (step: string, into: Pick[], from = blocks): boolean => {
    const p = pickFor(step, from, used, rng);
    if (!p) {
      if (trace && !trace.empty.includes(step)) trace.empty.push(step);
      return false;
    }
    used.choices.add(p.cand.choiceId);
    used.blocks.add(p.cand.blockId);
    day.total += p.cand.minutes;
    into.push(p);
    trace?.picks.push({ blockId: p.cand.blockId, choiceId: p.cand.choiceId, title: shownTitle(p.cand.exercise), minutes: p.cand.minutes, section: area, stage, asked: step, step: p.step, reason: p.reason, among: p.among, total: day.total });
    return true;
  };

  // Every `yield` stands before one pick: `run` goes past it only while the minutes have room.
  function* walk(): Generator<void, void, void> {
    // round-robin: one block on each step in order, again and again, until a pass adds nothing
    function* rounds(refs: string[], into: Pick[]): Generator<void, void, void> {
      for (let added = true; added;) {
        added = false;
        for (const step of refs) {
          yield;
          if (take(step, into)) added = true;
        }
      }
    }

    // a review step with no block short enough is passed over for the next one
    const short = blocks.filter((c) => c.minutes <= reviewCap);
    let r = 0;
    for (; r < steps.review.length && review.length < reviewCount; r++) {
      yield;
      take(steps.review[r], review, short);
    }

    const inDay: string[] = [];
    for (const [kind, refs] of [["fresh", steps.fresh], ["open", steps.open]] as const) {
      for (const step of refs) {
        yield;
        stage = kind;
        if (take(step, picks)) inDay.push(step);
      }
    }
    stage = "more";
    yield* rounds(inDay, picks);
    stage = "more review";
    // the review steps not tried yet first, then the planned ones again
    yield* rounds([...steps.review.slice(r), ...steps.review.slice(0, r)], review);
  }

  const it = walk();
  let over = false;
  const run = (target: number): void => {
    while (!over && day.total < target) over = !!it.next().done;
  };
  return { picks, review, run };
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

const minutesOf = (list: PlanExercise[]): number => list.reduce((n, e) => n + e.minutes, 0);
const byDayOrder = (a: { area: Area }, b: { area: Area }): number => DAY_ORDER.indexOf(a.area) - DAY_ORDER.indexOf(b.area);

/**
 * One day's plan with every decision that made it (`ComposeTrace`): what /dev/compose draws. `composeDay` is its `day`.
 *
 * The day's areas come from `dayAreas`; each gets a section and an even share of the minutes (a minute that does not
 * divide goes to the first sections). The sections are filled in day order, each until the day's new minutes reach the
 * shares so far, so a section the library cannot fill hands its unused minutes to the next, and a block that runs over
 * comes off the next. Minutes still unfilled after the last section go back to the earlier ones; a day still short
 * then (more than 5 minutes under) gets a section for the player's next area in the turn. A kept exercise sits first in
 * the section of its area and counts toward that section's minutes.
 */
export function explainDay(input: ComposeInput, tracks: Track[] = PATH): { day: ComposedDay; trace: ComposeTrace } {
  const { answers, keep } = input;
  const kept = minutesOf(keep);
  const left = answers.minutes - kept;
  // 5 minutes or less left after the kept exercises: a whole new day's minutes, the kept ones not counted
  const again = left <= SLACK;
  const budget = again ? answers.minutes : left;
  const turn = dayAreas({ answers, date: input.date });
  // choice ids: yesterday's, declined and kept ones are never picked; nor a second choice of a block already in the day
  const used: Barred = {
    choices: new Set([...input.yesterday, ...input.declined, ...keep.flatMap((e) => (e.choiceId ? [e.choiceId] : []))]),
    blocks: new Set(keep.flatMap((e) => (e.blockId ? [e.blockId] : []))),
  };
  // a planned review block fits a third of the day (at least 5 minutes), so most of a short day stays new
  const reviewCap = Math.max(5, answers.minutes / 3);
  const inReach = withinReach(input.blocks, answers, input.solid, tracks);
  const trace: ComposeTrace = {
    minutes: { asked: answers.minutes, kept, budget, reviewCount: 0, reviewCap, filled: 0 },
    areas: { picked: turn.picked, count: turn.count, turn: turn.turn },
    sections: [],
    library: { all: input.blocks.length, inReach: inReach.length, usable: inReach.filter((c) => !barred(c, used)).length },
    picks: [],
    empty: [],
  };
  const rng = mulberry32(hash(input.seed));
  const day = { total: 0 };
  const keptIn = (area: Area) => keep.filter((e) => e.area === area);
  const open = (area: Area, why: SectionTrace["why"], asked: number) => {
    const steps = daySteps({ answers, solid: input.solid, date: input.date, areas: [area] }, tracks);
    // review as a day of the section's minutes would plan it: one block, two from 30 minutes
    const reviewCount = asked >= 30 ? 2 : 1;
    const t: SectionTrace = { area, why, asked, kept: minutesOf(keptIn(area)), reviewCount, steps, filled: 0, unused: 0 };
    return { area, t, fill: sectionFill(area, steps, reviewCount, reviewCap, inReach, used, rng, day, trace) };
  };

  const n = turn.areas.length;
  const sections = turn.areas.map((area, i) => open(area, "turn", Math.floor(answers.minutes / n) + (i < answers.minutes % n ? 1 : 0)));
  trace.minutes.reviewCount = sections.reduce((sum, s) => sum + s.t.reviewCount, 0);
  let shares = 0;
  sections.forEach((s, i) => {
    shares += s.t.asked - (again ? 0 : s.t.kept);
    // the last section fills the day; the minutes of a kept exercise with no section today come off it
    const target = i === n - 1 ? budget : Math.min(budget, shares);
    s.fill.run(target);
    s.t.unused = Math.max(0, target - day.total);
  });
  // minutes the last section could not fill: the earlier sections go on where they stopped
  for (const s of sections) s.fill.run(budget);
  // still short: the player's next area in the turn gets a section, so a thin area never leaves a day empty
  for (const area of turn.rest) {
    if (budget - day.total <= SLACK) break;
    const s = open(area, "added", 0);
    s.fill.run(budget);
    sections.push(s);
  }
  sections.sort(byDayOrder);
  for (const s of sections) s.t.filled = [...s.fill.picks, ...s.fill.review].reduce((sum, p) => sum + p.cand.minutes, 0);
  trace.sections = sections.map((s) => s.t);
  trace.minutes.filled = day.total;

  const picks = sections.flatMap((s) => [...s.fill.picks, ...s.fill.review]);
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
  const placed = (p: Pick): PlanExercise => (versions.has(p.cand.choiceId) ? { ...p.cand.exercise, given: versions.get(p.cand.choiceId)!.given } : p.cand.exercise);
  const laid: DaySection[] = sections
    .map((s) => ({ area: s.area, minutes: s.t.asked, exercises: [...keptIn(s.area), ...s.fill.picks.map(placed), ...s.fill.review.map(placed)] }))
    .filter((s) => s.exercises.length > 0);
  // a kept exercise of an area with no section today (or of no area) stays in the day, ahead of the sections
  const sectioned = new Set<string>(sections.map((s) => s.area));
  const others = keep.filter((e) => !e.area || !sectioned.has(e.area));
  return {
    day: {
      exercises: [...others, ...laid.flatMap((s) => s.exercises)],
      sections: laid,
      steps: [...new Set(picks.map((p) => p.step))],
      short: budget - day.total > SLACK,
    },
    trace,
  };
}

export const composeDay = (input: ComposeInput, tracks: Track[] = PATH): ComposedDay => explainDay(input, tracks).day;

/**
 * Seven days for a teacher's student: each day gets the days before it as its history; no ratings arrive in between.
 * Each day is laid out in sections like a player's own (`dayAreas` by its date), so the areas turn through the week.
 * `yesterday` holds the choice ids of the day before the first one (the last day of the week before), `[]` when left out.
 */
export function composeWeek(input: Omit<ComposeInput, "keep" | "declined" | "yesterday"> & { yesterday?: string[] }, days = 7, tracks: Track[] = PATH): ComposedDay[] {
  const out: ComposedDay[] = [];
  for (let i = 0; i < days; i++) {
    const yesterday = i ? out[i - 1].exercises.flatMap((e) => (e.choiceId ? [e.choiceId] : [])) : (input.yesterday ?? []);
    out.push(composeDay({ ...input, date: addDays(input.date, i), seed: `${input.seed}:${i}`, yesterday, keep: [], declined: [] }, tracks));
  }
  return out;
}
