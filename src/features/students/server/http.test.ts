import { test } from "node:test";
import assert from "node:assert/strict";
import { startSession, type AuthDeps } from "@/features/account/server/auth";
import { memoryRepo } from "@/features/account/server/repo.memory";
import type { Plan } from "@/features/account/plans";
import { memoryUserDataRepo } from "@/features/userData/server/repo.memory";
import { readDocVersioned } from "@/features/userData/server/data";
import { sanitiseState } from "@/features/plan/model/state";
import type { PlanConfig, PlanState, StoredPlan } from "@/features/plan/model/types";
import { MAX_PLAN_BYTES } from "@/features/userData/model";
import { stubLibrary, topicBlocks } from "@/features/plan/server/stubLibrary";
import { addRoute, claimLinkRoute, claimOpenRoute, claimPeekRoute, listRoute, planRoute, viewRoute, type StudentsHttpDeps } from "./http";

const T0 = new Date("2026-11-18T12:00:00.000Z");
const TODAY = "2026-11-18";
const ANSWERS = { areas: ["guitar"], topics: { "guitar-scales": 1 }, minutes: 10, styles: "", notes: "" };
const RANDOM = "11111111-1111-4111-8111-111111111111";
const plan = (id: string, students: number | null): Plan => ({ id, name: id, role: "teacher", monthCents: 0, yearCents: 0, trialDays: 0, students, autoplansPerMonth: 0, batch: false, enabled: true, sort: 1 });

type Mail = { to: string[]; subject: string; text: string };

async function setup(opts: { students?: number | null; mail?: "sent" | "off" | "throw"; blocks?: boolean; env?: Record<string, string> } = {}) {
  const store = memoryRepo([plan("teacher-x", opts.students === undefined ? 5 : opts.students)]);
  const userData = memoryUserDataRepo();
  let n = 0;
  const auth: AuthDeps = { repo: store.repo, now: () => T0, token: () => `tok${++n}`, code: () => "100000" };
  const sent: Mail[] = [];
  let ids = 0;
  const h: StudentsHttpDeps = {
    auth, userData, library: stubLibrary(opts.blocks === false ? [] : topicBlocks("guitar-scales")),
    sendMail: async (m) => {
      if (opts.mail === "throw") throw new Error("Resend said no");
      sent.push(m);
      return opts.mail === "off" ? "off" : "sent";
    },
    newId: () => `p${++ids}`, env: { NODE_ENV: "test", ...opts.env }, today: () => TODAY, validId: (id) => /^user-\d+$/.test(id),
  };
  async function user(email: string, role: "student" | "teacher") {
    const made = await store.repo.createUser({ email, name: email.split("@")[0], role: "student" }, T0);
    assert.ok(made);
    const row = role === "teacher" ? await store.repo.setUserPlan(made.id, "teacher-x", "year", "teacher", T0) : made;
    assert.ok(row);
    const s = await startSession(auth, row, null, null, false);
    return { id: made.id, cookie: `mk_session=${s.sessionToken}` };
  }
  return { h, store, userData, sent, user, teacher: await user("tess@school.com", "teacher"), other: await user("otto@school.com", "teacher") };
}

