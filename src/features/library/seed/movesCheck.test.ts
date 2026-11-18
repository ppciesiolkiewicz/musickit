import { test } from "node:test";
import assert from "node:assert/strict";
import type { Cell, PlanTool } from "@/features/plan/model/tools";
import type { Block } from "@/features/plan/model/types";
import { movesProblems } from "./movesCheck";

const neck: Cell = { type: "tool", tool: { type: "scale-neck", scale: "minor-pentatonic", key: 9, boxes: [1] } as PlanTool };
const band: Cell = { type: "tool", tool: { type: "backing-band", bpm: 60, key: 9, parts: { click: "on" } } as PlanTool };
const section = (heading: string, more: object, ...cells: Cell[]): Cell => ({ type: "section", heading, ...more, cells } as Cell);

test("a choice that sets a key or a tempo is named, on the block and on a section", () => {
  const b: Block = { title: "t", choice: { options: [{ bpm: 60 }, { bpm: 80 }] }, cells: [band, section("Roots", { choice: { options: [{ key: 9 }, { key: 7 }] } }, neck)] };
  assert.deepEqual(movesProblems(b, "x"), [
    'x: the block\'s choice sets a key or a tempo; state "moves" on the exercise instead.',
    'x: the choice of "Roots" sets a key or a tempo; state "moves" on the exercise instead.',
  ]);
});

test("a choice for a position, a scale or a level, and an open choice, are fine", () => {
  const b: Block = { title: "t", choice: { open: { key: 9 } }, cells: [section("Two positions", { choice: { label: "variant", options: [{ position: 1 }, { position: 2 }] } }, neck), section("Scales", { choice: { options: [{ scale: "minor-pentatonic" }, { scale: "major-pentatonic" }] } }, neck)] };
  assert.deepEqual(movesProblems(b, "x"), []);
});

test("an exercise with moves may not mention a selector; one without may", () => {
  const cells: Cell[] = [{ type: "text", text: "Use the Position selector below." }, neck];
  assert.deepEqual(movesProblems({ title: "t", moves: { key: "any" }, cells }, "x"), ["x: the text mentions a selector, but an exercise with moves gets its selector and the line about it from the app."]);
  assert.deepEqual(movesProblems({ title: "t", cells }, "x"), []);
  assert.deepEqual(movesProblems({ title: "t", moves: { key: "any" }, cells: [section("Roots", {}, { type: "list", items: ["Then use the selector."] }, neck)] }, "x").length, 1);
  assert.deepEqual(movesProblems({ title: "{{=key}} run", moves: { key: "any" }, cells: [{ type: "text", text: "Play it at {{=bpm}}." }, neck] }, "x"), []);
});
