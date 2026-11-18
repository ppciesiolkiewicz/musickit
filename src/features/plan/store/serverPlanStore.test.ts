import { test } from "node:test";
import assert from "node:assert/strict";
import { createDocClient } from "@/features/userData/client/docClient";
import type { Schedule } from "@/features/userData/client/retry";
import { LoadRefused, loadReporter } from "@/features/userData/client/load";
import { worstStatus } from "@/features/userData/client/registry";
import { MAX_PLAN_BYTES } from "@/features/userData/model";
import { EMPTY_STATE, type PlanState, type StoredPlan } from "../model/types";
import { createServerPlanStore } from "./serverPlanStore";
import { memoryPlanStore } from "./memoryPlanStore";

function heldClock() {
  let timers: (() => void)[] = [];
  const schedule: Schedule = (fn) => {
    let live = true;
    timers.push(() => live && fn());
    return () => {
      live = false;
    };
  };
  return { schedule, fire: () => { const t = timers; timers = []; t.forEach((f) => f()); } };
}
const settle = async () => {
  for (let i = 0; i < 10; i++) await Promise.resolve();
};

const withReminder = (time: string): PlanState => ({ ...EMPTY_STATE, reminder: { ...EMPTY_STATE.reminder, enabled: true, time } });

test("load reads the plan document and makes it safe; nothing stored is the empty state", async () => {
  assert.deepEqual(await createServerPlanStore({ get: async () => ({ data: null }) }).load(), EMPTY_STATE);
  const stored = withReminder("07:30");
  assert.deepEqual(await createServerPlanStore({ get: async () => ({ data: stored }) }).load(), stored);
});

test("two loads, at once or later, share one GET and get the same plan", async () => {
  let gets = 0;
  const stored = withReminder("07:30");
  const store = createServerPlanStore({ get: async () => (gets++, { data: stored }) });
  const [a, b] = await Promise.all([store.load(), store.load()]);
  assert.equal(gets, 1);
  assert.equal(a, b, "every reader holds the same state");
  assert.deepEqual(await store.load(), stored);
  assert.equal(gets, 1, "a later load asks the server nothing");
});

test("save goes through the DocClient: debounced, last write wins, and every later load gets the saved state with no GET", async () => {
  const clock = heldClock();
  const sent: unknown[] = [];
  const client = createDocClient({ put: async (b) => (sent.push(b), new Response(null, { status: 200 })), schedule: clock.schedule });
  let gets = 0;
  const store = createServerPlanStore({ client, get: async () => (gets++, { data: null }) });
  await store.load();
  await store.save(withReminder("07:00"));
  await store.save(withReminder("08:00"));
  assert.deepEqual(await store.load(), withReminder("08:00"), "a load before the save is through gets the change");
  clock.fire();
  await settle();
  assert.deepEqual(sent, [withReminder("08:00")]);
  assert.deepEqual(await store.load(), withReminder("08:00"));
  assert.equal(gets, 1);
});

test("a save made while the first read is out wins over what the read brings back", async () => {
  let answer!: (v: unknown) => void;
  const store = createServerPlanStore({ client: createDocClient({ put: async () => new Response(null, { status: 200 }), schedule: () => () => {} }), get: () => new Promise((r) => (answer = r)) });
  const loading = store.load();
  await store.save(withReminder("09:30"));
  answer({ data: withReminder("06:00") });
  assert.deepEqual(await loading, withReminder("09:30"));
});

test("a refused read is not kept: the next load asks again", async () => {
  let gets = 0;
  const store = createServerPlanStore({ get: async () => { if (++gets === 1) throw new Error("401"); return { data: null }; } });
  await assert.rejects(store.load());
  assert.deepEqual(await store.load(), EMPTY_STATE);
  assert.equal(gets, 2);
});

test("a refused read shows in the save notice (401 logged out, another 4xx rejected) until a read gets through", async () => {
  let answer: () => unknown = () => { throw new LoadRefused(401); };
  const loads = loadReporter();
  const store = createServerPlanStore({ get: async () => answer(), loads });
  await assert.rejects(store.load());
  assert.equal(loads.status(), "signedOut");
  assert.equal(worstStatus(), "signedOut", "the notice hears it");
  answer = () => { throw new LoadRefused(404); };
  await assert.rejects(store.load());
  assert.equal(loads.status(), "rejected");
  answer = () => ({ data: null });
  await store.load();
  assert.equal(loads.status(), "saved");
});

test("memoryPlanStore keeps what is saved for the visit, each one on its own", async () => {
  const one = memoryPlanStore();
  const two = memoryPlanStore();
  await one.save(withReminder("09:00"));
  assert.deepEqual(await one.load(), withReminder("09:00"));
  assert.deepEqual(await two.load(), EMPTY_STATE);
});

