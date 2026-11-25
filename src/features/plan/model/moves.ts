import { keyName } from "@/features/theory/keySlug";
import { applyPart, follows, isOpen, partsOf } from "./choice";
import { cleanKeys, hasKeySelector, type PlayerKeys } from "./keys";
import { writtenKeyOf } from "./transpose";
import { numeralChord } from "@/features/exercises/shapes/numerals";
import { toolsOf, type Cell, type Choice, type PlainCell, type PlanTool } from "./tools";
import type { Block } from "./types";

/*
 * What may change about a block, and the version one player gets (ChoiceSplit,
 * docs/superpowers/specs/2026-11-18-choice-split-design.md). A block states its `moves`: it can be played in any key,
 * and in a range of tempos. The composer rolls a version for each exercise it picks (model/roll.ts) and stores the
 * values on the slot as `given`; the reader draws the block with them (`applyGiven`). `moves` is part of what the block
 * is (its id); `given` is the slot's, like the minutes. Pure.
 */

/** The parts of a block that can move in this build. */
export type MovePart = "key" | "bpm";
export const MOVE_PARTS: MovePart[] = ["key", "bpm"];

export interface Moves {
  /** the block can be played in any key; absent: its key is the lesson */
  key?: "any";
  /** the tempos it makes sense in; `from` is where a first play starts, and what the block's first tool with a tempo is written at */
  bpm?: { from: number; to: number; step: number };
}

/** One value now and the earlier ones kept from before, nearest first. */
export interface Stepped { now: number; back: number[] }

/** The version an exercise is played in: the slot's. Absent parts are as the block is written. */
export interface Given {
  keys?: PlayerKeys;
  bpm?: Stepped;
  /** how many moves this version is from the first-play one; absent: none */
  moved?: number;
}

/** The earlier tempos a version keeps as chips. */
export const MAX_BPM_BACK = 2;

const whole = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v);

/** The tempo the block's first tool that follows a tempo is written at; null when it has none. */
export function writtenBpm(tools: PlanTool[]): number | null {
  for (const t of tools) if (follows(t, "bpm") && "bpm" in t && typeof t.bpm === "number") return t.bpm;
  return null;
}

/**
 * A block's `moves` read from the AI's or a seed file's JSON, against the block's tools. What it can't read or the
 * tools can't do is left out and named in `warnings` (worded to be pasted back); `from` follows the tools as written.
 */
export function parseMoves(raw: unknown, tools: PlanTool[]): { moves: Moves | null; warnings: string[] } {
  const warnings: string[] = [];
  if (raw === undefined || raw === null) return { moves: null, warnings };
  if (typeof raw !== "object" || Array.isArray(raw)) return { moves: null, warnings: ["moves: left out (it is not an object)."] };
  const o = raw as Record<string, unknown>;
  const out: Moves = {};
  for (const k of Object.keys(o)) if (!(MOVE_PARTS as string[]).includes(k)) warnings.push(`moves: left out ${k} (only key and bpm can move).`);
  if (o.key !== undefined) {
    if (o.key !== "any") warnings.push('moves: left out key (write "any", or leave it out).');
    else if (!tools.some((t) => follows(t, "key"))) warnings.push("moves: no tool that can change key.");
    else if (!tools.some((t) => follows(t, "key") && writtenKeyOf(t) !== null)) warnings.push("moves: left out key (no tool says the key it is written in; give the play-along's shape a key).");
    else out.key = "any";
  }
  if (o.bpm !== undefined) {
    const b = (o.bpm && typeof o.bpm === "object" ? o.bpm : {}) as Record<string, unknown>;
    const at = writtenBpm(tools);
    if (!whole(b.from) || !whole(b.to) || !whole(b.step) || b.step < 1 || b.to < b.from) warnings.push("moves: left out bpm (it needs from, to at or above from, and a step of 1 or more).");
    else if (at === null) warnings.push("moves: no tool with a tempo.");
    else {
      if (b.from !== at) warnings.push(`moves: bpm starts at ${b.from} but the first tool with a tempo is at ${at}.`);
      out.bpm = { from: at, to: Math.max(at, b.to), step: b.step };
    }
  }
  return { moves: out.key || out.bpm ? out : null, warnings };
}

/** Whether a choice with chips sets a part the block's moves set: such a choice is left out of a block with moves. */
export function clashes(choice: Choice | undefined, moves: Moves | undefined): boolean {
  if (!choice || !moves || isOpen(choice)) return false;
  return partsOf(choice).some((p) => (p === "key" && !!moves.key) || (p === "bpm" && !!moves.bpm));
}

function cleanStepped(raw: unknown, ok: (n: number) => boolean, max: number): Stepped | null {
  if (!raw || typeof raw !== "object") return null;
  const { now, back } = raw as Record<string, unknown>;
  if (!whole(now) || !ok(now)) return null;
  const seen = new Set<number>([now]);
  const kept = (Array.isArray(back) ? back : []).filter((n): n is number => whole(n) && ok(n) && !seen.has(n) && !!seen.add(n));
  return { now, back: kept.slice(0, max) };
}

