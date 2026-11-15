import assert from "node:assert/strict";
import test from "node:test";
import { accountHeaders, isAccountChanged, readSession, sessionReader, type SessionOpts } from "./serverAccountStore";

const ANN = { id: "11111111-1111-4111-8111-111111111111", name: "Ann", email: "ann@x.org", role: "student", createdAt: "2026-11-15T10:00:00.000Z" };
const ok = (account: unknown) => new Response(JSON.stringify({ account }), { status: 200 });

/** A clock that runs a wait only when told, and counts the waits. */
function heldClock() {
  let waits: (() => void)[] = [];
  const delays: number[] = [];
  const schedule: SessionOpts["schedule"] = (fn, ms) => {
    delays.push(ms);
    waits.push(fn);
  };
  return { schedule, delays, fire: () => { const w = waits; waits = []; w.forEach((f) => f()); } };
}
const settle = async () => {
  for (let i = 0; i < 20; i++) await Promise.resolve();
};

test("readSession: no hint cookie is nobody, and asks the server nothing", async () => {
  let asked = 0;
  assert.equal(await readSession({ hasHint: () => false, fetcher: async () => (asked++, ok(ANN)) }), null);
  assert.equal(asked, 0);
});

test("readSession: a 200 is the answer, the account or signed out", async () => {
  assert.equal((await readSession({ hasHint: () => true, fetcher: async () => ok(ANN) }))?.id, ANN.id);
  assert.equal(await readSession({ hasHint: () => true, fetcher: async () => ok(null) }), null);
});

test("readSession: a network error or a 5xx is never taken for signed out; it waits and asks again", async () => {
  const clock = heldClock();
  const answers: (() => Promise<Response>)[] = [
    async () => { throw new TypeError("offline"); },
    async () => new Response("down", { status: 503 }),
    async () => ok(ANN),
  ];
  const got: { settled?: { id: string } | null } = {};
  const read = readSession({ hasHint: () => true, fetcher: () => answers.shift()!(), retryMs: [10, 20], schedule: clock.schedule }).then((a) => (got.settled = a));
  await settle();
  assert.equal("settled" in got, false, "still loading after a network error");
  clock.fire();
  await settle();
  assert.equal("settled" in got, false, "still loading after a 503");
  clock.fire();
  await read;
  assert.equal(got.settled?.id, ANN.id);
  assert.deepEqual(clock.delays, [10, 20]);
});

test("sessionReader: every reader on the page shares one request and one answer; known() gives it once it came", async () => {
  let asked = 0;
  const s = sessionReader({ hasHint: () => true, fetcher: async () => (asked++, ok(ANN)) });
  assert.equal(s.known(), undefined);
  const [a, b] = await Promise.all([s.read(), s.read()]);
  await s.read();
  assert.equal(asked, 1);
  assert.equal(a, b);
  assert.equal(s.known()?.id, ANN.id);
  s.reset();
  assert.equal(s.known(), undefined);
  await s.read();
  assert.equal(asked, 2, "after a reset the next read asks again");
});

test("accountHeaders: names the page's account once it is known, and adds nothing before", () => {
  assert.deepEqual(accountHeaders({ "content-type": "application/json" }, ANN.id), { "content-type": "application/json", "x-account-id": ANN.id });
  assert.deepEqual(accountHeaders({}, undefined), {});
  assert.deepEqual(accountHeaders({}, null), {}, "a visitor names no account");
});

test("isAccountChanged: only a 409 that says account-changed", () => {
  assert.equal(isAccountChanged(409, { error: "account-changed" }), true);
  assert.equal(isAccountChanged(409, { error: "This id is taken." }), false, "a video id already in a list is another 409");
  assert.equal(isAccountChanged(400, { error: "account-changed" }), false);
  assert.equal(isAccountChanged(409, null), false);
});