const call = (path: string, method: string, cookie: string | null, body?: unknown, headers: Record<string, string> = {}) =>
  new Request(`http://localhost:3000${path}`, {
    method,
    headers: { host: "localhost:3000", ...(method === "GET" ? {} : { origin: "http://localhost:3000" }), ...(cookie ? { cookie } : {}), ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

const tokenOf = (m: { text: string }) => /token=(tok\d+)/.exec(m.text)![1];
type AddBody = { student: { id: string; name: string; claimedAt: string | null }; plan: string; mail: string; code: string; error: string };
const NEW = { name: "Ben", email: "ben@home.com", answers: ANSWERS, today: TODAY };

async function add(s: Awaited<ReturnType<typeof setup>>, body: unknown = NEW, who = s.teacher) {
  const r = await addRoute(s.h, call("/api/students", "POST", who.cookie, body));
  return { r, body: (await r.json()) as AddBody };
}

test("signed out is 401, a student's account is 403, another site's POST is 403, every route", async () => {
  const s = await setup();
  const student = await s.user("sam@home.com", "student");
  const id = (await add(s)).body.student.id as string;
  const routes: [string, string, (req: Request) => Promise<Response>, unknown][] = [
    ["/api/students", "GET", (r) => listRoute(s.h, r), undefined],
    ["/api/students", "POST", (r) => addRoute(s.h, r), NEW],
    [`/api/students/${id}?today=${TODAY}`, "GET", (r) => viewRoute(s.h, r, id), undefined],
    [`/api/students/${id}/claim-link`, "POST", (r) => claimLinkRoute(s.h, r, id), {}],
    [`/api/students/${id}/plan`, "POST", (r) => planRoute(s.h, r, id), { today: TODAY }],
  ];
  for (const [path, method, run, body] of routes) {
    const none = await run(call(path, method, null, body));
    assert.equal(none.status, 401, path);
    assert.equal(((await none.json()) as { code: string }).code, "logged-out");
    const asStudent = await run(call(path, method, student.cookie, body));
    assert.equal(asStudent.status, 403, path);
    assert.equal(((await asStudent.json()) as { code: string }).code, "not-teacher");
    if (method === "POST") {
      const evil = await run(call(path, method, s.teacher.cookie, body, { origin: "https://evil.com" }));
      assert.equal(evil.status, 403, path);
      assert.equal(((await evil.json()) as { code: string }).code, "forbidden");
    }
  }
});

test("POST /api/students adds, makes the first week, mails the link", async () => {
  const s = await setup();
  const { r, body } = await add(s);
  assert.equal(r.status, 200);
  assert.equal(body.plan, "made");
  assert.equal(body.mail, "sent");
  assert.equal(body.student.name, "Ben");
  assert.equal(body.student.claimedAt, null);
  assert.equal(s.sent.length, 1);
  assert.deepEqual(s.sent[0].to, ["ben@home.com"]);
  assert.match(s.sent[0].text, /http:\/\/localhost:3000\/claim\?token=tok\d+/);
  const doc = (await readDocVersioned(s.userData, body.student.id, "plan")).data as PlanState;
  assert.equal(doc.given.length, 1);
  const list = await (await listRoute(s.h, call("/api/students", "GET", s.teacher.cookie))).json();
  assert.equal(list.students.length, 1);
  assert.equal(list.limit, 5);
});

test("POST /api/students: no library blocks keeps the student, plan none; mail off and mail failing are still 200", async () => {
  const none = await setup({ blocks: false });
  const a = await add(none);
  assert.equal(a.r.status, 200);
  assert.equal(a.body.plan, "none");
  assert.equal(a.body.mail, "sent");
  const off = await setup({ mail: "off" });
  const b = await add(off);
  assert.equal(b.r.status, 200);
  assert.equal(b.body.mail, "off");
  const bad = await setup({ mail: "throw" });
  const logged: string[] = [];
  const keep = console.error;
  console.error = (...a: unknown[]) => void logged.push(a.join(" "));
  try {
    const c = await add(bad);
    assert.equal(c.r.status, 200);
    assert.equal(c.body.mail, "failed");
    assert.equal((await bad.h.auth.repo.studentsOf(bad.teacher.id)).length, 1);
    assert.ok(!/tok\d/.test(logged.join("\n")));
  } finally {
    console.error = keep;
  }
});

test("POST /api/students: 400 for name, email, answers and a bad today; 409 for exists and limit; nothing is made", async () => {
  const s = await setup({ students: 1 });
  const bad: [Record<string, unknown>, number, string][] = [
    [{ ...NEW, name: " " }, 400, "name"],
    [{ ...NEW, email: "nope" }, 400, "email"],
    [{ ...NEW, answers: { areas: [] } }, 400, "answers"],
    [{ ...NEW, today: "2026-02-31" }, 400, "bad-date"],
    [{ ...NEW, today: "2026-11-25" }, 400, "bad-date"],
    [{ ...NEW, today: undefined }, 400, "bad-date"],
  ];
  for (const [body, status, code] of bad) {
    const { r, body: out } = await add(s, body);
    assert.equal(r.status, status, code);
    assert.equal(out.code, code);
    assert.equal(typeof out.error, "string");
  }
  assert.equal((await s.h.auth.repo.studentsOf(s.teacher.id)).length, 0);
  const notJson = await addRoute(s.h, new Request("http://localhost:3000/api/students", { method: "POST", headers: { cookie: s.teacher.cookie, host: "localhost:3000" }, body: "x" }));
  assert.equal(notJson.status, 400);
  assert.equal(((await notJson.json()) as { code: string }).code, "bad-request");
  assert.equal((await add(s)).r.status, 200);
  const over = await add(s, { ...NEW, email: "cy@home.com" });
  assert.equal(over.r.status, 409);
  assert.equal(over.body.code, "limit");
  const roomy = await setup();
  await add(roomy);
  const dup = await add(roomy);
  assert.equal(dup.r.status, 409);
  assert.equal(dup.body.code, "exists");
});

test("[id] routes: another teacher's student, a random uuid and a non-uuid are all 404, and nothing changes", async () => {
  const s = await setup();
  const id = (await add(s)).body.student.id as string;
  const before = JSON.stringify((await readDocVersioned(s.userData, id, "plan")).data);
  const tokens = (await s.h.auth.repo.lastTokenAt("ben@home.com", "claim"))?.getTime();
  for (const target of [id, s.teacher.id, RANDOM, "not-a-uuid", "1; drop table users"]) {
    const asOther = target === id ? s.other : s.teacher;
    const results = [
      await viewRoute(s.h, call(`/api/students/${target}?today=${TODAY}`, "GET", asOther.cookie), target),
      await claimLinkRoute(s.h, call(`/api/students/${target}/claim-link`, "POST", asOther.cookie, {}), target),
      await planRoute(s.h, call(`/api/students/${target}/plan`, "POST", asOther.cookie, { today: TODAY, rotate: false, comment: "hi" }), target),
    ];
    for (const r of results) {
      assert.equal(r.status, 404, target);
      assert.equal(((await r.json()) as { code: string }).code, "not-found");
    }
  }
  assert.equal(JSON.stringify((await readDocVersioned(s.userData, id, "plan")).data), before);
  assert.equal((await s.h.auth.repo.lastTokenAt("ben@home.com", "claim"))?.getTime(), tokens);
  assert.equal(s.sent.length, 1);
  assert.equal((await s.h.auth.repo.studentsOf(s.other.id)).length, 0);
});

test("GET /api/students/<id>: the teacher's own student, and a bad today is 400", async () => {
  const s = await setup();
  const id = (await add(s)).body.student.id as string;
  const r = await viewRoute(s.h, call(`/api/students/${id}?today=${TODAY}`, "GET", s.teacher.cookie), id);
  assert.equal(r.status, 200);
  const v = await r.json();
  assert.equal(v.student.id, id);
  assert.ok(v.plan);
  assert.ok(v.topics.length > 0);
  const bad = await viewRoute(s.h, call(`/api/students/${id}`, "GET", s.teacher.cookie), id);
  assert.equal(bad.status, 400);
  assert.equal(((await bad.json()) as { code: string }).code, "bad-date");
});

test("POST claim-link: 429 wait right after adding, 200 after a minute, 409 once claimed, mail failing is 502", async () => {
  const s = await setup();
  const id = (await add(s)).body.student.id as string;
    const wait = await claimLinkRoute(s.h, call(`/api/students/${id}/claim-link`, "POST", s.teacher.cookie, {}), id);
  assert.equal(wait.status, 429);
  const waited = (await wait.json()) as { code: string; waitSeconds: number };
  assert.equal(waited.code, "wait");
  assert.equal(waited.waitSeconds, 60);
  const later: StudentsHttpDeps = { ...s.h, auth: { ...s.h.auth, now: () => new Date(T0.getTime() + 61_000) } };
  const ok = await claimLinkRoute(later, call(`/api/students/${id}/claim-link`, "POST", s.teacher.cookie, {}), id);
  assert.equal(ok.status, 200);
  assert.deepEqual(await ok.json(), { mail: "sent" });
  assert.equal(s.sent.length, 2);
  const failing: StudentsHttpDeps = { ...later, auth: { ...later.auth, now: () => new Date(T0.getTime() + 200_000) }, sendMail: async () => { throw new Error("down"); } };
  const keep = console.error;
  console.error = () => {};
  try {
    const f = await claimLinkRoute(failing, call(`/api/students/${id}/claim-link`, "POST", s.teacher.cookie, {}), id);
    assert.equal(f.status, 502);
    assert.equal(((await f.json()) as { code: string }).code, "mail-failed");
  } finally {
    console.error = keep;
  }
  const opened = await claimOpenRoute(s.h, call("/api/auth/claim", "POST", null, { token: tokenOf(s.sent[1]) }));
  assert.equal(opened.status, 200);
  const claimed = await claimLinkRoute(later, call(`/api/students/${id}/claim-link`, "POST", s.teacher.cookie, {}), id);
  assert.equal(claimed.status, 409);
  assert.equal(((await claimed.json()) as { code: string }).code, "claimed");
});

test("POST plan: next and rotate answer 200 { planId, start, short, comment }; the comment is stored; errors map to statuses", async () => {
  const s = await setup();
  const id = (await add(s)).body.student.id as string;
  const next = await planRoute(s.h, call(`/api/students/${id}/plan`, "POST", s.teacher.cookie, { today: TODAY, rotate: false, comment: "Slow down" }), id);
  assert.equal(next.status, 200);
  const n = await next.json();
  assert.deepEqual(Object.keys(n).sort(), ["comment", "planId", "short", "start"]);
  assert.equal(n.comment, "stored");
  const rot = await planRoute(s.h, call(`/api/students/${id}/plan`, "POST", s.teacher.cookie, { today: TODAY, rotate: true }), id);
  assert.equal(rot.status, 200);
  assert.equal(((await rot.json()) as { comment: string }).comment, "none");
  const date = await planRoute(s.h, call(`/api/students/${id}/plan`, "POST", s.teacher.cookie, { today: "yesterday", rotate: false }), id);
  assert.equal(date.status, 400);
  assert.equal(((await date.json()) as { code: string }).code, "bad-date");
  const empty = await setup({ blocks: false });
  const eid = (await add(empty)).body.student.id as string;
  const nb = await planRoute(empty.h, call(`/api/students/${eid}/plan`, "POST", empty.teacher.cookie, { today: TODAY, rotate: false }), eid);
  assert.equal(nb.status, 409);
  assert.equal(((await nb.json()) as { code: string }).code, "no-blocks");
});

test("POST plan: busy is 409, an unexpected failure is 500 with a plain line", async () => {
  const s = await setup();
  const id = (await add(s)).body.student.id as string;
  const stale: StudentsHttpDeps = { ...s.h, userData: { ...s.userData, putDoc: async () => ({ ok: false, version: 99 }) } };
  const busy = await planRoute(stale, call(`/api/students/${id}/plan`, "POST", s.teacher.cookie, { today: TODAY, rotate: false }), id);
  assert.equal(busy.status, 409);
  assert.equal(((await busy.json()) as { code: string }).code, "busy");
  const boom: StudentsHttpDeps = { ...s.h, library: { ...s.h.library, composeBlocks: async () => { throw new Error("db down"); } } };
  const keep = console.error;
  console.error = () => {};
  try {
    const r = await planRoute(boom, call(`/api/students/${id}/plan`, "POST", s.teacher.cookie, { today: TODAY, rotate: false }), id);
    assert.equal(r.status, 500);
    const b = await r.json();
    assert.equal(b.code, "failed");
    assert.ok(!b.error.includes("db down"));
  } finally {
    console.error = keep;
  }
});

test("claim: GET peeks without spending; POST signs in with cookies and { next }; a second POST is 410; cross-origin is 403", async () => {
  const s = await setup();
  await add(s);
  const tok1 = tokenOf(s.sent[0]);
  const peek = await claimPeekRoute(s.h, call(`/api/auth/claim?token=${tok1}`, "GET", null));
  assert.equal(peek.status, 200);
  assert.deepEqual(await peek.json(), { name: "Ben" });
  assert.equal((await claimPeekRoute(s.h, call(`/api/auth/claim?token=${tok1}`, "GET", null))).status, 200);
  const evil = await claimOpenRoute(s.h, call("/api/auth/claim", "POST", null, { token: tok1 }, { origin: "https://evil.com" }));
  assert.equal(evil.status, 403);
  const r = await claimOpenRoute(s.h, call("/api/auth/claim", "POST", null, { token: tok1 }));
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { next: "/welcome" });
  const cookies = r.headers.getSetCookie();
  assert.ok(cookies.some((c) => c.startsWith("mk_session=") && c.includes("HttpOnly")));
  const again = await claimOpenRoute(s.h, call("/api/auth/claim", "POST", null, { token: tok1 }));
  assert.equal(again.status, 410);
  const gone = (await again.json()) as { code: string; error: string };
  assert.equal(gone.code, "gone");
  assert.ok(gone.error);
  assert.equal((await claimPeekRoute(s.h, call(`/api/auth/claim?token=${tok1}`, "GET", null))).status, 410);
  assert.equal((await claimPeekRoute(s.h, call("/api/auth/claim", "GET", null))).status, 410);
  assert.equal((await claimOpenRoute(s.h, call("/api/auth/claim", "POST", null, {}))).status, 410);
});

test("a student id that is not a uuid is a 404 before any query (the default check)", async () => {
  const s = await setup();
  const rest: StudentsHttpDeps = { ...s.h, validId: undefined };
  const noQuery: StudentsHttpDeps = { ...rest, auth: { ...rest.auth, repo: new Proxy(rest.auth.repo, { get: (t, k) => (k === "studentLink" || k === "userById" ? () => { throw new Error("queried"); } : Reflect.get(t, k)) }) } };
  const session = { cookie: s.teacher.cookie };
  for (const id of ["user-1", "x", "00000000-0000-0000-0000-00000000000g"]) {
    assert.equal((await viewRoute(noQuery, call(`/api/students/${id}?today=${TODAY}`, "GET", session.cookie), id)).status, 404);
    assert.equal((await claimLinkRoute(noQuery, call(`/api/students/${id}/claim-link`, "POST", session.cookie, {}), id)).status, 404);
    assert.equal((await planRoute(noQuery, call(`/api/students/${id}/plan`, "POST", session.cookie, { today: TODAY }), id)).status, 404);
  }
});

test("POST plan: a document too big for another week is 413 too-big, and nothing is written", async () => {
  const s = await setup();
  const id = (await add(s)).body.student.id as string;
  const base = (await readDocVersioned(s.userData, id, "plan")).data as PlanState;
  const bulky = (n: number): StoredPlan =>
    ({ id: "big", startedOn: "2026-01-01", done: {}, config: { title: "big", days: [{ theme: "", exercises: Array.from({ length: n }, (_, i) => ({ id: `e${i}`, title: `Ex ${i}`, minutes: 5, cells: [{ type: "text", id: "c", text: "x".repeat(700) }] })) }] } as unknown as PlanConfig });
  const size = (n: number) => JSON.stringify(sanitiseState({ ...base, given: [], current: bulky(n) })).length;
  const each = size(2) - size(1);
  let n = Math.floor((MAX_PLAN_BYTES - 1500 - size(0)) / each);
  while (size(n) > MAX_PLAN_BYTES - 1500) n--;
  await s.userData.putDoc(id, "plan", { ...base, given: [], current: bulky(n) }, T0);
  const before = JSON.stringify((await readDocVersioned(s.userData, id, "plan")).data);
  const r = await planRoute(s.h, call(`/api/students/${id}/plan`, "POST", s.teacher.cookie, { today: TODAY, rotate: false }), id);
  assert.equal(r.status, 413);
  const b = (await r.json()) as { code: string; error: string };
  assert.equal(b.code, "too-big");
  assert.ok(b.error.includes("try again"));
  assert.equal(JSON.stringify((await readDocVersioned(s.userData, id, "plan")).data), before);
});

test("signedIn's own answers get a code and a sentence; the claim route's cross-origin 403 says the same", async () => {
  const s = await setup();
  const other = await listRoute(s.h, call("/api/students", "GET", s.teacher.cookie, undefined, { "x-account-id": "someone-else" }));
  assert.equal(other.status, 409);
  const o = (await other.json()) as { code: string; error: string };
  assert.equal(o.code, "account-changed");
  assert.match(o.error, /Reload the page/);
  const evil = await addRoute(s.h, call("/api/students", "POST", s.teacher.cookie, NEW, { origin: "https://evil.com" }));
  const claimEvil = await claimOpenRoute(s.h, call("/api/auth/claim", "POST", null, { token: "x" }, { origin: "https://evil.com" }));
  const [a, b] = [(await evil.json()) as { error: string }, (await claimEvil.json()) as { error: string }];
  assert.equal(a.error, b.error);
  assert.ok(!a.error.includes("Bad request"));
});
