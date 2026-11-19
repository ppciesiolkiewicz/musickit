import assert from "node:assert/strict";
import test from "node:test";
import { AREAS } from "./concepts";
import { KEY_LADDERS, KEY_RUNGS, MAX_BACK, MAX_NOW, cleanKeys, exerciseKeys, hasKeySelector, homeChoices, homeKeyOf, homeLadder, keyRung, keysAt, withKeys } from "./keys";
import type { Cell, PlanTool } from "./tools";
import type { Block } from "./types";

const E = 4, G = 7, A = 9, B = 11, C = 0, D = 2;

test("every area's ladder has five rungs and holds each of the twelve keys once", () => {
  for (const { id } of AREAS) {
    assert.equal(KEY_LADDERS[id].length, KEY_RUNGS.length, id);
    assert.deepEqual([...KEY_LADDERS[id].flat()].sort((a, b) => a - b), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], id);
  }
});

test("the first keys: A on guitar, C for the voice and for theory", () => {
  assert.deepEqual(KEY_LADDERS.guitar[0], [A]);
  assert.deepEqual(KEY_LADDERS.voice[0], [C]);
  assert.deepEqual(KEY_LADDERS.theory[0], [C]);
});

test("keysAt: the rung's keys now, the rungs below to go back to, nearest first", () => {
  assert.deepEqual(keysAt("guitar", 0), { now: [A], back: [] });
  assert.deepEqual(keysAt("guitar", 1), { now: [G, E], back: [A] });
  assert.deepEqual(keysAt("voice", 2), { now: [A, G], back: [E, C] }, "a singer on A and G still has E and C");
  assert.deepEqual(keysAt("guitar", 2), { now: [B, C], back: [G, E, A] });
});

test("keyRung: the answer when there is one, else from the area's level", () => {
  assert.equal(keyRung(undefined, "new"), 0);
  assert.equal(keyRung(undefined, "beginner"), 0, "a beginner has the first key only");
  assert.equal(keyRung(undefined, "intermediate"), 1, "then a rung is added a level");
  assert.equal(keyRung(undefined, "advanced"), 2);
  assert.equal(keyRung(0, "advanced"), 0);
  assert.equal(keyRung(4, "new"), 4);
});

test("exerciseKeys: a short row; a rung with many keys takes a different few by turn, and every key comes round", () => {
  const seen = new Set<number>();
  for (let turn = 0; turn < 12; turn++) {
    const k = exerciseKeys("guitar", 4, turn);
    assert.equal(k.now.length, MAX_NOW);
    assert.equal(k.back.length, MAX_BACK);
    assert.deepEqual(k.back, [D, 5, B], "the nearest keys below");
    k.now.forEach((x) => seen.add(x));
  }
  assert.deepEqual([...seen].sort((a, b) => a - b), [...KEY_LADDERS.guitar[4]].sort((a, b) => a - b));
  assert.deepEqual(exerciseKeys("guitar", 1, 7), { now: [G, E], back: [A] }, "a small rung is the same every turn");
});

test("cleanKeys: pitch classes, each once, at least one now", () => {
  assert.deepEqual(cleanKeys({ now: [9, 7, 9], back: [4, 7, 12, "x"] }), { now: [9, 7], back: [4] });
  assert.deepEqual(cleanKeys({ now: [0] }), { now: [0], back: [] });
  for (const bad of [null, 3, {}, { now: [] }, { now: [12] }, { back: [1] }]) assert.equal(cleanKeys(bad), null, JSON.stringify(bad));
});

const neck = (key: number): PlanTool => ({ type: "scale-neck", scale: "minor-pentatonic", key } as PlanTool);
const strum = (...chords: string[]): PlanTool => ({ type: "strum-along", chords } as unknown as PlanTool);
const tool = (t: PlanTool): Cell => ({ type: "tool", tool: t });
const text: Cell = { type: "text", text: "Play it in A." };
const keysOf = (b: Pick<Block, "choice">) => (b.choice && "options" in b.choice ? b.choice.options.map((o) => o.key) : null);
const toolKeys = (cells: Cell[]): unknown[] => cells.flatMap((c) => (c.type === "tool" ? [("key" in c.tool ? c.tool.key : (c.tool as { chords?: string[] }).chords)] : c.type === "section" ? toolKeys(c.cells) : []));

