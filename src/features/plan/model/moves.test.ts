import { test } from "node:test";
import assert from "node:assert/strict";
import { blockIdOf, blockKeyOf } from "./blockId";
import { cleanExercise } from "./cleanExercise";
import { parseExercise } from "./config";
import { cleanGiven, parseMoves, type Moves } from "./moves";
import type { Cell, PlanTool } from "./tools";
import type { PlanExercise } from "./types";

const A = 9, G = 7;
const band = (bpm: number, key = A, more: Record<string, unknown> = {}): PlanTool => ({ type: "backing-band", bpm, key, parts: { click: "on" }, ...more }) as PlanTool;
const neck = (key = A, more: Record<string, unknown> = {}): PlanTool => ({ type: "scale-neck", scale: "minor-pentatonic", key, boxes: [1], ...more }) as PlanTool;
const tool = (t: PlanTool): Cell => ({ type: "tool", tool: t });
const BPM = { from: 60, to: 90, step: 10 };

// --- Task 1: parseMoves

test("parseMoves: a key and a tempo move that match the tools read with no warning", () => {
  const p = parseMoves({ key: "any", bpm: BPM }, [band(60), neck()]);
  assert.deepEqual(p, { moves: { key: "any", bpm: BPM }, warnings: [] });
});

test("parseMoves: absent is no moves and no warning", () => {
  assert.deepEqual(parseMoves(undefined, [band(60)]), { moves: null, warnings: [] });
});

test("parseMoves: bpm starts where the first tool with a tempo is written", () => {
  const p = parseMoves({ bpm: { from: 70, to: 90, step: 10 } }, [neck(), band(60), band(80)]);
  assert.deepEqual(p.moves, { bpm: BPM });
  assert.deepEqual(p.warnings, ["moves: bpm starts at 70 but the first tool with a tempo is at 60."]);
});

test("parseMoves: a part it can't read or use is dropped and named", () => {
  assert.deepEqual(parseMoves({ bpm: { from: 60, to: 50, step: 10 } }, [band(60)]), { moves: null, warnings: ["moves: left out bpm (it needs from, to at or above from, and a step of 1 or more)."] });
  assert.deepEqual(parseMoves({ bpm: { from: 60, to: 90, step: 0 } }, [band(60)]).moves, null);
  assert.deepEqual(parseMoves({ key: "fixed" }, [neck()]), { moves: null, warnings: ['moves: left out key (write "any", or leave it out).'] });
  assert.deepEqual(parseMoves({ key: "any", position: [1, 2] }, [neck()]), { moves: { key: "any" }, warnings: ["moves: left out position (only key and bpm can move)."] });
  assert.deepEqual(parseMoves({ key: "any" }, [{ type: "note-finder" } as PlanTool]), { moves: null, warnings: ["moves: no tool that can change key."] });
  assert.deepEqual(parseMoves({ bpm: BPM }, [neck()]), { moves: null, warnings: ["moves: no tool with a tempo."] });
});

// --- Task 1: cleanGiven

const block = (moves: Moves | undefined, cells: Cell[] = [tool(band(60)), tool(neck())]) => ({ title: "t", ...(moves ? { moves } : {}), cells });

test("cleanGiven: a part the block has no move for, or outside its range, is dropped", () => {
  assert.equal(cleanGiven({ keys: { now: [A], back: [] }, bpm: { now: 120, back: [60] } }, block({ bpm: BPM })), null);
  assert.deepEqual(cleanGiven({ keys: { now: [G, A], back: [] }, bpm: { now: 70, back: [60] } }, block({ key: "any", bpm: BPM })), { keys: { now: [G, A], back: [] }, bpm: { now: 70, back: [60] } });
});

test("cleanGiven: back holds earlier values once each, never now, at most two; moved is a whole number", () => {
  assert.deepEqual(cleanGiven({ bpm: { now: 90, back: [90, 80, 80, 70, 60, "x"] }, moved: 3 }, block({ bpm: BPM })), { bpm: { now: 90, back: [80, 70] }, moved: 3 });
  assert.deepEqual(cleanGiven({ bpm: { now: 70, back: [] }, moved: 1.5 }, block({ bpm: BPM })), { bpm: { now: 70, back: [] } });
  assert.deepEqual(cleanGiven({ bpm: { now: 70, back: [] }, moved: -1 }, block({ bpm: BPM })), { bpm: { now: 70, back: [] } });
  assert.equal(cleanGiven("x", block({ bpm: BPM })), null);
  assert.equal(cleanGiven({ bpm: { now: "70" } }, block({ bpm: BPM })), null);
});

