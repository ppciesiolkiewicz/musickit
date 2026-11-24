import type { Area } from "./concepts";
import { KEY_LADDERS, MAX_BACK, type KeyRung, type PlayerKeys } from "./keys";
import type { Level, PlanExercise, WarmUpPart } from "./types";

/*
 * Warm-ups (DayShape2): a short run of blocks that opens an area's part of a day. A warm-up is a block with
 * `kind: "warm-up"`; it names no path step, so the composer never picks it for one and a rating of it moves no step.
 * Pure.
 */

/** The areas whose section opens with a warm-up. Theory has none. */
export const WARM_UP_AREAS: Area[] = ["voice", "guitar"];

/** The most minutes a warm-up run takes. */
export const WARM_UP_MAX = 8;

/** The minutes a section's warm-up may take: a third of the section, at most `WARM_UP_MAX` (5 of 15, 6 of 20, 8 from 24). */
export const warmUpCap = (sectionMinutes: number): number => Math.max(0, Math.min(WARM_UP_MAX, Math.floor(sectionMinutes / 3)));

export const isWarmUp = (e: { kind?: unknown }): boolean => e.kind === "warm-up";

/** Where in the run a warm-up goes; one that doesn't say goes last. */
export const warmUpPart = (e: { warmUpPart?: unknown }): WarmUpPart => (e.warmUpPart === 1 || e.warmUpPart === 2 ? e.warmUpPart : 3);

const LEVEL_ORDER: Level[] = ["new", "beginner", "intermediate", "advanced"];
const rank = (l: Level | undefined): number => (l ? LEVEL_ORDER.indexOf(l) : 0);

/** What the run is picked from: one choice of a block, as the composer's `Candidate` has it. */
export interface WarmUpChoice {
  blockId: string;
  choiceId: string;
  minutes: number;
  exercise: PlanExercise;
}

export interface WarmUpRun<C extends WarmUpChoice> {
  /** in the order they are played: by part, and inside a part in the order they were picked */
  picks: C[];
  minutes: number;
  /** how many warm-up blocks of the area fit the player's level and are not kept already */
  pool: number;
  /** by choice id, for each pick: how many times its part has gone round its blocks by this day. What its key turns with (`warmUpKeys`). */
  turns: Map<string, number>;
}

const pc = (n: number) => ((n % 12) + 12) % 12;

/** Whether an octave from the key's note fits inside a sung range (MIDI notes): what a scale or a leap out from Do needs. */
export const keyFitsRange = (key: number, range: { low: number; high: number }): boolean => range.low + pc(key - range.low) + 12 <= range.high;

/**
 * The keys a warm-up may open in on one day, nearest to the day first: the keys the section's exercises open in
 * (`dayKeys`, in the order they are played; when none of them has a key, the keys of the player's rung on the area's
 * key ladder and the rungs below), then each one's neighbours on the circle of fifths (a fifth up, a fifth down). So a
 * warm-up is in a key of the day or one next to it, never a far one. With the player's own sung `range`, only keys
 * where an octave from Do fits in it stay (all of them when none fits; a voice type's two octaves hold every key).
 */
export function warmUpKeyPool(input: { area: Area; rung: KeyRung; dayKeys?: number[]; range?: { low: number; high: number } }): number[] {
  const { area, rung, range } = input;
  const day = [...new Set((input.dayKeys ?? []).map(pc))];
  const base = day.length ? day : KEY_LADDERS[area].slice(0, rung + 1).flat();
  const pool = [...new Set([...base, ...base.flatMap((k) => [pc(k + 7), pc(k + 5)])])];
  const fit = range ? pool.filter((k) => keyFitsRange(k, range)) : pool;
  return fit.length ? fit : pool;
}

/**
 * The keys of a warm-up that can change key (`moves.key`). A warm-up names no step, so it has no track to earn keys
 * on and its key is never rolled: it opens in a key of the day's `warmUpKeyPool`, the next one each time its part has
 * gone round its blocks (`turn`, from `warmUpRun`, so it turns with `dayNumber`): a drill that comes back comes back
 * in another key. The pool's other keys stay to go back to, the day's own first, at most `MAX_BACK`.
 */
export function warmUpKeys(pool: number[], turn: number): PlayerKeys | null {
  const n = pool.length;
  if (!n) return null;
  const at = ((Math.trunc(turn) % n) + n) % n;
  return { now: [pool[at]], back: pool.filter((_, i) => i !== at).slice(0, MAX_BACK) };
}

/**
 * An area's warm-up run for one day. From the area's warm-up blocks at or under the player's level (one choice a
 * block: the highest that fits), it goes round the parts in order (1, 2, 3) taking one block of each, again and again,
 * while the next one still fits in `cap` minutes. Which block of a part comes first turns with `day` (`dayNumber`), so
 * the run changes from day to day; `turns` says how many times round each pick's part is. `barred` blocks (kept from an earlier try of the day) are never taken.
 */
export function warmUpRun<C extends WarmUpChoice>(input: { area: Area; level: Level; cap: number; day: number; blocks: C[]; barred?: Set<string> }): WarmUpRun<C> {
  const { area, level, cap, day, blocks, barred } = input;
  const byBlock = new Map<string, C>();
  for (const c of [...blocks].sort((a, b) => a.choiceId.localeCompare(b.choiceId))) {
    if (!isWarmUp(c.exercise) || c.exercise.area !== area || rank(c.exercise.level) > rank(level) || barred?.has(c.blockId)) continue;
    const have = byBlock.get(c.blockId);
    if (!have || rank(c.exercise.level) > rank(have.exercise.level)) byBlock.set(c.blockId, c);
  }
  const pool = [...byBlock.values()].sort((a, b) => a.blockId.localeCompare(b.blockId));
  const parts = ([1, 2, 3] as const).map((p) => pool.filter((c) => warmUpPart(c.exercise) === p));
  const picked: { c: C; part: number }[] = [];
  const turns = new Map<string, number>();
  let minutes = 0;
  const rounds = Math.max(0, ...parts.map((p) => p.length));
  for (let r = 0, added = true; r < rounds && added; r++) {
    added = false;
    parts.forEach((list, i) => {
      if (r >= list.length) return;
      const c = list[(day + r) % list.length];
      if (minutes + c.minutes > cap) return;
      picked.push({ c, part: i });
      turns.set(c.choiceId, Math.floor((day + r) / list.length));
      minutes += c.minutes;
      added = true;
    });
  }
  // sort is stable: inside a part the order of picking stays
  return { picks: picked.sort((a, b) => a.part - b.part).map((x) => x.c), minutes, pool: pool.length, turns };
}
