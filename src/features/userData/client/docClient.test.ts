import { test } from "node:test";
import assert from "node:assert/strict";
import { createDocClient } from "./docClient";
import { withRetry, type Schedule } from "./retry";
import { anyAccountChanged, anyTooBig, worstStatus } from "./registry";
import { pickSource } from "./source";

/** A fake clock: `schedule` queues timers, `tick(ms)` moves time on and fires the ones that are due. */
function fakeClock() {
  let now = 0;
  let timers: { at: number; fn: () => void; live: boolean }[] = [];
  const schedule: Schedule = (fn, ms) => {
    const t = { at: now + ms, fn, live: true };
    timers.push(t);
    return () => {
      t.live = false;
    };
  };
  const tick = async (ms: number) => {
    const end = now + ms;
    for (;;) {
      const due = timers.filter((t) => t.live && t.at <= end).sort((a, b) => a.at - b.at)[0];
      if (!due) break;
      now = due.at;
      due.live = false;
      due.fn();
      await settle();
    }
    now = end;
    timers = timers.filter((t) => t.live);
    await settle();
  };
  return { schedule, tick, waiting: () => timers.filter((t) => t.live).length };
}

/** Lets the promise callbacks of a finished put run. */
const settle = async () => {
  for (let i = 0; i < 10; i++) await Promise.resolve();
};

const answer = (status: number) => new Response(null, { status });

function fakePut(...results: (number | "network")[]) {
  const sent: unknown[] = [];
  const put = async (body: unknown) => {
    sent.push(body);
    const r = results.length > 1 ? results.shift()! : results[0] ?? 200;
    if (r === "network") throw new TypeError("Failed to fetch");
    return answer(r);
  };
  return { put, sent };
}

test("three saves within the delay send one put, with the last value", async () => {
  const clock = fakeClock();
  const { put, sent } = fakePut(200);
  const client = createDocClient({ put, schedule: clock.schedule });
  client.save({ n: 1 });
  await clock.tick(300);
  client.save({ n: 2 });
  await clock.tick(300);
  client.save({ n: 3 });
  assert.equal(client.status(), "saving");
  await clock.tick(1000);
  assert.deepEqual(sent, [{ n: 3 }]);
  assert.equal(client.status(), "saved");
});

test("a put that throws fails, retries after 2000 and is saved once a put succeeds", async () => {
  const clock = fakeClock();
  const { put, sent } = fakePut("network", 200);
  const client = createDocClient({ put, schedule: clock.schedule });
  client.save("a");
  await clock.tick(1000);
  assert.equal(client.status(), "failed");
  assert.equal(worstStatus(), "failed");
  await clock.tick(1999);
  assert.equal(sent.length, 1);
  await clock.tick(1);
  assert.equal(sent.length, 2);
  assert.equal(client.status(), "saved");
  assert.equal(worstStatus(), "saved");
});

test("retries wait 2, 5, 15 and 30 seconds, and 30 again after that, on a 5xx", async () => {
  const clock = fakeClock();
  const { put, sent } = fakePut(503);
  const client = createDocClient({ put, schedule: clock.schedule });
  client.save("a");
  await clock.tick(1000);
  for (const [wait, count] of [[2000, 2], [5000, 3], [15000, 4], [30000, 5], [30000, 6]] as const) {
    await clock.tick(wait - 1);
    assert.equal(sent.length, count - 1);
    await clock.tick(1);
    assert.equal(sent.length, count);
  }
  assert.equal(client.status(), "failed");
  client.save("stop");
  await clock.tick(1000);
});

test("a 401 means signed out, with no more retries", async () => {
  const clock = fakeClock();
  const { put, sent } = fakePut(401);
  const client = createDocClient({ put, schedule: clock.schedule });
  client.save("a");
  await clock.tick(1000);
  assert.equal(client.status(), "signedOut");
  assert.equal(worstStatus(), "signedOut");
  await clock.tick(120_000);
  assert.equal(sent.length, 1);
  assert.equal(clock.waiting(), 0);
});

test("a 413 is rejected, too big, and schedules no retry", async () => {
  const clock = fakeClock();
  const { put, sent } = fakePut(413, 200);
  const client = createDocClient({ put, schedule: clock.schedule });
  client.save("big");
  await clock.tick(1000);
  assert.equal(client.status(), "rejected");
  assert.equal(clock.waiting(), 0);
  assert.equal(anyTooBig(), true);
  await clock.tick(120_000);
  assert.equal(sent.length, 1);
  client.save("small");
  await clock.tick(1000);
  assert.equal(client.status(), "saved");
  assert.equal(anyTooBig(), false);
});

