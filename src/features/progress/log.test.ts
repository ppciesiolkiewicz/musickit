import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanEntries, upsert, without, type ProgressEntry } from "./log";

const entry = (over: Partial<ProgressEntry> = {}): ProgressEntry => ({
  id: "r1", planId: "p", exerciseId: "e1", day: 0, exercise: 1, title: "Spider", stars: 3, at: "2026-11-10T10:00:00.000Z", ...over,
});

test("cleanEntries: anything that isn't a list gives an empty log", () => {
  for (const raw of ["x", null, undefined, {}, 7]) assert.deepEqual(cleanEntries(raw), []);
});

test("cleanEntries drops broken rows one by one and keeps the good ones as they are", () => {
  const good = entry({ focus: "Frets 5 to 8", area: "guitar", level: "beginner", topic: "guitar-techniques", concepts: ["spider"] });
  const raw = [good, { ...entry(), exerciseId: undefined }, { ...entry(), stars: 9 }, null, "row", { ...entry(), at: "" }, { ...entry(), day: "0" }, entry({ id: "r2", exerciseId: "e2" })];
  assert.deepEqual(cleanEntries(raw), [good, entry({ id: "r2", exerciseId: "e2" })]);
});

test("cleanEntries drops optional fields of the wrong type but keeps the row", () => {
  const raw = [{ ...entry(), focus: 7, topic: null, concepts: ["spider", 3], junk: true }];
  assert.deepEqual(cleanEntries(raw), [entry({ concepts: ["spider"] })]);
});

test("cleanEntries keeps one row per exercise: the last one", () => {
  assert.deepEqual(cleanEntries([entry({ stars: 2 }), entry({ id: "r9", stars: 5 })]), [entry({ id: "r9", stars: 5 })]);
});

test("upsert: one row per exercise, the new stars and time under the first row's id", () => {
  const a = upsert([], entry({ stars: 2 }));
  const b = upsert(a, entry({ id: "other", stars: 5, at: "2026-11-10T11:00:00.000Z" }));
  assert.deepEqual(b, [entry({ id: "r1", stars: 5, at: "2026-11-10T11:00:00.000Z" })]);
  assert.deepEqual(a, [entry({ stars: 2 })], "the input list is not changed");
  assert.equal(upsert(b, entry({ id: "r2", exerciseId: "e2" })).length, 2);
});

test("rating three times, then clearing, leaves no row", () => {
  let log: ProgressEntry[] = [entry({ id: "keep", exerciseId: "e0" })];
  for (const stars of [1, 4, 5] as const) log = upsert(log, entry({ stars }));
  assert.equal(log.length, 2);
  log = without(log, "e1");
  assert.deepEqual(log, [entry({ id: "keep", exerciseId: "e0" })]);
  assert.equal(without(log, "nope"), log, "nothing to remove: the same list");
});
