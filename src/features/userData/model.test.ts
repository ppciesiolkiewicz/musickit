import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_LEVEL } from "@/features/guide/levels";
import { sanitiseState } from "@/features/plan/model/state";
import type { PlanState, StoredPlan } from "@/features/plan/model/types";
import { DOC_KINDS, MAX_PLAN_BYTES, isDocKind, maxDocBytes, parseDoc } from "./model";

test("parseDoc: a missing plan is the sanitised empty state", () => {
  assert.deepEqual(parseDoc("plan", null), sanitiseState(null));
});

test("parseDoc: about falls back piece by piece", () => {
  const a = parseDoc("about", { level: "nope", voice: 3 }) as { level: string; levelPages: object };
  assert.equal(a.level, DEFAULT_LEVEL);
  assert.deepEqual(a.levelPages, {});
  assert.equal("voice" in a, false, "the voice has its own table");
});

test("parseDoc: records fall back to zero, and an unset lip roll accuracy is null", () => {
  assert.deepEqual(parseDoc("records", { improv: { done: "x", best: 4 }, noteGameBest: -1 }), { improv: { done: 0, best: 4 }, noteGameBest: 0, lipRollAccuracy: null });
});

test("parseDoc: records keep only a lip roll accuracy the warm-up offers", () => {
  for (const cents of [25, 50, 100, 150]) assert.equal((parseDoc("records", { lipRollAccuracy: cents }) as { lipRollAccuracy: unknown }).lipRollAccuracy, cents);
  for (const cents of [0, 75, 200, "100", -25]) assert.equal((parseDoc("records", { lipRollAccuracy: cents }) as { lipRollAccuracy: unknown }).lipRollAccuracy, null);
});

test("parseDoc: every kind takes junk", () => {
  for (const k of DOC_KINDS) for (const raw of [null, 7, "x", [], {}]) assert.doesNotThrow(() => parseDoc(k, raw));
  assert.equal(parseDoc("note", null), null);
});

test("parseDoc: course notes take an object or a string", () => {
  const n = { "s1/a": { note: "hi" } };
  assert.deepEqual(parseDoc("course_notes", n), n);
  assert.deepEqual(parseDoc("course_notes", JSON.stringify(n)), n);
});

test("isDocKind", () => {
  assert.equal(isDocKind("looper"), false);
  assert.equal(isDocKind("plan"), true);
});

const week = (id: string, text = "x", extra: Partial<StoredPlan> = {}): StoredPlan => ({
  id,
  startedOn: "2026-11-01",
  done: {},
  config: { title: "W", days: Array.from({ length: 7 }, (_, d) => ({ theme: `T${d}`, exercises: [{ id: `${id}-${d}`, title: "Ex", minutes: 5, cells: [{ type: "text" as const, text }] }] })) },
  ...extra,
});

test("the plan's cap is 2 MB, the other kinds' 512 KB", () => {
  assert.equal(maxDocBytes("plan"), 2 * 1024 * 1024);
  assert.equal(maxDocBytes("note"), 512 * 1024);
});

test("parseDoc: a plan over its cap loses its oldest earlier plans until it fits, never the running plan or the newest", () => {
  const big = "x".repeat(600); // a text cell keeps 700 characters at most
  const fat = (id: string, extra: Partial<StoredPlan> = {}) => {
    const p = week(id, big, extra);
    // 7 days × 8 exercises × 5 texts of 600: about 170 KB a plan, so 21 are over 2 MB
    p.config.days = p.config.days.map((d, i) => ({ ...d, exercises: Array.from({ length: 8 }, (_, e) => ({ id: `${id}-${i}-${e}`, title: "Ex", minutes: 5, cells: Array.from({ length: 5 }, () => ({ type: "text" as const, text: big })) })) }));
    return p;
  };
  const raw = { current: fat("now"), history: [fat("claimed", { from: "share-1" }), ...Array.from({ length: 19 }, (_, i) => fat(`old${i}`))] };
  assert.ok(JSON.stringify(raw).length > MAX_PLAN_BYTES, "the test document is over the cap");
  const s = parseDoc("plan", raw) as PlanState;
  assert.ok(JSON.stringify(s).length <= MAX_PLAN_BYTES);
  assert.equal(s.current?.id, "now");
  assert.equal(s.history[0].id, "claimed");
  assert.equal(s.history[0].from, "share-1");
  assert.ok(s.history.length < 20);
  // what is kept is the newest: old0, old1, … in order, the cut ones all from the end
  assert.deepEqual(s.history.slice(1).map((p) => p.id), Array.from({ length: s.history.length - 1 }, (_, i) => `old${i}`));
});

test("parseDoc: a plan under its cap keeps its whole history", () => {
  const raw = { current: week("now"), history: Array.from({ length: 20 }, (_, i) => week(`old${i}`)) };
  assert.equal((parseDoc("plan", raw) as PlanState).history.length, 20);
});

test("parseDoc: a plan's cells go through the plan's parser: a staff with no key is dropped, the plan stays", () => {
  const p = week("now");
  const ex = p.config.days[0].exercises[0] as unknown as { cells: unknown[] };
  ex.cells = [{ type: "tool", tool: { type: "staff", scale: "major-ionian" } }, { type: "text", text: "Sing it." }, { type: "tool", tool: { type: "nope" } }, { type: "section", heading: "A", cells: [{ type: "tool", tool: { type: "staff" } }] }];
  const s = parseDoc("plan", { current: p, history: [] }) as PlanState;
  const cells = s.current!.config.days[0].exercises[0].cells;
  assert.equal(cells.some((c) => c.type === "tool"), false, "no broken tool survives");
  assert.ok(cells.some((c) => c.type === "text" && c.text === "Sing it."));
  const onlyBroken = week("b");
  (onlyBroken.config.days[0].exercises[0] as unknown as { cells: unknown[] }).cells = [{ type: "tool", tool: { type: "staff" } }];
  const t = parseDoc("plan", { current: onlyBroken, history: [] }) as PlanState;
  assert.deepEqual(t.current!.config.days[0].exercises[0].cells, [{ type: "text", text: "Ex" }], "an exercise with nothing left shows its title");
});

test("parseDoc: a plan's good staff cell reads back as it was", () => {
  const p = week("now");
  const staff = { type: "staff", scale: "major-ionian", key: 0, voice: "tenor" };
  (p.config.days[0].exercises[0] as unknown as { cells: unknown[] }).cells = [{ type: "tool", tool: staff }];
  const once = parseDoc("plan", { current: p, history: [] }) as PlanState;
  const tool = once.current!.config.days[0].exercises[0].cells[0];
  assert.equal(tool.type, "tool");
  assert.deepEqual(parseDoc("plan", JSON.parse(JSON.stringify(once))), once, "a parsed plan parses to itself");
});
