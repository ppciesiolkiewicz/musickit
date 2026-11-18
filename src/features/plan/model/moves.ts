import { follows, isOpen, partsOf } from "./choice";
import { cleanKeys, hasKeySelector, type PlayerKeys } from "./keys";
import { canFollowPart, type Choice, type PlanTool } from "./tools";
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

/** Whether a tool can be moved by a part at all (not looking at `pinned`): for a host that lists a block's movable tools. */
export const canMove = (tool: PlanTool, part: MovePart): boolean => canFollowPart(tool, part);
