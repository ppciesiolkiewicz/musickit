import assert from "node:assert/strict";
import { test } from "node:test";
import { SEED_BLOCKS } from "@/features/library/seed";
import { PATH, stepAt } from "@/features/plan/model/path";
import { blockCounts, blocksByStep, teaching } from "./stepBlocks";
import { blockHref } from "./stepHref";

const by = blocksByStep();

test("every step a seed block names is a real step, and the block is listed under it", () => {
  for (const f of SEED_BLOCKS) for (const ref of f.choices.flatMap((c) => c.steps)) {
    assert.ok(stepAt(ref), `${f.id} names ${ref}, which is no step`);
    assert.ok(by.get(ref)?.some((b) => b.id === f.id), `${f.id} is not listed under ${ref}`);
  }
});

/**
 * Steps no seed block practises yet. They were covered only by level matches until NEW17 gave the moved seed exercises
 * their real steps (2026-11-17); a new block for each is seed work (NEW10). Take a step off when a block names it.
 */
const KNOWN_GAPS = ["seventh-shapes:4", "sus-add9:4", "notes-on-neck:3", "notes-on-neck:4",
  // intervals on the neck (2026-11-22): the first blocks are for the octaves, the 5ths and 4ths, and one note up and down
  "intervals-on-neck:3", "intervals-on-neck:5", "intervals-on-neck:6",
  "range:4", "runs:8",
  // reading the staff (2026-11-22): the first blocks are for the lines, the spaces and the ledger lines
  "reading-staff:3", "reading-staff:5", "reading-staff:6"];

// a genre's block (a riff hung off the step) teaches no step, so it fills no gap
test("every step on the path has at least one block, but the known gaps", () => {
  const empty = PATH.flatMap((t) => t.steps.map((_, i) => `${t.id}:${i + 1}`)).filter((ref) => !teaching(by.get(ref)).length);
  assert.deepEqual(empty, KNOWN_GAPS);
});

test("a block is listed once per step, and the counts match the lists", () => {
  for (const [ref, list] of by) assert.equal(new Set(list.map((b) => b.id)).size, list.length, ref);
  const counts = blockCounts(by);
  for (const [ref, list] of by) assert.equal(counts[ref], teaching(list).length);
});

test("blockHref escapes the ref", () => {
  assert.equal(blockHref({ step: "barre:2" }), "/admin/content/block?step=barre%3A2");
  assert.equal(blockHref({ id: "a b" }), "/admin/content/block?id=a%20b");
});