/**
 * A stored `given` made safe against the block it is for: keys only for a block that can change key (or, in the old
 * shape, one with a Key selector), a tempo only inside the block's range, `moved` a whole number above 0. Null when
 * nothing is left.
 */
export function cleanGiven(raw: unknown, block: Pick<Block, "moves" | "choice" | "cells">): Given | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const { moves } = block;
  const out: Given = {};
  const keys = moves ? (moves.key ? cleanKeys(o.keys) : null) : hasKeySelector(block) ? cleanKeys(o.keys) : null;
  if (keys) out.keys = keys;
  const range = moves?.bpm;
  const bpm = range ? cleanStepped(o.bpm, (n) => n >= range.from && n <= range.to, MAX_BPM_BACK) : null;
  if (bpm) out.bpm = bpm;
  if (!out.keys && !out.bpm) return null;
  if (whole(o.moved) && o.moved > 0) out.moved = o.moved;
  return out;
}

/** The key and tempo a block is written in: those of its first tools that follow each (a play-along's key is its shape's, `writtenKeyOf`). */
export function written(block: Pick<Block, "cells">): { key: number | null; bpm: number | null } {
  const tools = toolsOf(block.cells);
  const keyed = tools.find((t) => follows(t, "key") && writtenKeyOf(t) !== null);
  return { key: keyed ? writtenKeyOf(keyed) : null, bpm: writtenBpm(tools) };
}

/** The chips of one part: its values, `now` first; `back` is where the earlier ones start (`values.length` when there are none). */
export interface Selector { part: MovePart; values: number[]; back: number }
/** Where each selector stands, as an index into its values; absent: the first. */
export type At = Partial<Record<MovePart, number>>;

/** The selectors a version draws, in `MOVE_PARTS` order: only a part the block moves and that has more than one value. */
export function selectorsOf(block: Pick<Block, "moves">, given: Given | null | undefined): Selector[] {
  const { moves } = block;
  if (!moves || !given) return [];
  const out: Selector[] = [];
  if (moves.key && given.keys) out.push({ part: "key", values: [...given.keys.now, ...given.keys.back], back: given.keys.now.length });
  if (moves.bpm && given.bpm) out.push({ part: "bpm", values: [given.bpm.now, ...given.bpm.back], back: 1 });
  return out.filter((s) => s.values.length > 1);
}

/** The tempos a moved tool may land on (the widest range a tool's parser takes). */
const MIN_TOOL_BPM = 30, MAX_TOOL_BPM = 240;

const PARAM = /\{\{[=?](key|bpm)\}\}/g;
/** A line that opens with `{{?key}}` or `{{?bpm}}`: it is about what that selector changes, so it is drawn only when the selector is. */
const WHEN = /^\s*\{\{\?(key|bpm)\}\}\s*/;
/** Text with its `{{?part}}` lines kept (the mark taken off) for the parts in `shown`, and left out for the rest. */
export const whenLines = (text: string, shown: ReadonlySet<MovePart>): string =>
  !text.includes("{{?") ? text : text.split("\n").flatMap((line) => {
    const m = WHEN.exec(line);
    return !m ? [line] : shown.has(m[1] as MovePart) ? [line.slice(m[0].length)] : [];
  }).join("\n");
/** Text with its params filled; a param with no value is left out with the space before it. */
const fillParams = (text: string, values: Record<MovePart, string | null>): string =>
  text.includes("{{=") ? text.replace(/ ?\{\{=(key|bpm)\}\}/g, (m, p: MovePart) => (values[p] === null ? "" : `${m.startsWith(" ") ? " " : ""}${values[p]}`)) : text;

