import assert from "node:assert/strict";
import test from "node:test";
import { memoryUserDataRepo } from "@/features/userData/server/repo.memory";
import { PLAYER_A, baseFixture } from "./fixture";
import type { Deps } from "./query";
import { memoryLibraryRepo } from "./repo.memory";
import { LIBRARY_TOOLS, callTool } from "./tools";

const deps = (): Deps => ({ library: memoryLibraryRepo(baseFixture()), userData: memoryUserDataRepo(), today: () => "2026-11-15" });

test("every tool has a description and a closed object schema", () => {
  assert.deepEqual(LIBRARY_TOOLS.map((t) => t.name), ["find_blocks", "get_block", "find_plans", "get_plan", "library_coverage", "player_progress"]);
  for (const t of LIBRARY_TOOLS) {
    assert.ok(t.description.length > 0);
    const s = t.inputSchema as { type: string; additionalProperties: unknown; properties: Record<string, unknown> };
    assert.equal(s.type, "object");
    assert.equal(s.additionalProperties, false);
    for (const k of ["player", "planIds", "includeNotEnabled", "include_not_enabled"]) assert.ok(!(k in s.properties));
  }
});

test("each tool round-trips", async () => {
  const d = deps();
  const scope = { player: PLAYER_A };
  const blocks = await callTool(d, scope, "find_blocks", { topic: "guitar-scales", concepts: ["pentatonic"], order: "newest", limit: 5 });
  assert.ok(blocks.ok && Array.isArray(blocks.data) && (blocks.data as { id: string }[]).map((b) => b.id).join() === "S2,S1");
  const had = await callTool(d, scope, "find_blocks", { mine: "had" });
  assert.ok(had.ok && (had.data as unknown[]).length === 4);
  const block = await callTool(d, scope, "get_block", { id: "S1" });
  assert.ok(block.ok && (block.data as { id: string }).id === "S1");
  const plans = await callTool(d, scope, "find_plans", { areas: ["rhythm"] });
  assert.ok(plans.ok && (plans.data as { id: string }[]).map((p) => p.id).join() === "P2");
  const plan = await callTool(d, scope, "get_plan", { id: "P1", with_reply: true });
  assert.ok(plan.ok && (plan.data as { reply: string }).reply === "reply P1");
  const cov = await callTool(d, scope, "library_coverage", undefined);
  assert.ok(cov.ok && (cov.data as { topics: unknown[] }).topics.length > 0);
  const prog = await callTool(d, scope, "player_progress", {});
  assert.ok(prog.ok && (prog.data as { blocks: unknown[] }).blocks.length === 4);
});

test("bad arguments are errors that name the argument", async () => {
  const d = deps();
  const bad = async (name: string, args: unknown, word: string) => {
    const r = await callTool(d, {}, name, args);
    assert.ok(!r.ok, `${name} ${JSON.stringify(args)}`);
    assert.ok(r.error.includes(word), r.error);
  };
  await bad("find_blocks", { limit: "ten" }, "limit");
  await bad("find_blocks", { order: "best" }, "order");
  await bad("find_blocks", { concepts: "caged" }, "concepts");
  await bad("find_blocks", { colour: "red" }, "colour");
  await bad("find_blocks", { mine: "had" }, "mine");
  await bad("get_block", {}, "id");
  await bad("get_plan", { id: "P1", with_reply: "yes" }, "with_reply");
  await bad("find_blocks", [], "object");
  await bad("nope", {}, "nope");
  await bad("player_progress", {}, "player");
});

test("scope-like keys in the arguments change nothing", async () => {
  const d = deps();
  const plain = await callTool(d, {}, "find_blocks", {});
  const sneaky = await callTool(d, {}, "find_blocks", { player: PLAYER_A, planIds: ["P1"], includeNotEnabled: true, include_not_enabled: true });
  assert.deepEqual(sneaky, plain);
  const plans = await callTool(d, {}, "find_plans", { planIds: ["P1"], include_not_enabled: true });
  assert.deepEqual((plans as { data: { id: string }[] }).data.map((p) => p.id), ["P1", "P2", "P4"]);
  assert.ok(!(await callTool(d, {}, "get_plan", { id: "P3", includeNotEnabled: true })).ok);
  assert.ok(!(await callTool(d, {}, "player_progress", { player: PLAYER_A })).ok);
});

test("inherited and prototype keys are not arguments", async () => {
  const d = deps();
  const proto = await callTool(d, {}, "get_block", JSON.parse('{"__proto__":{"id":5}}'));
  assert.ok(!proto.ok);
  const proto2 = await callTool(d, {}, "find_blocks", JSON.parse('{"__proto__":{"mine":"x","limit":"9"}}'));
  assert.ok(!proto2.ok && proto2.error.includes("__proto__"));
  for (const [key, v] of [["constructor", 1], ["toString", "x"], ["hasOwnProperty", 1]] as const) {
    const r = await callTool(d, {}, "find_blocks", { [key]: v });
    assert.ok(!r.ok && r.error.includes(key), `${key}`);
  }
});

test("argument shapes: no arguments, wrong types, odd numbers", async () => {
  const d = deps();
  assert.ok((await callTool(d, {}, "find_blocks", null)).ok);
  assert.ok((await callTool(d, {}, "find_blocks", undefined)).ok);
  assert.ok(!(await callTool(d, {}, "find_blocks", "limit")).ok);
  assert.ok(!(await callTool(d, {}, "find_blocks", [{ limit: 1 }])).ok);
  const frac = await callTool(d, {}, "find_blocks", { limit: 1.5 });
  assert.ok(!frac.ok && frac.error.includes("limit"));
  const neg = await callTool(d, {}, "find_blocks", { limit: -5 });
  assert.ok(neg.ok && (neg.data as unknown[]).length === 1);
  const c = await callTool(d, {}, "find_blocks", { concepts: [1] });
  assert.ok(!c.ok && c.error.includes("concepts"));
  const n = await callTool(d, {}, "find_blocks", { topic: { a: 1 } });
  assert.ok(!n.ok && n.error.includes("topic"));
});