test("cleanGiven: a block of the old shape keeps keys for its Key selector, and nothing else", () => {
  const old = { title: "t", cells: [{ type: "section", heading: "h", choice: { options: [{ key: A }, { key: G }] }, cells: [tool(neck())] } as Cell] };
  assert.deepEqual(cleanGiven({ keys: { now: [G], back: [A] }, bpm: { now: 70, back: [] } }, old), { keys: { now: [G], back: [A] } });
  assert.equal(cleanGiven({ keys: { now: [G], back: [] } }, block(undefined)), null);
});

// --- Task 1: the block id, the parser, the cleaner

const ex = (more: Partial<PlanExercise> = {}): PlanExercise => ({ title: "Run", minutes: 5, cells: [tool(band(60)), tool(neck())], ...more });

test("block id: moves are part of what a block is, given is not", () => {
  const id = (e: PlanExercise) => blockIdOf(blockKeyOf(e));
  assert.notEqual(id(ex()), id(ex({ moves: { bpm: BPM } })));
  assert.equal(id(ex({ moves: { bpm: BPM } })), id(ex({ moves: { bpm: BPM }, given: { bpm: { now: 70, back: [60] }, moved: 1 } })));
});

const raw = (more: Record<string, unknown> = {}) => ({
  title: "Run #guitar #beginner #technique", minutes: 3, learnBefore: ["/course/5/pentatonic"],
  cells: [{ type: "text", text: "Play." }, { type: "tool", tool: { type: "backing-band", bpm: 60, key: "a", parts: { click: "on" } } }, { type: "tool", tool: { type: "scale-neck", scale: "minor-pentatonic", key: "a", boxes: [1] } }],
  ...more,
});

test("parseExercise: reads moves, and says what it changed", () => {
  const p = parseExercise(raw({ moves: { key: "any", bpm: { from: 60, to: 90, step: 10 } } }), "Day 1", []);
  assert.deepEqual(p.block!.moves, { key: "any", bpm: BPM });
  assert.equal(p.warnings.filter((w) => w.includes("moves")).length, 0);
  const off = parseExercise(raw({ moves: { bpm: { from: 80, to: 90, step: 10 } } }), "Day 1", []);
  assert.ok(off.warnings.includes("Day 1: moves: bpm starts at 80 but the first tool with a tempo is at 60."));
  assert.equal(parseExercise(raw(), "Day 1", []).block!.moves, undefined);
});

test("parseExercise: a choice that sets a part the block's moves set is left out", () => {
  const p = parseExercise(raw({
    moves: { key: "any" },
    cells: [{ type: "section", heading: "Roots", choice: { options: [{ key: "a" }, { key: "g" }] }, cells: [{ type: "text", text: "Play." }, { type: "tool", tool: { type: "scale-neck", scale: "minor-pentatonic", key: "a", boxes: [1] } }] }],
  }), "Day 1", []);
  const section = p.block!.cells[0];
  assert.ok(section.type === "section" && section.choice === undefined);
  assert.ok(p.warnings.includes('Day 1: "Roots" has moves and a choice that sets the same part; the choice is left out.'));
});

test("cleanExercise: moves are read again and given is cleaned against them; an old keys field is dropped", () => {
  const stored = { ...ex({ moves: { bpm: BPM }, given: { bpm: { now: 70, back: [60] }, keys: { now: [G], back: [] } } }), keys: { now: [G], back: [] } } as PlanExercise;
  const out = cleanExercise(stored);
  assert.deepEqual(out.moves, { bpm: BPM });
  assert.deepEqual(out.given, { bpm: { now: 70, back: [60] } });
  assert.equal("keys" in out, false);
  assert.equal(cleanExercise(ex({ given: { bpm: { now: 70, back: [] } } })).given, undefined);
});