const CHORD_PARAM = /\{\{chord:\s*([^{}\s]+)\}\}/g;
/** A title or heading with its `{{chord:ii7}}` tokens as plain chord names in `key` (B♭m7); no key: as it was. Text keeps its tokens: the reader draws them with a card. */
const fillChords = (text: string, key: number | null): string =>
  key === null || !text.includes("{{chord:") ? text : text.replace(CHORD_PARAM, (m, n: string) => numeralChord(n, key)?.replace(/^([A-G])b/, "$1♭").replace(/^([A-G])#/, "$1♯") ?? m);

/**
 * A block drawn in a version: every tool that follows a part moved to the value its selector is at (`at`; no selector:
 * the given `now`, or the block as written), by the distance from the block's written key or its starting tempo, and
 * the params in the title, headings, text and lists (`{{=key}}`, `{{=bpm}}`) filled with those values, and the chords
 * in the title and headings (`{{chord:ii7}}`) named in the key. A tool keeps its
 * own value for a part in `pinned`. A line of text that opens with `{{?key}}` or `{{?bpm}}` is drawn only when that part
 * has a selector (`selectorsOf`: the version holds more than one value), with the mark taken off. A block with no
 * `moves` is returned as it is, less any such line. Never stored: drawn each time.
 */
export function applyGiven<B extends Pick<Block, "title" | "moves" | "cells">>(block: B, given: Given | null | undefined, at: At = {}): B {
  const { moves } = block;
  const shown = new Set(selectorsOf(block, given).map((s) => s.part));
  const fill = (text: string, values: Record<MovePart, string | null>): string => fillParams(whenLines(text, shown), values);
  if (!moves) {
    const texts = (c: PlainCell): string[] => (c.type === "text" ? [c.text] : c.type === "list" ? c.items : []);
    if (!block.cells.some((c) => (c.type === "section" ? c.cells.flatMap(texts) : texts(c)).some((t) => t.includes("{{?")))) return block;
    const bare = <T extends PlainCell>(c: T): T => (c.type === "text" ? { ...c, text: whenLines(c.text, shown) } : c.type === "list" ? { ...c, items: c.items.map((i) => whenLines(i, shown)) } : c);
    return { ...block, cells: block.cells.map((c): Cell => (c.type === "section" ? { ...c, cells: c.cells.map(bare) } : bare(c))) };
  }
  const from = written(block);
  const pick = (values: number[] | undefined, part: MovePart): number | null => (values?.length ? (values[at[part] ?? 0] ?? values[0]) : null);
  const key = (moves.key && given?.keys ? pick([...given.keys.now, ...given.keys.back], "key") : null) ?? from.key;
  const bpm = (moves.bpm && given?.bpm ? pick([given.bpm.now, ...given.bpm.back], "bpm") : null) ?? from.bpm;
  const byKey = key !== null && from.key !== null ? key - from.key : 0;
  const byBpm = bpm !== null && moves.bpm ? bpm - moves.bpm.from : 0;
  const values: Record<MovePart, string | null> = { key: key === null ? null : keyName(key), bpm: bpm === null ? null : String(bpm) };
  const move = (tool: PlanTool): PlanTool => {
    let out = tool;
    if (byKey && follows(out, "key")) {
      const own = writtenKeyOf(out) ?? from.key!;
      out = applyPart(out, "key", own + byKey, own);
    }
    if (byBpm && follows(out, "bpm") && "bpm" in out && typeof out.bpm === "number") out = applyPart(out, "bpm", Math.min(MAX_TOOL_BPM, Math.max(MIN_TOOL_BPM, out.bpm + byBpm)), out.bpm);
    return out;
  };
  const plain = <T extends PlainCell>(c: T): T => {
    if (c.type === "tool") {
      const tool = move(c.tool);
      return tool === c.tool ? c : { ...c, tool };
    }
    if (c.type === "text") return { ...c, text: fill(c.text, values) };
    if (c.type === "list") return { ...c, items: c.items.map((i) => fill(i, values)) };
    return c;
  };
  const cells = block.cells.map((c): Cell => (c.type === "section" ? { ...c, heading: fillChords(fill(c.heading, values), key), cells: c.cells.map(plain) } : plain(c)));
  return { ...block, title: fillChords(fill(block.title, values), key), cells };
}

/** An exercise's title as the player reads it: its params filled with the version it was given (the first of its keys, its tempo), or with the block as written. */
export const shownTitle = (e: Pick<Block, "title" | "moves" | "cells"> & { given?: Given }): string => (e.moves ? applyGiven(e, e.given).title : e.title);

const PARAM_WORD: Record<MovePart, string> = { key: "key", bpm: "tempo" };

/** What's wrong with a block's params: one that names a part the block has no move for, or a chord in a title or heading with no key to name it in. Worded to be pasted back. */
export function paramWarnings(block: Pick<Block, "title" | "moves" | "cells">): string[] {
  const texts = [block.title, ...block.cells.flatMap((c) => (c.type === "section" ? [c.heading, ...c.cells] : [c])).flatMap((c) => (typeof c === "string" ? [c] : c.type === "text" ? [c.text] : c.type === "list" ? c.items : []))];
  const named = new Set(texts.flatMap((t) => [...t.matchAll(PARAM)].map((m) => m[1] as MovePart)));
  const out = MOVE_PARTS.filter((p) => named.has(p) && !(p === "key" ? block.moves?.key : block.moves?.bpm)).map((p) => `text names {{=${p}}} or {{?${p}}} but the block has no ${PARAM_WORD[p]} move.`);
  const headings = [block.title, ...block.cells.flatMap((c) => (c.type === "section" ? [c.heading] : []))];
  if (!block.moves?.key && headings.some((h) => h.includes("{{chord:"))) out.push("a title or heading names {{chord:…}} but the block has no key move: name the chord in words there.");
  return out;
}

/**
 * The rated rows that count for a step: a play found hard (1 or 2 stars) in a version past the first one is left out,
 * as if it was not rated. It tilts the next roll of its block (model/roll.ts) and never pulls the step down. Every
 * other reader of the log sees the row as it is.
 */
export function scoringRows<T extends { stars: number; given?: { moved?: number } }>(rows: T[]): T[] {
  return rows.filter((r) => !(r.stars <= 2 && (r.given?.moved ?? 0) >= 1));
}
