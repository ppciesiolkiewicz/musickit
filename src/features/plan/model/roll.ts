import type { TrackKeys } from "./keyStages";
import type { Given, MovePart, Moves, Stepped } from "./moves";
import type { PlayerKeys } from "./keys";

/*
 * The version of a block a player gets next (ChoiceSplit, "The composer: rolling a version"). From the last rated play
 * of the block: found hard, mostly the version before; the same again, mostly the same; easy, mostly one move (a faster
 * tempo, or one more key). A rating tilts the dice and never forces an outcome. A move changes one part and keeps a bit
 * of the version before: the earlier keys and tempos stay as chips. Pure: the dice are handed in.
 */

/** Every number of the roll. Starting values, tuned on /dev/compose. */
export const ROLL = {
  /** 1 or 2 stars: the chance of the version before; else the same again */
  low: { back: 0.7 },
  /** 3 stars: the chance of a move; else the same */
  mid: { move: 0.3 },
  /** 4 or 5 stars: the chance of a move; else the same */
  high: { move: 0.8 },
  /** which part moves, by weight, among the moves that are in */
  weights: { bpm: 3, key: 2 },
  /** a first play of a block on a track where keys are already earned: the chance it opens with them too */
  earnedOnFirst: 0.5,
  /** the most keys an exercise opens with */
  maxNow: 3,
  /** the most earlier tempos kept as chips */
  maxBack: 2,
};

/** The most earlier keys kept as chips (as `MAX_BACK` in keys.ts). */
const MAX_KEYS_BACK = 3;
/** The order a move is drawn in. */
const ORDER: MovePart[] = ["bpm", "key"];

/** One rated play of the block: the row's id, its stars and the version it was played in (none: a row from before versions were kept). */
export interface VersionRow { id: string; stars: number; given?: Given }
/** A move that is in: the part, its weight and the value it would add. */
export interface MoveIn { part: MovePart; weight: number; to: number }
/** Everything the roll decided, for /dev/compose. */
export interface RollTrace {
  /** the newest rated play; null on a first play */
  last: { stars: number; given: Given } | null;
  outcome: "first" | "back" | "same" | "move";
  /** the chances the last rating gave (all 0 on a first play) */
  odds: { back: number; same: number; move: number };
  movesIn: MoveIn[];
  /** the part that moved; null when none did */
  moved: MovePart | null;
  /** every value drawn from the dice, in order */
  draws: number[];
}

export interface RollInput {
  moves: Moves;
  /** the key and tempo the block is written in (`written`, moves.ts) */
  written: { key: number | null; bpm: number | null };
  /** the player's keys on the block's step; null when the block names no step of the path */
  keys: TrackKeys | null;
  /** this player's rated plays of this block, newest first */
  history: VersionRow[];
}

/**
 * The version of a first play: the track's first key and the block's starting tempo. With dice, and keys the player
 * has earned on the track besides the first, it opens with those too by `ROLL.earnedOnFirst`. Without dice: the first
 * key alone (what a row with no version stands for).
 */
export function firstVersion(input: RollInput, rng?: () => number): Given {
  const { moves, keys } = input;
  const out: Given = {};
  if (moves.key && keys) {
    const more = keys.earned.filter((k) => k !== keys.first);
    const wide = !!rng && more.length > 0 && rng() < ROLL.earnedOnFirst;
    out.keys = { now: (wide ? [keys.first, ...more] : [keys.first]).slice(0, ROLL.maxNow), back: [] };
  }
  if (moves.bpm) out.bpm = { now: moves.bpm.from, back: [] };
  return out;
}

const sameList = (a: number[], b: number[]) => a.length === b.length && a.every((v, i) => v === b[i]);
const sameKeys = (a?: PlayerKeys, b?: PlayerKeys) => (!a || !b ? a === b : sameList(a.now, b.now) && sameList(a.back, b.back));
const sameStep = (a?: Stepped, b?: Stepped) => (!a || !b ? a === b : a.now === b.now && sameList(a.back, b.back));
/** Whether two versions play the same (their `moved` count aside). */
const sameVersion = (a: Given, b: Given) => sameKeys(a.keys, b.keys) && sameStep(a.bpm, b.bpm);

