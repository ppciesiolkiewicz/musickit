import { test } from "node:test";
import assert from "node:assert/strict";
import { parseTool, TOOLS } from "@/features/plan/model/tools";
import { KEYWORDS, matchesQuery, storyGroups } from "./stories";

const groups = storyGroups();

test("every tool has a story, the play-along one per shape", () => {
  const tools = new Set(groups.map((g) => g.tool));
  for (const t of Object.keys(TOOLS)) assert.ok(tools.has(t as never), t);
  const shapes = groups.filter((g) => g.shape).map((g) => g.shape).sort();
  assert.deepEqual(shapes, ["arpeggio-part", "chord-steps", "interval", "melody", "progression", "riff", "solo-over", "two-scales"]);
});

test("every story with props parses, and has its docs", () => {
  for (const g of groups) {
    assert.ok(g.doc, `${g.id} has no doc`);
    if (g.shape) assert.ok(g.shapeDoc, `${g.id} has no shape doc`);
    for (const s of g.stories) {
      if (s.name === "Empty") continue;
      assert.ok(parseTool({ type: g.tool, ...s.props }), `${g.id}: ${s.name}`);
    }
  }
});

test("the same set-up shows once", () => {
  for (const g of groups) {
    const sigs = g.stories.map((s) => JSON.stringify(s.props));
    assert.equal(new Set(sigs).size, sigs.length, g.id);
  }
});

test("every group has keywords, and no keyword names a group that is gone", () => {
  for (const g of groups) assert.ok(g.keywords.length, `${g.id} has no keywords`);
  const ids = new Set(groups.map((g) => g.id));
  for (const id of Object.keys(KEYWORDS)) assert.ok(ids.has(id) || id === "guitar-play-along", id);
});

test("the filter matches every word anywhere", () => {
  const find = (q: string) => groups.filter((g) => matchesQuery([g.id, ...g.keywords].join(" "), q)).map((g) => g.id);
  assert.ok(find("sing interval").includes("interval-singer"));
  assert.ok(find("Interval  SING").includes("interval-singer"));
  assert.ok(find("ear training").includes("interval-ears"));
  assert.ok(!find("sing interval").includes("scale-neck"));
});

test("a stub is only a story: not a tool, not in the prompt, not in the seed", async () => {
  const { STUBS } = await import("./stubs");
  const { buildPrompt } = await import("@/features/plan/model/prompt");
  const { SEED_BLOCKS, SEED_PLANS } = await import("@/features/library/seed");
  const prompt = buildPrompt(null, []);
  const seed = JSON.stringify([...SEED_BLOCKS, ...SEED_PLANS]);
  const ids = new Set(groups.map((g) => g.id));
  for (const s of STUBS) {
    assert.ok(!(s.id in TOOLS), `${s.id} is a tool now: delete its stub`);
    assert.ok(!ids.has(s.id), `${s.id} has an AI tool story`);
    assert.ok(!prompt.includes(`"${s.id}"`), `${s.id} is in the prompt`);
    assert.ok(!seed.includes(`"type":"${s.id}"`), `${s.id} is in the seed`);
    assert.ok(s.stories.length && s.props.length, `${s.id} has stories and props`);
  }
});
