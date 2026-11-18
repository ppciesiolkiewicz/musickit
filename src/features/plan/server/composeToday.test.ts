import assert from "node:assert/strict";
import test from "node:test";
import { baseFixture, PLAYER_A, type LibraryData } from "@/features/library/server/fixture";
import { memoryLibraryRepo } from "@/features/library/server/repo.memory";
import { memoryUserDataRepo } from "@/features/userData/server/repo.memory";
import { putEntry, writeDoc } from "@/features/userData/server/data";
import { blockIdOf, blockKeyOf } from "../model/blockId";
import { startDay } from "../model/schedule";
import { ratePlan } from "../model/schedule";
import { EMPTY_STATE, type PlanExercise, type PlanState } from "../model/types";
import { composeToday } from "./composeToday";

const P = PLAYER_A;
const now = new Date("2026-11-18T10:00:00Z");
const answers = { areas: ["guitar"], topics: {}, minutes: 10, styles: "", notes: "" };
const state = (over: Partial<PlanState> = {}): PlanState => ({ ...EMPTY_STATE, answers: answers as PlanState["answers"], ...over });

const BLOCKS = ["b1", "b2", "b3", "b4", "b5", "b6", "b7", "b8"];
/** What the composer makes of a library block named `name` (see `lib`), without its slot ids. */
const exerciseOf = (name: string): PlanExercise =>
  ({ title: `Block ${name}`, cells: [{ type: "text", text: "Play it." }], minutes: 5, area: "guitar", topic: "guitar-basic-chords", concepts: [], steps: ["open-chords:1"], level: "beginner", tags: [] });
/** The library id of block `name`: the stored plan works the same one out from the exercise. */
const bid = (name: string): string => blockIdOf(blockKeyOf(exerciseOf(name)));
const nameOf = (id: string): string => BLOCKS.find((n) => bid(n) === id) ?? id;

/** Blocks on open-chords:1 (the first step of a fresh guitar player), each with a 5 minute slot. */
function lib(ids: string[], over: Partial<LibraryData["blocks"][number]> = {}): LibraryData {
  const d = baseFixture();
  d.blocks = ids.map((id) => ({
    id: bid(id), content: { title: `Block ${id}`, cells: [{ type: "text", text: "Play it." }] }, area: "guitar", topic: "guitar-basic-chords", concepts: [], level: "beginner", steps: ["open-chords:1"], tags: [],
    parentId: null, model: null, promptVersion: null, docsAgents: null, docsTeaching: null, createdAt: new Date("2026-01-01T00:00:00Z"),
    minutes: 5, why: null, learnBefore: null, exploreMore: null, ...over,
  }));
  d.owners = ids.map((id) => ({ userId: null, blockId: bid(id), source: "seed" as const, enabledForReuse: true, createdAt: new Date("2026-01-01T00:00:00Z") }));
  d.progress = [];
  return d;
}

async function setup(s: PlanState | null, data: LibraryData) {
  const userData = memoryUserDataRepo();
  if (s) await writeDoc(userData, P, "plan", s, now);
  return { library: memoryLibraryRepo(data), userData, today: () => "2026-11-18" };
}
const ids = (a: Awaited<ReturnType<typeof composeToday>>) => (a.ok ? a.day.exercises.map((e) => nameOf(e.blockId!)) : []);

test("no stored answers: no-answers", async () => {
  const d = await setup(null, lib(BLOCKS));
  assert.deepEqual(await composeToday(d, P, { date: "2026-11-18", another: false }), { ok: false, code: "no-answers" });
});

test("a date that is not yyyy-mm-dd, not real, or more than a day from today: bad-date; a day either side is taken", async () => {
  const d = await setup(state(), lib(BLOCKS));
  for (const date of ["2026-11-8", "tomorrow", "2026-02-30", "2026-11-20", "2026-11-16", "2026-11-18T00:00"])
    assert.deepEqual(await composeToday(d, P, { date, another: false }), { ok: false, code: "bad-date" }, date);
  for (const date of ["2026-11-17", "2026-11-18", "2026-11-19"]) assert.equal((await composeToday(d, P, { date, another: false })).ok, true, date);
});

