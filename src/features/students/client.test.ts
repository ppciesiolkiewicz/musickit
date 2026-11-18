import { test } from "node:test";
import assert from "node:assert/strict";
import { CLIENT_WORDS, fetchStudents, postClaimLink, postStudent } from "./client";
import { migrateAnswers } from "@/features/plan/intake/answers";

const answer = (status: number, body: unknown): typeof fetch => (async () => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })) as typeof fetch;
const row = { id: "a1", name: "Ann", email: "ann@school.com", addedAt: "2026-11-10T10:00:00.000Z", claimedAt: null };
const input = { name: "Ann", email: "ann@school.com", answers: migrateAnswers(null), today: "2026-11-18" };

test("fetchStudents: the list and the limit; an answer of another shape is a failure", async () => {
  assert.deepEqual(await fetchStudents(answer(200, { students: [row], limit: 3 })), { ok: true, students: [row], limit: 3 });
  assert.deepEqual(await fetchStudents(answer(200, { students: [row], limit: null })), { ok: true, students: [row], limit: null });
  assert.deepEqual(await fetchStudents(answer(200, { students: [{ id: 1 }], limit: null })), { ok: false, code: "failed", error: CLIENT_WORDS.failed });
});

test("a route's error keeps its code and its own words; a 401 and no network get the page's words", async () => {
  const exists = await postStudent(input, answer(409, { error: "Someone already has an account with that email address.", code: "exists" }));
  assert.deepEqual(exists, { ok: false, code: "exists", error: "Someone already has an account with that email address." });
  assert.equal((await fetchStudents(answer(401, { error: "x" })) as { code: string }).code, "logged-out");
  const offline = await fetchStudents((async () => { throw new TypeError("fetch failed"); }) as typeof fetch);
  assert.deepEqual(offline, { ok: false, code: "offline", error: CLIENT_WORDS.offline });
  const changed = await fetchStudents(answer(409, { error: "account-changed", code: "account-changed" }));
  assert.deepEqual(changed, { ok: false, code: "account-changed", error: CLIENT_WORDS["account-changed"] });
});

test("postStudent sends the answers and today, and reads what happened to the plan and the email", async () => {
  let sent: RequestInit | undefined;
  const fetcher = (async (_url: string, init: RequestInit) => {
    sent = init;
    return new Response(JSON.stringify({ student: row, plan: "short", mail: "failed" }), { status: 200 });
  }) as unknown as typeof fetch;
  assert.deepEqual(await postStudent(input, fetcher), { ok: true, student: row, plan: "short", mail: "failed" });
  assert.equal(sent?.method, "POST");
  assert.deepEqual(JSON.parse(String(sent?.body)), input);
  assert.ok(sent?.signal, "a timeout");
});

test("postClaimLink: sent or off; a 502 mail-failed keeps the route's words", async () => {
  assert.deepEqual(await postClaimLink("a1", answer(200, { mail: "sent" })), { ok: true, mail: "sent" });
  const failed = await postClaimLink("a1", answer(502, { error: "The email didn't go out.", code: "mail-failed" }));
  assert.deepEqual(failed, { ok: false, code: "mail-failed", error: "The email didn't go out." });
});
