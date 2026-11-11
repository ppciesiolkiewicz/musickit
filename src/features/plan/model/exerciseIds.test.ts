import { test } from "node:test";
import assert from "node:assert/strict";
import { parsePlanConfig } from "./config";
import { withExerciseIds } from "./exerciseIds";
import { restartPlan, startPlan } from "./schedule";
import { PLAN_BACKUP_KEY, PLAN_KEY, localPlanStore, sanitiseState } from "../store/localPlanStore";
import { EMPTY_STATE, type PlanConfig, type StoredPlan } from "./types";

const tagged = (extra: Record<string, unknown> = {}) => ({ title: "Ex", minutes: 5, cells: [{ type: "text", text: "x" }], level: "beginner", area: "guitar", tags: ["technique"], topic: "guitar-caged", ...extra });
const reply = (ex: Record<string, unknown>, top: Record<string, unknown> = { progress: "CAGED: two shapes." }) =>
  JSON.stringify({ title: "W", ...top, days: Array.from({ length: 7 }, (_, i) => ({ theme: `T${i}`, exercises: [i === 0 ? ex : tagged()] })) });
/** The week-shape warnings these one-exercise, link-free fixtures always raise; not what these tests are about. */
const shape = (w: string) => !/^Day \d: \d+ exercises?; use /.test(w) && !w.endsWith(": no learnBefore link; add an attunr page to learn first.");
const parse = (ex: Record<string, unknown>, top?: Record<string, unknown>) => {
  const r = parsePlanConfig(reply(ex, top), []);
  assert.ok(r.ok);
  return { first: r.config.days[0].exercises[0], config: r.config, warnings: r.warnings.filter(shape) };
};
const counter = () => { let n = 0; return () => `id${++n}`; };

test("a known topic of the exercise's area is kept, with no warning", () => {
  const { first, warnings } = parse(tagged());
  assert.equal(first.topic, "guitar-caged");
  assert.deepEqual(warnings, []);
});

test("an unknown topic is dropped with a warning and the plan still parses", () => {
  const { first, warnings } = parse(tagged({ topic: "nope" }));
  assert.equal(first.topic, undefined);
  assert.ok(warnings.some((w) => /Day 1, exercise 1: unknown topic "nope"/.test(w)), warnings.join("|"));
});

test("a topic of another area is dropped with a warning", () => {
  const { first, warnings } = parse(tagged({ topic: "voice-pitch" }));
  assert.equal(first.topic, undefined);
  assert.ok(warnings.some((w) => /topic "voice-pitch" is not a guitar topic/.test(w)), warnings.join("|"));
});

test("an exercise with no topic is named in the untagged warning", () => {
  const { warnings } = parse(tagged({ topic: undefined }));
  assert.ok(warnings.some((w) => /Day 1, exercise 1: no topic tag\.$/.test(w)), warnings.join("|"));
});

test("concepts: only known ones of the topic, four at most, the rest warned about", () => {
  const { first, warnings } = parse(tagged({ concepts: ["caged", "nope", "open-chords", "top-string-triads", 7] }));
  assert.deepEqual(first.concepts, ["caged", "top-string-triads"]);
  assert.ok(warnings.some((w) => /left out concepts that are unknown or of another topic: nope, open-chords/.test(w)), warnings.join("|"));
  assert.equal(parse(tagged({ concepts: [] })).first.concepts, undefined);
  assert.equal(parse(tagged({ concepts: "caged" })).first.concepts, undefined);
  assert.equal(parse(tagged({ concepts: ["caged", "top-string-triads", "triads-every-set", "arpeggios-position", "caged"] })).first.concepts!.length, 4);
});

test("an id sent by the AI is never kept", () => {
  assert.equal(parse(tagged({ id: "from-ai" })).first.id, undefined);
});

test("progress is kept, trimmed and cut to 4000 characters; without it there is a warning, not an error", () => {
  assert.equal(parse(tagged(), { progress: "  Barre: buzzing less.  " }).config.progress, "Barre: buzzing less.");
  assert.equal(parse(tagged(), { progress: "x".repeat(5000) }).config.progress!.length, 4000);
  const none = parse(tagged(), {});
  assert.equal(none.config.progress, undefined);
  assert.deepEqual(none.warnings, ["No progress summary in the reply."]);
  assert.equal(parse(tagged(), { progress: 7 }).config.progress, undefined);
});

const config = (): PlanConfig => ({ title: "W", days: Array.from({ length: 7 }, (_, i) => ({ theme: `T${i}`, exercises: [{ title: "A", minutes: 5, cells: [] }, { title: "B", minutes: 5, cells: [] }] })) });
const idsOf = (c: PlanConfig) => c.days.flatMap((d) => d.exercises.map((e) => e.id));

test("withExerciseIds fills missing ids, keeps the ones there, and returns the same object when none is missing", () => {
  const c = config();
  c.days[0].exercises[0].id = "kept";
  const out = withExerciseIds(c, counter());
  assert.equal(out.days[0].exercises[0].id, "kept");
  assert.ok(idsOf(out).every(Boolean));
  assert.equal(new Set(idsOf(out)).size, 14);
  assert.equal(c.days[0].exercises[1].id, undefined, "the input is not changed");
  assert.equal(withExerciseIds(out, counter()), out);
});