test("no blocks of the areas, or none with a slot or a step: no-blocks", async () => {
  assert.deepEqual(await composeToday(await setup(state(), lib([])), P, { date: "2026-11-18", another: false }), { ok: false, code: "no-blocks" });
  const noSlot = await setup(state(), lib(BLOCKS, { minutes: null, why: null, learnBefore: null, exploreMore: null }));
  assert.deepEqual(await composeToday(noSlot, P, { date: "2026-11-18", another: false }), { ok: false, code: "no-blocks" });
  const ear = await setup(state(), lib(BLOCKS, { area: "ear" }));
  assert.deepEqual(await composeToday(ear, P, { date: "2026-11-18", another: false }), { ok: false, code: "no-blocks" });
});

test("a candidate's exercise has the block id the stored plan computes from it", async () => {
  const extra = { why: "Warm up.", learnBefore: ["/course/3/x"], exploreMore: ["/course/4/y"], tags: ["slow"], concepts: ["pentatonic"] };
  const d = lib(["x"], extra);
  const probe = await composeToday(await setup(state(), d), P, { date: "2026-11-18", another: false });
  assert.ok(probe.ok);
  const e = probe.day.exercises[0];
  assert.equal(e.minutes, 5);
  assert.equal(e.why, "Warm up.");
  assert.deepEqual([e.area, e.topic, e.level, e.steps, e.tags, e.concepts], ["guitar", "guitar-basic-chords", "beginner", ["open-chords:1"], ["slow"], ["pentatonic"]]);
  assert.deepEqual([e.learnBefore, e.exploreMore], [["/course/3/x"], ["/course/4/y"]]);
  // the library's id for this block is the hash of the exercise as stored; with that id the exercise comes back with it
  const id = blockIdOf(blockKeyOf(e));
  d.blocks[0].id = id;
  d.owners[0].blockId = id;
  const r = await composeToday(await setup(state(), d), P, { date: "2026-11-18", another: false });
  assert.ok(r.ok);
  assert.equal(r.day.exercises[0].blockId, id);
  assert.equal(blockIdOf(blockKeyOf(r.day.exercises[0])), id);
});

/** A composed day of `date` holding the blocks `ids`, as the page stores it. */
function dayOf(s: PlanState, date: string, bs: string[], attempt = 0): PlanState {
  const exercises = bs.map(exerciseOf);
  let n = 0;
  return startDay(s, { exercises, steps: [], short: false }, { date, attempt }, () => `id${date}${n++}`);
}

test("first call of a day: attempt 0, yesterday is the newest own day before the date, keep and declined empty", async () => {
  // yesterday held b1 and b2 in current; the day before that (history) held b3 and b4
  let s = dayOf(state(), "2026-11-16", ["b3", "b4"]);
  s = dayOf(s, "2026-11-17", ["b1", "b2"]);
  const d = await setup(s, lib(BLOCKS));
  const a = await composeToday(d, P, { date: "2026-11-18", another: false });
  assert.ok(a.ok);
  assert.equal(a.attempt, 0);
  assert.equal(a.date, "2026-11-18");
  assert.equal(a.day.exercises.length, 2);
  for (const id of ids(a)) assert.ok(!["b1", "b2"].includes(id), id);
  // a day that is today's own, not before it, is not yesterday; another:true with no plan for the date is a first call
  const b = await composeToday(d, P, { date: "2026-11-18", another: true });
  assert.ok(b.ok);
  assert.equal(b.attempt, 0);
  assert.deepEqual(ids(b), ids(a));
});

test("yesterday is read from history when current is an older composed day than the newest", async () => {
  // current is a composed day of 2026-11-17 and history has 2026-11-16: only b1, b2 are barred
  let s = dayOf(state(), "2026-11-16", ["b3", "b4"]);
  s = dayOf(s, "2026-11-17", ["b1", "b2"]);
  const a = await composeToday(await setup(s, lib(["b1", "b2", "b3", "b4"])), P, { date: "2026-11-18", another: false });
  assert.ok(a.ok);
  assert.deepEqual(ids(a).sort(), ["b3", "b4"]);
});

