import { test } from "node:test";
import assert from "node:assert/strict";
import { logRows, planRows, sizeLabel, storageRows } from "./dataView";
import { EMPTY_STATE, type PlanState, type StoredPlan } from "@/features/plan/model/types";
import type { ProgressEntry } from "@/features/progress/log";

const plan = (id: string, rated: number, progress?: string): StoredPlan => ({
  id, startedOn: `2026-11-0${id.length}`, done: {},
  rated: Object.fromEntries(Array.from({ length: rated }, (_, i) => [`${i}:0`, { stars: 3 as const, at: "2026-11-10T10:00:00.000Z" }])),
  config: { title: `Plan ${id}`, ...(progress ? { progress } : {}), days: Array.from({ length: 7 }, (_, d) => ({ theme: `T${d}`, exercises: [{ title: "A", minutes: 5, cells: [] }, { title: "B", minutes: 5, cells: [] }] })) },
});

test("planRows: the current plan first, then the history in its order, with counts and the summary", () => {
  const state: PlanState = { ...EMPTY_STATE, current: plan("c", 3, "Barre: better."), history: [plan("hh", 0), plan("hhh", 14)] };
  assert.deepEqual(planRows(state), [
    { id: "c", title: "Plan c", startedOn: "2026-11-01", rated: 3, total: 14, current: true, progress: "Barre: better." },
    { id: "hh", title: "Plan hh", startedOn: "2026-11-02", rated: 0, total: 14, current: false },
    { id: "hhh", title: "Plan hhh", startedOn: "2026-11-03", rated: 14, total: 14, current: false },
  ]);
  assert.deepEqual(planRows(EMPTY_STATE), []);
  assert.equal(planRows({ ...EMPTY_STATE, current: { ...plan("x", 0), rated: undefined } })[0].rated, 0);
});

const row = (id: string, at: string, topic?: string): ProgressEntry => ({ id, planId: "p", exerciseId: `e-${id}`, day: 0, exercise: 0, title: id, stars: 4, at, ...(topic ? { topic } : {}) });

test("logRows: newest first, filtered by topic; no topic asks for all", () => {
  const rows = [row("a", "2026-11-01T10:00:00.000Z", "guitar-caged"), row("b", "2026-11-03T10:00:00.000Z"), row("c", "2026-11-02T10:00:00.000Z", "guitar-caged")];
  assert.deepEqual(logRows(rows).map((r) => r.id), ["b", "c", "a"]);
  assert.deepEqual(logRows(rows, "").map((r) => r.id), ["b", "c", "a"]);
  assert.deepEqual(logRows(rows, "guitar-caged").map((r) => r.id), ["c", "a"]);
  assert.deepEqual(logRows(rows, "voice-pitch"), []);
  assert.deepEqual(rows.map((r) => r.id), ["a", "b", "c"], "the input is not sorted in place");
});

test("storageRows: every key sorted, JSON parsed, plain strings kept as text", () => {
  const data: Record<string, string> = { "musickit.theme": "dark", "a.json": '{"x":1}', "musickit.volume": "0.8" };
  const keys = Object.keys(data);
  const storage = { length: keys.length, key: (i: number) => keys[i] ?? null, getItem: (k: string) => data[k] ?? null };
  assert.deepEqual(storageRows(storage), [
    { key: "a.json", size: 7, value: { x: 1 }, text: false },
    { key: "musickit.theme", size: 4, value: "dark", text: true },
    { key: "musickit.volume", size: 3, value: 0.8, text: false },
  ]);
});

test("sizeLabel: bytes, kB, MB", () => {
  assert.equal(sizeLabel(812), "812 B");
  assert.equal(sizeLabel(4200), "4.2 kB");
  assert.equal(sizeLabel(1_300_000), "1.3 MB");
});
