import { test } from "node:test";
import assert from "node:assert/strict";
import { getJson, LoadRefused, loadReporter } from "./load";
import { anyUnsaved } from "./registry";
import type { Schedule } from "./retry";

test("getJson waits RETRY_MS on network errors and 5xx, then returns the answer", async () => {
  const waits: number[] = [];
  const schedule: Schedule = (fn, ms) => (waits.push(ms), setTimeout(fn, 0), () => {});
  const answers: (number | "network")[] = ["network", 503, 500, 200];
  const fetcher = async () => {
    const a = answers.shift()!;
    if (a === "network") throw new TypeError("Failed to fetch");
    return new Response(JSON.stringify({ data: a }), { status: a });
  };
  assert.deepEqual(await getJson("/x", { fetcher, schedule }), { data: 200 });
  assert.deepEqual(waits, [2000, 5000, 15000]);
});

test("getJson rejects a 4xx at once, with its code", async () => {
  const schedule: Schedule = () => assert.fail("no retry on a 4xx");
  await assert.rejects(getJson("/x", { fetcher: async () => new Response(null, { status: 401 }), schedule }), (e) => e instanceof LoadRefused && e.code === 401);
});

test("loadReporter: a 401 is signedOut, another refusal rejected, a network error nothing; a read that gets through clears it; never a leave warning", () => {
  const r = loadReporter();
  r.refused(new TypeError("offline"));
  assert.equal(r.status(), "saved");
  r.refused(new LoadRefused(401));
  assert.equal(r.status(), "signedOut");
  assert.equal(anyUnsaved(), false);
  r.refused(new LoadRefused(403));
  assert.equal(r.status(), "rejected");
  r.loaded();
  assert.equal(r.status(), "saved");
});
