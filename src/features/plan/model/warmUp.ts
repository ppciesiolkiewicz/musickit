import type { Area } from "./concepts";
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
}

/**
 * An area's warm-up run for one day. From the area's warm-up blocks at or under the player's level (one choice a
 * block: the highest that fits), it goes round the parts in order (1, 2, 3) taking one block of each, again and again,
 * while the next one still fits in `cap` minutes. Which block of a part comes first turns with `day` (`dayNumber`), so
 * the run changes from day to day. `barred` blocks (kept from an earlier try of the day) are never taken.
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
  let minutes = 0;
  const rounds = Math.max(0, ...parts.map((p) => p.length));
  for (let r = 0, added = true; r < rounds && added; r++) {
    added = false;
    parts.forEach((list, i) => {
      if (r >= list.length) return;
      const c = list[(day + r) % list.length];
      if (minutes + c.minutes > cap) return;
      picked.push({ c, part: i });
      minutes += c.minutes;
      added = true;
    });
  }
  // sort is stable: inside a part the order of picking stays
  return { picks: picked.sort((a, b) => a.part - b.part).map((x) => x.c), minutes, pool: pool.length };
}