test("withExerciseIds, fresh: every id is new", () => {
  const a = withExerciseIds(config(), () => "old-" + Math.random());
  const b = withExerciseIds(a, counter(), true);
  assert.equal(new Set([...idsOf(a), ...idsOf(b)]).size, 28);
});

test("a stored plan without exercise ids gets them on load, current and history", () => {
  const plan = (id: string): StoredPlan => ({ id, startedOn: "2026-11-01", done: {}, config: config() });
  const s = sanitiseState({ current: plan("a"), history: [plan("b")] });
  assert.ok(idsOf(s.current!.config).every(Boolean));
  assert.ok(idsOf(s.history[0].config).every(Boolean));
  assert.equal(new Set([...idsOf(s.current!.config), ...idsOf(s.history[0].config)]).size, 28);
  const again = sanitiseState(JSON.parse(JSON.stringify(s)));
  assert.deepEqual(idsOf(again.current!.config), idsOf(s.current!.config), "ids are stable once stored");
});

test("starting a plan gives every exercise a new id, also when an old plan is used again", () => {
  const first = startPlan(EMPTY_STATE, config(), counter(), "2026-11-01");
  assert.ok(idsOf(first.current!.config).every(Boolean));
  const again = startPlan(first, first.current!.config, () => "n" + Math.random(), "2026-11-08");
  assert.equal(again.history[0].id, first.current!.id);
  assert.equal(new Set([...idsOf(again.current!.config), ...idsOf(again.history[0].config)]).size, 28);
  assert.notEqual(again.current!.id, first.current!.id);
  assert.equal(again.current!.startedOn, "2026-11-08");
  assert.deepEqual(again.current!.done, {});
});

test("using an old plan again keeps the running plan's progress summary, not the old plan's", () => {
  const withNotes = (notes?: string): PlanConfig => ({ ...config(), ...(notes ? { progress: notes } : {}) });
  const running = startPlan(EMPTY_STATE, withNotes("Week 5 notes."), counter(), "2026-11-01");
  const again = restartPlan(running, withNotes("Week 2 notes."), () => "n" + Math.random(), "2026-11-08");
  assert.equal(again.current!.config.progress, "Week 5 notes.");
  assert.equal(again.history[0].config.progress, "Week 5 notes.");
  assert.equal(new Set([...idsOf(again.current!.config), ...idsOf(again.history[0].config)]).size, 28);
  const noNotes = startPlan(EMPTY_STATE, withNotes(), counter(), "2026-11-01");
  assert.equal(restartPlan(noNotes, withNotes("Week 2 notes."), counter(), "2026-11-08").current!.config.progress, "Week 2 notes.");
  assert.equal(restartPlan(EMPTY_STATE, withNotes("Week 2 notes."), counter(), "2026-11-08").current!.config.progress, "Week 2 notes.");
});

test("a stored day without an exercise list does not break loading, and the other days still get ids", () => {
  const broken = { id: "b", startedOn: "2026-11-01", done: {}, config: { title: "W", days: [{ theme: "T0" }, ...config().days.slice(1)] } };
  const s = sanitiseState({ current: broken, history: [] });
  assert.equal(s.current!.id, "b");
  assert.ok(s.current!.config.days.slice(1).every((d) => d.exercises.every((e) => e.id)));
});

test("loading keeps the stored text as a backup before the first save that changes it, once", async () => {
  const data = new Map<string, string>();
  const g = globalThis as unknown as { window?: unknown };
  const had = g.window;
  g.window = { localStorage: { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) } };
  try {
    const old = JSON.stringify({ answers: { levels: { guitar: "advanced" }, ratings: { caged: 5 }, focus: [], minutes: 20, styles: "", notes: "" }, current: null, history: [] });
    data.set(PLAN_KEY, old);
    const first = await localPlanStore.load();
    assert.deepEqual(first.answers!.areas, ["guitar"]);
    assert.equal(data.get(PLAN_BACKUP_KEY), old);
    assert.notEqual(data.get(PLAN_KEY), old);
    const migrated = data.get(PLAN_KEY)!;
    await localPlanStore.load();
    assert.equal(data.get(PLAN_KEY), migrated, "a second load changes nothing");
    data.set(PLAN_KEY, JSON.stringify({ ...JSON.parse(migrated), junk: 1 }));
    await localPlanStore.load();
    assert.equal(data.get(PLAN_BACKUP_KEY), old, "the first backup is never overwritten");
  } finally {
    g.window = had;
  }
});

test("a stored plan whose exercises have no cells (the format before blocks) is dropped, current and history alike", () => {
  const old = { id: "o", startedOn: "2026-11-01", done: {}, config: { title: "W", days: Array.from({ length: 7 }, (_, d) => ({ theme: `T${d}`, exercises: [{ title: "Ex", minutes: 5, sections: [{ type: "text", text: "x" }] }] })) } };
  const s = sanitiseState({ current: old, history: [old, { id: "n", startedOn: "2026-11-01", done: {}, config: config() }] });
  assert.equal(s.current, null);
  assert.equal(s.history.length, 1);
  assert.equal(s.history[0].id, "n");
});