test("a 409 account-changed is rejected with no retry, and the notice can tell it from too big", async () => {
  const clock = fakeClock();
  const { put, sent } = fakePut(409, 200);
  const client = createDocClient({ put, schedule: clock.schedule });
  client.save("a");
  await clock.tick(1000);
  assert.equal(client.status(), "rejected");
  assert.equal(clock.waiting(), 0);
  assert.equal(anyAccountChanged(), true);
  assert.equal(anyTooBig(), false);
  await clock.tick(120_000);
  assert.equal(sent.length, 1, "never sent again by itself");
  client.save("b");
  await clock.tick(1000);
  assert.equal(anyAccountChanged(), false);
});

test("a 400 is rejected but not too big; rejected ranks above failed", async () => {
  const clock = fakeClock();
  const bad = createDocClient({ put: fakePut(400).put, schedule: clock.schedule });
  const down = createDocClient({ put: fakePut("network").put, schedule: clock.schedule });
  bad.save("x");
  down.save("y");
  await clock.tick(1000);
  assert.equal(bad.status(), "rejected");
  assert.equal(down.status(), "failed");
  assert.equal(anyTooBig(), false);
  assert.notEqual(worstStatus(), "failed");
});

test("a save during a failed retry sends the newer value, not a merge", async () => {
  const clock = fakeClock();
  const { put, sent } = fakePut("network", 200);
  const client = createDocClient({ put, schedule: clock.schedule });
  client.save({ a: 1 });
  await clock.tick(1000);
  assert.equal(client.status(), "failed");
  client.save({ b: 2 });
  await clock.tick(2000);
  assert.deepEqual(sent, [{ a: 1 }, { b: 2 }]);
  assert.equal(client.status(), "saved");
});

test("flush sends the pending value at once", async () => {
  const clock = fakeClock();
  const { put, sent } = fakePut(200);
  const client = createDocClient({ put, schedule: clock.schedule });
  client.save("now");
  await client.flush();
  assert.deepEqual(sent, ["now"]);
  assert.equal(client.status(), "saved");
  assert.equal(clock.waiting(), 0);
});

test("subscribers hear each change of status", async () => {
  const clock = fakeClock();
  const { put } = fakePut(200);
  const client = createDocClient({ put, schedule: clock.schedule });
  const heard: string[] = [];
  const stop = client.subscribe((s) => heard.push(s));
  client.save(1);
  await clock.tick(1000);
  stop();
  assert.deepEqual(heard, ["saving", "saved"]);
});

test("withRetry retries one request on its own, for a sender that is not a document", async () => {
  const clock = fakeClock();
  let calls = 0;
  const r = withRetry(async () => answer(++calls < 3 ? 500 : 204), { schedule: clock.schedule });
  r.run();
  await settle();
  assert.equal(r.status(), "failed");
  await clock.tick(2000);
  assert.equal(r.status(), "failed");
  await clock.tick(5000);
  assert.equal(calls, 3);
  assert.equal(r.status(), "saved");
});

test("pickSource: no accounts is local, signed in is the server, a visitor is memory", () => {
  assert.equal(pickSource(false, true), "local");
  assert.equal(pickSource(false, false), "local");
  assert.equal(pickSource(true, true), "server");
  assert.equal(pickSource(true, false), "memory");
});

test("flush while a PUT is out waits for it to land and returns its status", async () => {
  const clock = fakeClock();
  let land!: (r: Response) => void;
  const sent: unknown[] = [];
  const put = (body: unknown) => (sent.push(body), new Promise<Response>((r) => (land = r)));
  const client = createDocClient({ put, schedule: clock.schedule });
  client.save("v1");
  await clock.tick(1000);
  assert.deepEqual(sent, ["v1"]);
  let done: string | null = null;
  const flushing = client.flush().then((s) => (done = s));
  await settle();
  assert.equal(done, null, "flush must not resolve before the PUT lands");
  land(new Response(null, { status: 200 }));
  await flushing;
  assert.equal(done, "saved");
  assert.deepEqual(sent, ["v1"]);
});

test("flush returns the failed status when the send fails, and rejected on a 4xx", async () => {
  const clock = fakeClock();
  const failing = createDocClient({ put: async () => new Response(null, { status: 503 }), schedule: clock.schedule });
  failing.save(1);
  assert.equal(await failing.flush(), "failed");
  const refused = createDocClient({ put: async () => new Response(null, { status: 413 }), schedule: clock.schedule });
  refused.save(1);
  assert.equal(await refused.flush(), "rejected");
});

test("flush with nothing to send is saved", async () => {
  const clock = fakeClock();
  const { put } = fakePut(200);
  assert.equal(await createDocClient({ put, schedule: clock.schedule }).flush(), "saved");
});
