import { test } from "node:test";
import assert from "node:assert/strict";
import { requestDay } from "./composeClient";
import type { ComposedDay } from "../model/compose";

const day: ComposedDay = { exercises: [{ title: "Pentatonic position 1", minutes: 5, cells: [{ type: "text", text: "Play it." }] }], steps: ["pentatonic-positions:1"], short: false };
const json = (status: number, body: unknown) => async () => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

test("requestDay: a 200 gives the day, posting { date, another } with a timeout signal", async () => {
  let sent: { url: string; init?: RequestInit } | null = null;
  const fetcher = (async (url: string, init?: RequestInit) => {
    sent = { url, init };
    return json(200, { ok: true, day, date: "2026-11-18", attempt: 0 })();
  }) as typeof fetch;
  const r = await requestDay({ date: "2026-11-18", another: false }, fetcher);
  assert.deepEqual(r, { ok: true, day, date: "2026-11-18", attempt: 0 });
  assert.ok(sent);
  const s = sent as { url: string; init?: RequestInit };
  assert.equal(s.url, "/api/me/plan/compose");
  assert.equal(s.init?.method, "POST");
  assert.deepEqual(JSON.parse(String(s.init?.body)), { date: "2026-11-18", another: false });
  assert.ok(s.init?.signal instanceof AbortSignal);
});

test("requestDay: a 409 gives its code", async () => {
  for (const code of ["no-answers", "bad-date", "no-blocks"] as const) {
    const r = await requestDay({ date: "2026-11-18", another: true }, json(409, { error: "x", code }) as unknown as typeof fetch);
    assert.deepEqual(r, { ok: false, code });
  }
});

test("requestDay: a 409 with an unknown code is a failed request", async () => {
  assert.deepEqual(await requestDay({ date: "2026-11-18", another: false }, json(409, { error: "x", code: "what" }) as unknown as typeof fetch), { ok: false, code: "failed" });
});

test("requestDay: a thrown fetch (no network) gives offline", async () => {
  const fetcher = (async () => { throw new TypeError("Failed to fetch"); }) as typeof fetch;
  assert.deepEqual(await requestDay({ date: "2026-11-18", another: false }, fetcher), { ok: false, code: "offline" });
});

test("requestDay: a 500, a non-JSON answer or a 200 of another shape gives failed", async () => {
  assert.deepEqual(await requestDay({ date: "2026-11-18", another: false }, json(500, { error: "boom" }) as unknown as typeof fetch), { ok: false, code: "failed" });
  const html = (async () => new Response("<html>bad gateway</html>", { status: 502 })) as typeof fetch;
  assert.deepEqual(await requestDay({ date: "2026-11-18", another: false }, html), { ok: false, code: "failed" });
  const notJson = (async () => new Response("not json", { status: 200 })) as typeof fetch;
  assert.deepEqual(await requestDay({ date: "2026-11-18", another: false }, notJson), { ok: false, code: "failed" });
  assert.deepEqual(await requestDay({ date: "2026-11-18", another: false }, json(200, { ok: true, day: { steps: [] } }) as unknown as typeof fetch), { ok: false, code: "failed" });
  assert.deepEqual(await requestDay({ date: "2026-11-18", another: false }, json(401, { error: "Log in" }) as unknown as typeof fetch), { ok: false, code: "failed" });
});

test("requestDay: an abort after the timeout gives failed", async () => {
  const fetcher = (async () => { throw new DOMException("The operation timed out.", "TimeoutError"); }) as typeof fetch;
  assert.deepEqual(await requestDay({ date: "2026-11-18", another: false }, fetcher), { ok: false, code: "failed" });
  const aborted = (async () => { throw new DOMException("aborted", "AbortError"); }) as typeof fetch;
  assert.deepEqual(await requestDay({ date: "2026-11-18", another: false }, aborted), { ok: false, code: "failed" });
});