test("withKeys: the Key selector gets the player's keys, earlier ones last, and the tools move to the first", () => {
  const block: Block = { title: "Position 1", choice: { options: [{ key: A }, { key: G }, { key: C }] }, cells: [text, tool(neck(A)), tool(strum("Am", "G"))] };
  const out = withKeys(block, { now: [D, C], back: [A, G] });
  assert.deepEqual(keysOf(out), [D, C, A, G]);
  assert.equal(out.choice && "back" in out.choice ? out.choice.back : null, 2, "where the earlier keys start");
  assert.deepEqual(toolKeys(out.cells), [D, ["Dm", "C"]], "a tool with its own key lands on it; chord names move by the distance");
  assert.equal(out.cells[0], text, "text stays");
  assert.deepEqual(keysOf(block), [A, G, C], "the block as written is untouched");
});

test("withKeys: no earlier keys, no back mark", () => {
  const out = withKeys({ title: "t", choice: { options: [{ key: A }, { key: G }] }, cells: [tool(neck(A))] }, { now: [E], back: [] });
  assert.deepEqual(out.choice, { options: [{ key: E }] });
});

test("withKeys: a section's own Key selector is set too; a section with no choice follows the block's", () => {
  const block: Block = {
    title: "t",
    choice: { options: [{ key: A }, { key: G }] },
    cells: [
      { type: "section", heading: "Own keys", choice: { options: [{ key: C }, { key: D }] }, cells: [tool(neck(C))] },
      { type: "section", heading: "The block's", cells: [tool(neck(A))] },
      { type: "section", heading: "Stages", choice: { label: "stage", options: [{ key: A, bpm: 60 }, { key: G, bpm: 80 }] }, cells: [tool(neck(A))] },
    ] as Cell[],
  };
  const out = withKeys(block, { now: [E], back: [] });
  assert.deepEqual(toolKeys(out.cells), [E, E, A], "a stage that sets a key and a tempo keeps what it was written with");
  const own = out.cells[0];
  assert.deepEqual(own.type === "section" && own.choice, { options: [{ key: E }] });
});

test("withKeys: a block with no Key selector, an open choice, or no keys is left as it is", () => {
  const plain: Block = { title: "t", cells: [tool(neck(A))] };
  assert.equal(withKeys(plain, { now: [E], back: [] }), plain);
  const open: Block = { title: "t", choice: { open: { key: A } }, cells: [tool(neck(A))] };
  assert.equal(withKeys(open, { now: [E], back: [] }), open);
  const keyed: Block = { title: "t", choice: { options: [{ key: A }, { key: G }] }, cells: [tool(neck(A))] };
  assert.equal(withKeys(keyed, undefined), keyed);
  assert.equal(hasKeySelector(plain), false);
  assert.equal(hasKeySelector(keyed), true);
});

test("a home key picked under One key swaps places with the first key", () => {
  assert.deepEqual(homeChoices("guitar"), [A, G, E]);
  assert.deepEqual(keysAt("guitar", 0, E), { now: [E], back: [] });
  assert.deepEqual(keysAt("guitar", 1, E), { now: [G, A], back: [E] });
  assert.deepEqual(homeLadder(KEY_LADDERS.guitar, A), KEY_LADDERS.guitar);
  // a key further up the ladder is not a home key: the ladder stays
  assert.deepEqual(homeLadder(KEY_LADDERS.guitar, D), KEY_LADDERS.guitar);
  assert.equal(homeKeyOf({ keys: 0, homeKey: E }), E);
  assert.equal(homeKeyOf({ keys: 1, homeKey: E }), undefined);
});