test("another: attempt + 1, rated exercises kept as stored, unrated ones declined with the stored declined ids", async () => {
  let s = dayOf(state(), "2026-11-18", ["b1", "b2", "b3"], 1);
  s = { ...s, current: { ...s.current!, composed: { attempt: 1, declined: [bid("b8")], short: false } } };
  s = { ...s, current: ratePlan(s.current!, 0, 1, 4, "2026-11-18T09:00:00Z") };
  const kept = s.current!.config.days[0].exercises[1];
  const d = await setup(s, lib(["b1", "b2", "b3", "b4", "b8"]));
  const a = await composeToday(d, P, { date: "2026-11-18", another: true });
  assert.ok(a.ok);
  assert.equal(a.attempt, 2);
  assert.deepEqual(a.day.exercises[0], kept);
  // b2 is kept; b1 and b3 (unrated) and b8 (declined before) are never picked again: only b4 is left
  assert.deepEqual(ids(a), ["b2", "b4"]);
});

test("another with every exercise rated and nothing new: ok with the kept exercises; nothing kept and nothing found: no-blocks", async () => {
  let s = dayOf(state(), "2026-11-18", ["b1", "b2"]);
  s = { ...s, current: ratePlan(ratePlan(s.current!, 0, 0, 5, "2026-11-18T09:00:00Z"), 0, 1, 2, "2026-11-18T09:01:00Z") };
  const a = await composeToday(await setup(s, lib(["b1", "b2"])), P, { date: "2026-11-18", another: true });
  assert.ok(a.ok);
  assert.deepEqual(ids(a), ["b1", "b2"]);
  // nothing rated: both go to declined, the library has no others
  const u = dayOf(state(), "2026-11-18", ["b1", "b2"]);
  assert.deepEqual(await composeToday(await setup(u, lib(["b1", "b2"])), P, { date: "2026-11-18", another: true }), { ok: false, code: "no-blocks" });
});

test("a given plan is never read as yesterday or today", async () => {
  const given = dayOf(state(), "2026-11-17", ["b1", "b2"]).current!;
  const todays = dayOf(state(), "2026-11-18", ["b1", "b2"]).current!;
  const s = state({ given: [given, todays] });
  const a = await composeToday(await setup(s, lib(["b1", "b2"])), P, { date: "2026-11-18", another: false });
  assert.ok(a.ok);
  assert.deepEqual(ids(a).sort(), ["b1", "b2"]);
  const b = await composeToday(await setup(s, lib(["b1", "b2"])), P, { date: "2026-11-18", another: true });
  assert.ok(b.ok);
  assert.equal(b.attempt, 0);
  assert.deepEqual(ids(b).sort(), ["b1", "b2"]);
});

test("ratings that reach beginner in a topic raise its level for the composer: its next step is fresh, not only open", async () => {
  // basic chords answered new; every concept of the topic rated solid at its last beginner step yesterday
  const rated: [string, string][] = [["open-chords", "open-chords:7"], ["strumming", "strumming:3"], ["power-chords", "power-chords:3"]];
  const s = state({ answers: { ...answers, topics: { "guitar-basic-chords": 0 }, minutes: 5 } as PlanState["answers"] });
  // x on open-chords:8 (fresh at beginner's cap of two, only open at new's), y on guitar-melodies:1 (open either way, and first)
  const data = lib(["x", "y"]);
  data.blocks[0].steps = ["open-chords:8"];
  data.blocks[1].steps = ["guitar-melodies:1"];
  const plain = await setup(s, data);
  const titles = (a: Awaited<ReturnType<typeof composeToday>>) => (a.ok ? a.day.exercises.map((e) => e.title) : []);
  assert.deepEqual(titles(await composeToday(plain, P, { date: "2026-11-18", another: false })), ["Block y"], "without ratings: the open steps' order");
  const d = await setup(s, data);
  for (const [concept, step] of rated) {
    assert.ok(await putEntry(d.userData, P, { id: concept, planId: "p", exerciseId: concept, day: 0, exercise: 0, title: concept, topic: "guitar-basic-chords", concepts: [concept], steps: [step], stars: 5, at: "2026-11-17T10:00:00.000Z" }, now));
  }
  assert.deepEqual(titles(await composeToday(d, P, { date: "2026-11-18", another: false })), ["Block x"]);
});
