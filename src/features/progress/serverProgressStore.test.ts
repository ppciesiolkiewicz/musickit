import { test } from "node:test";
import assert from "node:assert/strict";
import type { Schedule } from "@/features/userData/client/retry";
import { worstStatus } from "@/features/userData/client/registry";
import type { ProgressEntry } from "./log";
import { createServerProgressStore, type ProgressChange } from "./serverProgressStore";

const entry = (exerciseId: string, stars: 1 | 2 | 3 | 4 | 5): ProgressEntry => ({
  id: `id-${exerciseId}`, planId: "p", exerciseId, day: 0, exercise: 0, title: "Ex", stars, at: "2026-11-15T10:00:00.000Z",
});

/** Timers held until `fire()`; `settle` lets promise callbacks run. */
function heldClock() {
  let timers: (() => void)[] = [];
  const schedule: Schedule = (fn) => {
    let live = true;
    timers.push(() => live && fn());
    return () => {
      live = false;
    };
  };
  return { schedule, fire: () => { const t = timers; timers = []; t.forEach((f) => f()); }, count: () => timers.length };
}
const settle = async () => {
  for (let i = 0; i < 10; i++) await Promise.resolve();
};

test("put and remove each send their own request with the change", async () => {
  const sent: [string, ProgressChange][] = [];
  const store = createServerProgressStore({ send: async (id, c) => (sent.push([id, c]), new Response(null, { status: 200 })), get: async () => ({ entries: [] }) });
  await store.put(entry("a", 3));
  await store.remove("b");
  assert.deepEqual(sent, [["a", { kind: "put", entry: entry("a", 3) }], ["b", { kind: "remove" }]]);
});

test("list reads the server's entries, cleaned", async () => {
  const store = createServerProgressStore({ get: async () => ({ entries: [entry("a", 2), { junk: true }] }) });
  assert.deepEqual(await store.list(), [entry("a", 2)]);
});

test("a failed put is retried and shows as failed until it gets through, and list keeps it meanwhile", async () => {
  const clock = heldClock();
  let calls = 0;
  const store = createServerProgressStore({
    send: async () => (++calls === 1 ? new Response(null, { status: 503 }) : new Response(null, { status: 200 })),
    get: async () => ({ entries: [] }),
    schedule: clock.schedule,
  });
  await store.put(entry("a", 4));
  assert.equal(worstStatus(), "failed");
  assert.deepEqual(await store.list(), [entry("a", 4)], "the unsaved rating is still listed");
  assert.equal(clock.count(), 1);
  clock.fire();
  await settle();
  assert.equal(calls, 2);
  assert.equal(worstStatus(), "saved");
});

test("a rating cleared while its put waits to retry ends cleared: the retry sends the remove", async () => {
  const clock = heldClock();
  const sent: ProgressChange["kind"][] = [];
  let down = true;
  const store = createServerProgressStore({
    send: async (_id, c) => (sent.push(c.kind), new Response(null, { status: down ? 503 : 200 })),
    get: async () => ({ entries: [] }),
    schedule: clock.schedule,
  });
  await store.put(entry("a", 4));
  down = false;
  await store.remove("a");
  clock.fire();
  await settle();
  assert.deepEqual(sent, ["put", "remove"]);
  assert.equal(worstStatus(), "saved");
});

// last in the file: it leaves a signed-out sender in the shared registry
test("a 401 is signed out and not retried", async () => {
  const clock = heldClock();
  const store = createServerProgressStore({ send: async () => new Response(null, { status: 401 }), get: async () => ({ entries: [] }), schedule: clock.schedule });
  await store.put(entry("z", 1));
  assert.equal(worstStatus(), "signedOut");
  assert.equal(clock.count(), 0);
});
