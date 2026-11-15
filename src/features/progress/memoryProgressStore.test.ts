import { test } from "node:test";
import assert from "node:assert/strict";
import { upsert, without, type ProgressEntry } from "./log";
import { memoryProgressStore } from "./memoryProgressStore";

const entry = (exerciseId: string, stars: 1 | 2 | 3 | 4 | 5, id = `id-${exerciseId}-${stars}`): ProgressEntry => ({
  id, planId: "p", exerciseId, day: 0, exercise: 0, title: `Ex ${exerciseId}`, stars, at: "2026-11-15T10:00:00.000Z",
});

test("memoryProgressStore starts empty", async () => {
  assert.deepEqual(await memoryProgressStore().list(), []);
});

test("memoryProgressStore put, list and remove behave like upsert and without", async () => {
  const store = memoryProgressStore();
  let model: ProgressEntry[] = [];
  const steps: (["put", ProgressEntry] | ["remove", string])[] = [
    ["put", entry("a", 2)],
    ["put", entry("b", 3)],
    ["put", entry("a", 5)],
    ["remove", "b"],
    ["remove", "missing"],
    ["put", entry("c", 1)],
  ];
  for (const [op, arg] of steps) {
    if (op === "put") {
      await store.put(arg);
      model = upsert(model, arg);
    } else {
      await store.remove(arg);
      model = without(model, arg);
    }
    assert.deepEqual(await store.list(), model);
  }
  const [a] = await store.list();
  assert.equal(a.id, "id-a-2", "a second rating keeps the row's id");
  assert.equal(a.stars, 5);
});

test("each memoryProgressStore is its own log", async () => {
  const one = memoryProgressStore();
  const two = memoryProgressStore();
  await one.put(entry("a", 4));
  assert.deepEqual(await two.list(), []);
});

test("a listed log is a copy: changing it does not change the store", async () => {
  const store = memoryProgressStore();
  await store.put(entry("a", 4));
  const list = await store.list();
  list.pop();
  assert.equal((await store.list()).length, 1);
});
