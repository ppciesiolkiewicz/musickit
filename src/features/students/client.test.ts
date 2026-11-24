import { test } from "node:test";
import assert from "node:assert/strict";
import { CLIENT_WORDS, fetchClaim, fetchStudent, fetchStudents, postClaim, postClaimLink, postStudent, postStudentPlan } from "./client";
import { migrateAnswers } from "@/features/plan/intake/answers";
import { ACCOUNT_CHANGED_WORDS, LOGGED_OUT_WORDS } from "./model/words";

const answer = (status: number, body: unknown): typeof fetch => (async () => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })) as typeof fetch;
const row = { id: "a1", name: "Ann", email: "ann@school.com", addedAt: "2026-11-10T10:00:00.000Z", claimedAt: null };
const input = { name: "Ann", email: "ann@school.com", answers: migrateAnswers(null), today: "2026-11-18" };

test("fetchStudents: the list and the limit; an answer of another shape is a failure", async () => {
  assert.deepEqual(await fetchStudents("2026-11-18", answer(200, { students: [row], limit: 3, extra: 2, active: 1, activeIds: ["a1"] })), { ok: true, students: [row], limit: 3, extra: 2, active: 1, activeIds: ["a1"] });
  assert.deepEqual(await fetchStudents("2026-11-18", answer(200, { students: [row], limit: null, extra: 0, active: 0 })), { ok: true, students: [row], limit: null, extra: 0, active: 0, activeIds: [] }, "an answer without activeIds reads as none");
  assert.equal((await fetchStudents("2026-11-18", answer(200, { students: [row], limit: 3 }))).ok, false, "no extras or count is a failure");
  assert.deepEqual(await fetchStudents("2026-11-18", answer(200, { students: [{ id: 1 }], limit: null })), { ok: false, code: "failed", error: CLIENT_WORDS.failed });
});