test("flush sends a save still waiting on the delay at once, before a share reads the stored plan", async () => {
  const sent: unknown[] = [];
  const client = createDocClient({ put: async (b) => (sent.push(b), new Response(null, { status: 200 })), schedule: () => () => {} });
  const store = createServerPlanStore({ client, get: async () => ({ data: null }) });
  await store.save(withReminder("07:00"));
  assert.equal(sent.length, 0);
  assert.equal(await store.flush?.(), true);
  assert.deepEqual(sent, [withReminder("07:00")]);
});

test("flush is false when the plan's save didn't land", async () => {
  const client = createDocClient({ put: async () => new Response(null, { status: 503 }), schedule: () => () => {} });
  const store = createServerPlanStore({ client, get: async () => ({ data: null }) });
  await store.save(withReminder("07:00"));
  assert.equal(await store.flush?.(), false);
});

test("a save over the plan's cap is cut the way the server cuts it, oldest earlier plans first, so it is never refused", async () => {
  const clock = heldClock();
  const sent: PlanState[] = [];
  const client = createDocClient({ put: async (b) => (sent.push(b as PlanState), new Response(null, { status: 200 })), schedule: clock.schedule });
  const store = createServerPlanStore({ client, get: async () => ({ data: null }) });
  const plan = (id: string): StoredPlan => ({ id, startedOn: "2026-11-01", done: {}, feedback: "x".repeat(300 * 1024), config: { title: "W", days: [] } });
  const state: PlanState = { ...EMPTY_STATE, current: plan("now"), history: Array.from({ length: 10 }, (_, i) => plan(`old${i}`)) };
  await store.save(state);
  clock.fire();
  await settle();
  assert.ok(JSON.stringify(sent[0]).length <= MAX_PLAN_BYTES);
  assert.equal(sent[0].current?.id, "now");
  assert.deepEqual(sent[0].history.map((p) => p.id), ["old0", "old1", "old2", "old3", "old4"]);
  assert.deepEqual(await store.load(), sent[0], "the store keeps what it sent");
});

test("the timer's records: read once per plan, each day saved on its own, and a save before the read is laid over it", async () => {
  const clock = heldClock();
  const sent: unknown[] = [];
  let reads = 0;
  let answer!: (v: unknown) => void;
  const store = createServerPlanStore({
    get: async () => ({ data: null }),
    getTimes: () => (reads++, new Promise((r) => (answer = r))),
    timeClient: () => createDocClient({ put: async (b) => (sent.push(b), new Response(null, { status: 200 })), schedule: clock.schedule }),
  });
  const day0 = { planId: "p", day: 0, elapsed: 60, spent: { a: 60 } };
  const day1 = { planId: "p", day: 1, elapsed: 30, spent: { b: 30 } };
  const loading = store.loadTimes("p");
  await store.saveTime(day1);
  answer({ days: [day0, { planId: "p", day: 1, elapsed: 5, spent: {} }, { broken: true }] });
  assert.deepEqual(await loading, [day0, { planId: "p", day: 1, elapsed: 5, spent: {} }], "the first read gets what the server had");
  assert.deepEqual(await store.loadTimes("p"), [day0, day1], "a later load has the save");
  assert.equal(reads, 1);
  await store.saveTime({ ...day0, elapsed: 61 });
  await store.saveTime({ ...day0, elapsed: 62 });
  clock.fire();
  await settle();
  assert.deepEqual(sent, [day1, { ...day0, elapsed: 62 }], "one send per day, the latest");
  assert.equal(await store.flush!(), true);
});

test("loadAllTimes reads every plan's records and lays this session's saves over them", async () => {
  const day0 = { planId: "p", day: 0, elapsed: 60, spent: {} };
  const store = createServerPlanStore({
    getAllTimes: async () => ({ days: [day0, { planId: "q", day: 1, elapsed: 5, spent: {} }, "junk"] }),
    timeClient: () => createDocClient({ put: async () => new Response(null, { status: 200 }) }),
    getTimes: async () => ({ days: [day0] }),
  });
  await store.saveTime({ ...day0, elapsed: 400 });
  assert.deepEqual((await store.loadAllTimes()).map((d) => [d.planId, d.day, d.elapsed]), [["p", 0, 400], ["q", 1, 5]]);
});

test("the plan is saved at the version it was loaded at, and a stale refusal stops the saves and tells onStale", async () => {
  const clock = heldClock();
  const seen: (number | undefined)[] = [];
  let stale = 0;
  const client = createDocClient({
    put: async (_b, _i, v) => (seen.push(v), new Response(JSON.stringify({ error: "x", code: "stale", version: 8 }), { status: 409 })),
    onStale: () => stale++,
    schedule: clock.schedule,
  });
  const store = createServerPlanStore({ client, get: async () => ({ data: null, version: 7 }) });
  await store.load();
  await store.save(withReminder("07:00"));
  assert.equal(await store.flush?.(), false);
  await store.save(withReminder("08:00"));
  assert.equal(await store.flush?.(), false);
  assert.deepEqual(seen, [7]);
  assert.equal(stale, 1);
});
