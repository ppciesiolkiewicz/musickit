import type { Area } from "./concepts";
import { applyChoice, isOpen, partsOf } from "./choice";
import type { Cell, Choice, PlainCell } from "./tools";
import type { Block, Level } from "./types";

/*
 * The keys a player's plan is in (LibraryGrowth1). Each area has a ladder of keys, easiest first, and a player stands on
 * one rung of it: the keys of that rung are the ones their exercises start in, and the keys of the rungs below stay in
 * the Key selector to go back to. A key here is a tonic (a pitch class): the scale comes from the exercise, so "A" is
 * A minor in a pentatonic drill and A major in a three-chord song. Pure.
 */

/** A rung of a key ladder, 0 (one key) to 4 (any key). The same five rungs in every area. */
export type KeyRung = 0 | 1 | 2 | 3 | 4;
export const KEY_RUNGS: KeyRung[] = [0, 1, 2, 3, 4];

/** The lines of the keys question, one per rung of the key ladders (`KEY_LADDERS`), in the player's own words. */
export const KEY_LINES: Record<KeyRung, { name: string; line: string }> = {
  0: { name: "One key", line: "I play or sing everything in one key." },
  1: { name: "Two or three keys", line: "I know a couple of easy keys." },
  2: { name: "The common keys", line: "Most songs I meet are in a key I know." },
  3: { name: "Most keys", line: "Only keys with many sharps or flats slow me down." },
  4: { name: "Any key", line: "Every key feels the same." },
};

export const isKeyRung = (v: unknown): v is KeyRung => v === 0 || v === 1 || v === 2 || v === 3 || v === 4;

/**
 * The key ladders, as pitch classes (C = 0), every key on exactly one rung.
 * - Guitar, by where pentatonic position 1 sits on the neck (user, 2026-11-19): A (frets 5 to 8), then G and E, then B
 *   and C, then D and F, then the rest. The same order as the pentatonic positions track (`Track.keys`, path.ts).
 * - Voice: C first, the key singers are taught in, then E, A and G, D and F, the rest (the guitar's old order).
 * - Theory & ear by sharps and flats, outward on the circle of fifths: C, then G and F, D and B♭, A and E♭, the rest.
 */
export const KEY_LADDERS: Record<Area, number[][]> = {
  guitar: [[9], [7, 4], [11, 0], [2, 5], [6, 10, 8, 1, 3]],
  voice: [[0], [4], [9, 7], [2, 5], [10, 3, 11, 6, 8, 1]],
  theory: [[0], [7, 5], [2, 10], [9, 3], [4, 8, 11, 1, 6]],
};

/**
 * The rung a player with no answer about keys stands on, from their level in the area. A level does not go through
 * every key: a new player and a beginner have the first key only, and each level after adds one rung. The last two
 * rungs are reached only by the answer to the keys question ("Most keys", "Any key").
 */
export const RUNG_OF_LEVEL: Record<Level, KeyRung> = { new: 0, beginner: 0, intermediate: 1, advanced: 2 };

/** The rung in an area: the answer to the keys question when there is one, else from the area's level. */
export const keyRung = (answered: KeyRung | undefined, level: Level): KeyRung => answered ?? RUNG_OF_LEVEL[level];

/** A player's keys in an area: `now`, the keys of their rung, and `back`, the keys of the rungs below, nearest rung first. */
export interface PlayerKeys {
  now: number[];
  back: number[];
}

export function keysAt(area: Area, rung: KeyRung): PlayerKeys {
  const ladder = KEY_LADDERS[area];
  return { now: [...ladder[rung]], back: ladder.slice(0, rung).reverse().flat() };
}

/** The most keys of each kind one exercise offers: the Key selector stays a short row. */
export const MAX_NOW = 3;
export const MAX_BACK = 3;

/**
 * The keys one exercise offers: at most `MAX_NOW` of the rung's keys (a rung with more takes a different three by
 * `turn`, so over the days every key comes round) and the `MAX_BACK` nearest keys to go back to.
 */