test("a route's error keeps its code and its own words; a 401 and no network get the page's words", async () => {
  const exists = await postStudent(input, answer(409, { error: "Someone already has an account with that email address.", code: "exists" }));
  assert.deepEqual(exists, { ok: false, code: "exists", error: "Someone already has an account with that email address." });
  assert.equal((await fetchStudents("2026-11-18", answer(401, { error: "x" })) as { code: string }).code, "logged-out");
  const offline = await fetchStudents("2026-11-18", (async () => { throw new TypeError("fetch failed"); }) as typeof fetch);
  assert.deepEqual(offline, { ok: false, code: "offline", error: CLIENT_WORDS.offline });
  const changed = await fetchStudents("2026-11-18", answer(409, { error: "account-changed", code: "account-changed" }));
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

const topic = { topic: "guitar-chords", label: "Chords", area: "guitar", now: 1.3, atStart: null };

test("fetchStudent: asks with today, reads the student, the week and the sliders; another shape is a failure", async () => {
  let url = "";
  const fetcher = (async (u: string) => {
    url = u;
    return new Response(JSON.stringify({ ok: true, student: row, plan: null, topics: [topic], upcoming: null }), { status: 200 });
  }) as unknown as typeof fetch;
  assert.deepEqual(await fetchStudent("a1", "2026-11-18", fetcher), { ok: true, student: row, plan: null, topics: [topic], upcoming: null, practiceDays: [0, 1, 2, 3, 4, 5, 6] });
  assert.equal(url, "/api/students/a1?today=2026-11-18");
  assert.equal((await fetchStudent("a1", "2026-11-18", answer(200, { student: row, plan: null, topics: [{ topic: "x" }] })) as { code: string }).code, "failed");
  assert.equal((await fetchStudent("a1", "2026-11-18", answer(200, { student: row, plan: "x", topics: [] })) as { code: string }).code, "failed");
  const gone = await fetchStudent("a1", "2026-11-18", answer(404, { error: "That student isn't on your list.", code: "not-found" }));
  assert.deepEqual(gone, { ok: false, code: "not-found", error: "That student isn't on your list." });
});

test("postStudentPlan: sends what it is given, reads the new week; a 409 keeps its code and words", async () => {
  let sent: RequestInit | undefined;
  let url = "";
  const fetcher = (async (u: string, init: RequestInit) => {
    url = u;
    sent = init;
    return new Response(JSON.stringify({ planId: "p1", start: "2026-11-23", short: true, comment: "no-week" }), { status: 200 });
  }) as unknown as typeof fetch;
  const body = { today: "2026-11-18", rotate: false, scores: { "guitar-chords": 1.7 }, comment: "Busy week", days: [0, 2, 4] };
  assert.deepEqual(await postStudentPlan("a1", body, fetcher), { ok: true, planId: "p1", start: "2026-11-23", short: true, comment: "no-week" });
  assert.equal(url, "/api/students/a1/plan");
  assert.equal(sent?.method, "POST");
  assert.deepEqual(JSON.parse(String(sent?.body)), body);
  assert.ok(sent?.signal, "a timeout");
  const none = await postStudentPlan("a1", body, answer(409, { error: "The library has no exercises yet.", code: "no-blocks" }));
  assert.deepEqual(none, { ok: false, code: "no-blocks", error: "The library has no exercises yet." });
  assert.equal((await postStudentPlan("a1", body, answer(200, { planId: "p1", start: "2026-11-23", short: false, comment: "kept" })) as { code: string }).code, "failed");
});

const GONE = { error: "This link is too old or was already used. If you have opened it before, press Log in. If not, ask your teacher to send a new link.", code: "gone" };

test("fetchClaim: whose link it is, by a GET that spends nothing; a 410 keeps the route's words", async () => {
  let sent: { url: string; init: RequestInit } | undefined;
  const fetcher = (async (url: string, init: RequestInit) => {
    sent = { url, init };
    return new Response(JSON.stringify({ name: "Ben" }), { status: 200 });
  }) as unknown as typeof fetch;
  assert.deepEqual(await fetchClaim("t o/k", fetcher), { ok: true, name: "Ben" });
  assert.equal(sent?.url, "/api/auth/claim?token=t%20o%2Fk");
  assert.equal(sent?.init.method, "GET");
  assert.ok(sent?.init.signal, "a timeout");
  assert.deepEqual(await fetchClaim("x", answer(410, GONE)), { ok: false, ...GONE });
  assert.deepEqual(await fetchClaim("x", answer(200, { name: 3 })), { ok: false, code: "failed", error: CLIENT_WORDS.failed });
});

test("postClaim: posts the token and answers where to go, only a path on this site", async () => {
  let sent: RequestInit | undefined;
  const fetcher = (async (_url: string, init: RequestInit) => {
    sent = init;
    return new Response(JSON.stringify({ next: "/welcome" }), { status: 200 });
  }) as unknown as typeof fetch;
  assert.deepEqual(await postClaim("tok", fetcher), { ok: true, next: "/welcome" });
  assert.equal(sent?.method, "POST");
  assert.deepEqual(JSON.parse(String(sent?.body)), { token: "tok" });
  assert.deepEqual(await postClaim("tok", answer(200, { next: "https://evil.example/" })), { ok: true, next: "/welcome" });
  assert.deepEqual(await postClaim("tok", answer(200, { next: "//evil.example/" })), { ok: true, next: "/welcome" });
  assert.deepEqual(await postClaim("tok", answer(410, GONE)), { ok: false, ...GONE });
});

// --- final fix wave

test("fetchStudent reads the upcoming week's start; an older answer without it is null; a broken one is a failure", async () => {
  const body = { student: row, plan: null, topics: [topic] };
  assert.deepEqual(await fetchStudent("a1", "2026-11-18", answer(200, { ...body, upcoming: { start: "2026-11-23" } })), { ok: true, ...body, upcoming: { start: "2026-11-23" }, practiceDays: [0, 1, 2, 3, 4, 5, 6] });
  assert.deepEqual(await fetchStudent("a1", "2026-11-18", answer(200, body)), { ok: true, ...body, upcoming: null, practiceDays: [0, 1, 2, 3, 4, 5, 6] });
  assert.deepEqual(((await fetchStudent("a1", "2026-11-18", answer(200, { ...body, practiceDays: [0, 2, 4] }))) as { practiceDays: number[] }).practiceDays, [0, 2, 4], "the practice days the teacher set");
  assert.equal((await fetchStudent("a1", "2026-11-18", answer(200, { ...body, upcoming: { start: "soon" } })) as { code: string }).code, "failed");
});

test("account-changed is known by its code, whatever words the route sent, and gets the one wording", async () => {
  const changed = await fetchStudents("2026-11-18", answer(409, { error: "Some other sentence.", code: "account-changed" }));
  assert.deepEqual(changed, { ok: false, code: "account-changed", error: ACCOUNT_CHANGED_WORDS });
  assert.equal(CLIENT_WORDS["account-changed"], ACCOUNT_CHANGED_WORDS);
  assert.equal(CLIENT_WORDS["logged-out"], LOGGED_OUT_WORDS);
  assert.equal((await fetchStudents("2026-11-18", answer(401, { error: "x", code: "logged-out" })) as { error: string }).error, LOGGED_OUT_WORDS);
});
