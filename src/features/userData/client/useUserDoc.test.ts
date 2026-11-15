import { test } from "node:test";
import assert from "node:assert/strict";
import { parseDoc, type Records } from "../model";
import { LoadRefused } from "./load";
import { anyUnsaved, worstStatus } from "./registry";
import { setUserDocBackends, userDoc, type DocBackend } from "./useUserDoc";

/** Lets the promise callbacks of a finished load run. */
const settle = async () => {
  for (let i = 0; i < 10; i++) await Promise.resolve();
};

/** A fake source: each load waits until `answer` (or `refuse`) is called; saves are recorded. */
function fakeSource() {
  const saved: unknown[] = [];
  const waiting: { resolve: (raw: unknown) => void; reject: (e: unknown) => void }[] = [];
  const backend: DocBackend = {
    load: () => new Promise((resolve, reject) => waiting.push({ resolve, reject })),
    save: (doc) => void saved.push(doc),
  };
  return {
    backends: () => backend,
    saved,
    answer: async (raw: unknown) => (waiting.shift()!.resolve(raw), settle()),
    refuse: async (e: unknown = new Error("refused")) => (waiting.shift()!.reject(e), settle()),
  };
}

let n = 0;
/** A fresh source for each test: a new key resets every document. */
function use(src: ReturnType<typeof fakeSource>) {
  setUserDocBackends(`test-${++n}`, src.backends);
}

const records = (best: number): Records => ({ improv: { done: 1, best }, noteGameBest: 0, lipRollAccuracy: null });

test("two subscribers see one set", async () => {
  const src = fakeSource();
  use(src);
  const doc = userDoc("records");
  let a = 0;
  let b = 0;
  const stopA = doc.subscribe(() => a++);
  const stopB = doc.subscribe(() => b++);
  await src.answer(null);
  a = b = 0;
  doc.set(records(5));
  assert.equal(a, 1);
  assert.equal(b, 1);
  assert.deepEqual(doc.get(), records(5));
  assert.deepEqual(src.saved, [records(5)]);
  stopA();
  stopB();
});

test("before loading, get returns the empty document and loaded is false", async () => {
  const src = fakeSource();
  use(src);
  const doc = userDoc("about");
  const stop = doc.subscribe(() => {});
  assert.deepEqual(doc.get(), parseDoc("about", null));
  assert.equal(doc.loaded(), false);
  await src.answer({ level: "full", voice: "alto" });
  assert.equal(doc.loaded(), true);
  assert.equal((doc.get() as { voice: string }).voice, "alto");
  assert.deepEqual(src.saved, [], "a load saves nothing");
  stop();
});

test("a set before the load finishes is not overwritten by the load", async () => {
  const src = fakeSource();
  use(src);
  const doc = userDoc("records");
  const stop = doc.subscribe(() => {});
  doc.set(records(9));
  await src.answer({ improv: { done: 4, best: 2 }, noteGameBest: 7 });
  assert.equal(doc.loaded(), true);
  assert.deepEqual(doc.get(), records(9));
  stop();
});

test("an update before the load is applied over the loaded document, then saved", async () => {
  const src = fakeSource();
  use(src);
  const doc = userDoc("records");
  const stop = doc.subscribe(() => {});
  doc.update((r) => ({ ...r, noteGameBest: 12 }));
  assert.deepEqual(src.saved, [], "nothing is saved before the load");
  await src.answer({ improv: { done: 4, best: 2 }, noteGameBest: 7 });
  const kept = { improv: { done: 4, best: 2 }, noteGameBest: 12, lipRollAccuracy: null };
  assert.deepEqual(doc.get(), kept);
  assert.deepEqual(src.saved, [kept]);
  stop();
});

test("a refused load saves nothing and stays not loaded", async () => {
  const src = fakeSource();
  use(src);
  const doc = userDoc("creator");
  const stop = doc.subscribe(() => {});
  await src.refuse();
  assert.equal(doc.loaded(), false);
  assert.deepEqual(doc.get(), parseDoc("creator", null));
  assert.deepEqual(src.saved, []);
  stop();
});

test("a new source resets the document and loads it again", async () => {
  const first = fakeSource();
  use(first);
  const doc = userDoc("about");
  const stop = doc.subscribe(() => {});
  await first.answer({ voice: "bass" });
  const second = fakeSource();
  use(second);
  assert.equal(doc.loaded(), false);
  assert.deepEqual(doc.get(), parseDoc("about", null));
  await second.answer({ voice: "alto" });
  assert.equal((doc.get() as { voice: string }).voice, "alto");
  stop();
});

test("a load from an old source that answers late is ignored", async () => {
  const first = fakeSource();
  use(first);
  const doc = userDoc("about");
  const stop = doc.subscribe(() => {});
  const second = fakeSource();
  use(second);
  await first.answer({ voice: "bass" });
  assert.equal(doc.loaded(), false);
  await second.answer(null);
  assert.equal((doc.get() as { voice: unknown }).voice, null);
  stop();
});

test("an update waiting on the load counts as saving, then saved once the load lets it be saved", async () => {
  const src = fakeSource();
  use(src);
  const doc = userDoc("about");
  const stop = doc.subscribe(() => {});
  assert.equal(worstStatus(), "saved");
  doc.update((a) => ({ ...a, voice: "alto" }));
  assert.equal(worstStatus(), "saving", "the leave warning covers it");
  await src.answer(null);
  assert.equal(worstStatus(), "saved");
  assert.equal(src.saved.length, 1);
  stop();
});

test("an update whose load is refused with a 401 shows as signed out", async () => {
  const src = fakeSource();
  use(src);
  const doc = userDoc("records");
  const stop = doc.subscribe(() => {});
  doc.update((r) => ({ ...r, noteGameBest: 3 }));
  await src.refuse(new LoadRefused(401));
  assert.equal(worstStatus(), "signedOut");
  assert.deepEqual(src.saved, []);
  use(fakeSource());
  assert.equal(worstStatus(), "saved", "a new source drops the change and its status");
  stop();
});

test("an update whose load is refused with another 4xx shows as rejected", async () => {
  const src = fakeSource();
  use(src);
  const doc = userDoc("course_notes");
  const stop = doc.subscribe(() => {});
  doc.update((n) => ({ ...n, "1/a": { note: "hi" } }));
  await src.refuse(new LoadRefused(403));
  assert.equal(worstStatus(), "rejected");
  assert.deepEqual(src.saved, []);
  use(fakeSource());
  stop();
});

test("a refused load with nothing waiting still shows in the save notice, but sets off no leave warning", async () => {
  const src = fakeSource();
  use(src);
  const doc = userDoc("creator");
  const stop = doc.subscribe(() => {});
  await src.refuse(new LoadRefused(401));
  assert.equal(worstStatus(), "signedOut");
  assert.equal(anyUnsaved(), false, "nothing would be lost by leaving");
  doc.update((k) => k);
  assert.equal(anyUnsaved(), true, "a change waiting on the refused load would be");
  stop();
});