export function exerciseKeys(area: Area, rung: KeyRung, turn = 0): PlayerKeys {
  const { now, back } = keysAt(area, rung);
  const from = now.length > MAX_NOW ? ((turn % now.length) + now.length) % now.length : 0;
  return { now: [...now.slice(from), ...now.slice(0, from)].slice(0, MAX_NOW), back: back.slice(0, MAX_BACK) };
}

const isPc = (n: unknown): n is number => typeof n === "number" && Number.isInteger(n) && n >= 0 && n < 12;

/** Stored keys made safe: pitch classes, each once, at least one `now`; anything else is null. */
export function cleanKeys(raw: unknown): PlayerKeys | null {
  if (!raw || typeof raw !== "object") return null;
  const { now, back } = raw as Record<string, unknown>;
  if (!Array.isArray(now)) return null;
  const seen = new Set<number>();
  const once = (list: unknown[]) => list.filter((k): k is number => isPc(k) && !seen.has(k) && !!seen.add(k));
  const n = once(now);
  const b = once(Array.isArray(back) ? back : []);
  return n.length ? { now: n, back: b } : null;
}

/** A choice whose chips set a key and nothing else: the Key selector. Only this one follows the player's keys. */
const isKeySelector = (c: Choice | undefined): c is Extract<Choice, { options: unknown }> => !!c && !isOpen(c) && partsOf(c).length === 1 && partsOf(c)[0] === "key";
const setsKey = (c: Choice | undefined): boolean => !!c && partsOf(c).includes("key");

/** Whether the block has a Key selector, on the block or on a section: only such a block follows the player's keys. */
export function hasKeySelector(block: Pick<Block, "choice" | "cells">): boolean {
  return isKeySelector(block.choice) || block.cells.some((c) => c.type === "section" && isKeySelector(c.choice));
}

/** The selector with the player's keys, its `now` keys first and `back` saying where the keys to go back to start. */
function selector(c: Extract<Choice, { options: unknown }>, keys: PlayerKeys): Choice {
  const options = [...keys.now, ...keys.back].map((key) => ({ key }));
  return { ...(c.label ? { label: c.label } : {}), options, ...(keys.back.length ? { back: keys.now.length } : {}) };
}

/** Cells written in a selector's first key, moved to the player's first key (a tool with only chord names moves by the distance). */
function moved<T extends Cell>(cells: T[], c: Extract<Choice, { options: unknown }>, keys: PlayerKeys): T[] {
  return applyChoice(cells, { options: [c.options[0], { key: keys.now[0] }] }, 1);
}

/**
 * A block with the player's keys in every Key selector it has (the block's, a section's): the chips become the player's
 * keys, `now` first and `back` at the end, and the tools under the selector are moved to the first of them, since tools
 * are written in option 1. Text stays: a block with a Key selector is written to be read in any key. A choice that
 * sets more than a key (a stage with a key and a tempo) is left as it was written, and so is a block with no selector.
 * Done when the block is drawn, never stored: a block's id is of the block as written.
 */
export function withKeys<B extends Pick<Block, "choice" | "cells">>(block: B, keys: PlayerKeys | null | undefined): B {
  if (!keys || !keys.now.length || !hasKeySelector(block)) return block;
  const top = isKeySelector(block.choice) ? block.choice : null;
  const cells = block.cells.map((c): Cell => {
    if (c.type !== "section") return top ? moved([c], top, keys)[0] : c;
    if (isKeySelector(c.choice)) return { ...c, choice: selector(c.choice, keys), cells: moved(c.cells as PlainCell[], c.choice, keys) };
    // a section whose own choice sets the key keeps it; any other section's tools follow the block's selector
    return top && !setsKey(c.choice) ? { ...c, cells: moved(c.cells as PlainCell[], top, keys) } : c;
  });
  return { ...block, ...(top ? { choice: selector(top, keys) } : {}), cells };
}