/** The roll for one exercise: the version it is played in, and how it was decided. `rng` gives numbers from 0 up to 1. */
export function rollVersion(input: RollInput, rng: () => number): { given: Given; trace: RollTrace } {
  const draws: number[] = [];
  const draw = () => { const r = rng(); draws.push(r); return r; };
  const { moves, keys, history } = input;
  const first = firstVersion(input);
  // a version as this block plays it now: a part the row lacks (a row from before, a block that gained a move) is the first play's
  const versionOf = (row: VersionRow): Given => {
    const g = row.given ?? {};
    return { ...(first.keys ? { keys: g.keys ?? first.keys } : {}), ...(first.bpm ? { bpm: g.bpm ?? first.bpm } : {}), ...(g.moved ? { moved: g.moved } : {}) };
  };
  const newest = history[0];
  if (!newest) {
    const given = firstVersion(input, draw);
    return { given, trace: { last: null, outcome: "first", odds: { back: 0, same: 0, move: 0 }, movesIn: [], moved: null, draws } };
  }
  const last = versionOf(newest);
  const odds = newest.stars <= 2 ? { back: ROLL.low.back, same: 1 - ROLL.low.back, move: 0 }
    : newest.stars === 3 ? { back: 0, same: 1 - ROLL.mid.move, move: ROLL.mid.move }
    : { back: 0, same: 1 - ROLL.high.move, move: ROLL.high.move };
  const round = (o: typeof odds) => ({ back: +o.back.toFixed(4), same: +o.same.toFixed(4), move: +o.move.toFixed(4) });
  const trace: RollTrace = { last: { stars: newest.stars, given: last }, outcome: "same", odds: round(odds), movesIn: [], moved: null, draws };
  const r = draw();
  if (odds.back > 0) {
    if (r >= odds.back) return { given: last, trace };
    // the version before is an easier one: the newest earlier play fewer moves from the first, never a harder one found hard
    const before = history.slice(1).map(versionOf).find((v) => (v.moved ?? 0) < (last.moved ?? 0) && !sameVersion(v, last));
    trace.outcome = "back";
    return { given: before ?? first, trace };
  }
  if (r >= odds.move) return { given: last, trace };

  if (moves.bpm && last.bpm && last.bpm.now + moves.bpm.step <= moves.bpm.to) trace.movesIn.push({ part: "bpm", weight: ROLL.weights.bpm, to: last.bpm.now + moves.bpm.step });
  if (moves.key && keys && last.keys) {
    const played = new Set([...last.keys.now, ...last.keys.back]);
    const next = keys.open.find((k) => !played.has(k));
    if (next !== undefined) trace.movesIn.push({ part: "key", weight: ROLL.weights.key, to: next });
  }
  trace.movesIn.sort((a, b) => ORDER.indexOf(a.part) - ORDER.indexOf(b.part));
  if (!trace.movesIn.length) return { given: last, trace };

  const total = trace.movesIn.reduce((s, m) => s + m.weight, 0);
  let at = draw() * total;
  const move = trace.movesIn.find((m) => (at -= m.weight) < 0) ?? trace.movesIn[trace.movesIn.length - 1];
  trace.outcome = "move";
  trace.moved = move.part;
  const given: Given = { ...last, moved: (last.moved ?? 0) + 1 };
  if (move.part === "bpm") given.bpm = { now: move.to, back: [last.bpm!.now, ...last.bpm!.back].slice(0, ROLL.maxBack) };
  else {
    const now = [move.to, ...last.keys!.now];
    given.keys = { now: now.slice(0, ROLL.maxNow), back: [...now.slice(ROLL.maxNow), ...last.keys!.back].slice(0, MAX_KEYS_BACK) };
  }
  return { given, trace };
}
