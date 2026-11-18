import { test } from "node:test";
import assert from "node:assert/strict";
import { SESSION_TTL, hashToken, toAccount, type AuthDeps } from "@/features/account/server/auth";
import { memoryRepo } from "@/features/account/server/repo.memory";
import type { AuthRepo } from "@/features/account/server/repo";
import { TAUGHT_PLAN_ID, type Plan } from "@/features/account/plans";
import type { Account } from "@/features/account/model";
import { memoryUserDataRepo } from "@/features/userData/server/repo.memory";
import { readDocVersioned } from "@/features/userData/server/data";
import type { PlanState } from "@/features/plan/model/types";
import { CLAIM_TTL, addStudent, listStudents, newClaimLink, openClaim, peekClaim } from "./students";

const START = Date.UTC(2026, 10, 18, 12, 0, 0);
const MINUTE = 60_000;
const plan = (id: string, students: number | null): Plan => ({ id, name: id, role: "teacher", monthCents: 0, yearCents: 0, trialDays: 0, students, autoplansPerMonth: 0, batch: false, enabled: true, sort: 1 });
const ANSWERS = { areas: ["guitar"], topics: { "guitar-scales": 1 }, minutes: 20, styles: "", notes: "" };

/** A teacher on a plan with `students` places (a plan row of its own, unless `planId` is null), over the memory repos. */
async function setup(opts: { students?: number | null; planId?: string | null; role?: "teacher" | "owner" | "student" } = {}) {
  const planId = opts.planId === undefined ? "teacher-x" : opts.planId;
  const store = memoryRepo([plan("teacher-x", opts.students === undefined ? 2 : opts.students), plan("teacher-zero", 0)]);
  const userData = memoryUserDataRepo();
  let time = START;
  let n = 0;
  const deps: AuthDeps = { repo: store.repo, now: () => new Date(time), token: () => `t${++n}`, code: () => "100000" };
  const made = await store.repo.createUser({ email: "tess@school.com", name: "Tess", role: "student" }, new Date(time));
  assert.ok(made);
  const role = opts.role ?? "teacher";
  const row = planId ? await store.repo.setUserPlan(made.id, planId, "year", role, new Date(time)) : made;
  assert.ok(row);
  if (!planId) row.role = role;
  const teacher: Account = toAccount(row);
  return { ...store, deps, userData, teacher, wait: (ms: number) => void (time += ms), both: { auth: deps, userData } };
}

const ok = <T extends { ok: boolean }>(r: T) => {
  assert.equal(r.ok, true, JSON.stringify(r));
  return r as Extract<T, { ok: true }>;
};

test("a student is made on the taught plan, with the answers in a plan document and one history entry", async () => {
  const s = await setup();
  const r = ok(await addStudent(s.both, s.teacher, { name: "  Ben  Ray ", email: " Ben@Home.com ", answers: ANSWERS }));
  const user = await s.repo.userById(r.studentId);
  assert.equal(user?.email, "ben@home.com");
  assert.equal(user?.name, "Ben Ray");
  assert.equal(user?.role, "student");
  assert.equal(user?.planId, TAUGHT_PLAN_ID);
  assert.equal(toAccount(user!).needsSetup, false);
  assert.equal((await s.repo.teacherOf(r.studentId))?.id, s.teacher.id);
  const doc = (await readDocVersioned(s.userData, r.studentId, "plan")).data as PlanState;
  assert.deepEqual(doc.answers?.topics, { "guitar-scales": 1 });
  assert.equal(doc.answersHistory.length, 1);
  assert.deepEqual(doc.answersHistory[0], { at: new Date(START).toISOString(), topics: { "guitar-scales": 1 } });
  assert.equal(s.tokens[0].kind, "claim");
  assert.equal(s.tokens[0].tokenHash, hashToken(r.claimToken));
  assert.equal(s.tokens[0].next, "/welcome");
  assert.equal(s.tokens[0].expiresAt.getTime(), START + CLAIM_TTL);
  assert.equal(CLAIM_TTL, 30 * 24 * 60 * MINUTE);
});

test("each error, in order", async () => {
  const s = await setup();
  const good = { name: "Ben", email: "ben@home.com", answers: ANSWERS };
  const err = async (t: Account, input: object) => {
    const r = await addStudent(s.both, t, { ...good, ...input });
    assert.equal(r.ok, false);
    return r.ok ? "" : r.error;
  };
  assert.equal(await err({ ...s.teacher, role: "student" }, { name: "" }), "not-teacher");
  assert.equal(await err(s.teacher, { name: " " }), "name");
  assert.equal(await err(s.teacher, { name: 5 }), "name");
  assert.equal(await err(s.teacher, { email: "nope" }), "email");
  assert.equal(await err(s.teacher, { email: undefined }), "email");
  assert.equal(await err(s.teacher, { answers: null }), "answers");
  assert.equal(await err(s.teacher, { answers: { areas: ["guitar"], topics: {} } }), "answers");
  assert.equal(await err(s.teacher, { answers: { areas: [], topics: {} } }), "answers", "no areas is the default area with no topics");
  assert.equal(s.users.length, 1, "nothing was made");
  // name is checked before email, email before answers
  assert.equal(await err(s.teacher, { name: "", email: "x", answers: null }), "name");
  assert.equal(await err(s.teacher, { email: "x", answers: null }), "email");
});

test("the limit counts every student, claimed or not; refused at the limit", async () => {
  const s = await setup({ students: 2 });
  const a = ok(await addStudent(s.both, s.teacher, { name: "A", email: "a@x.com", answers: ANSWERS }));
  ok(await addStudent(s.both, s.teacher, { name: "B", email: "b@x.com", answers: ANSWERS }));
  const r = await addStudent(s.both, s.teacher, { name: "C", email: "c@x.com", answers: ANSWERS });
  assert.deepEqual(r, { ok: false, error: "limit" });
  assert.ok(await openClaim(s.deps, a.claimToken, null));
  assert.deepEqual(await addStudent(s.both, s.teacher, { name: "C", email: "c@x.com", answers: ANSWERS }), { ok: false, error: "limit" });
  assert.equal((await listStudents(s.both, s.teacher)).limit, 2);
});

test("no limit when the plan's students is null; no plan row or 0 refuses; an owner is limited by their own plan", async () => {
  const none = await setup({ students: null });
  for (const e of ["a", "b", "c", "d"]) ok(await addStudent(none.both, none.teacher, { name: e, email: `${e}@x.com`, answers: ANSWERS }));
  assert.equal((await listStudents(none.both, none.teacher)).limit, null);

  const zero = await setup({ planId: "teacher-zero" });
  assert.deepEqual(await addStudent(zero.both, zero.teacher, { name: "A", email: "a@x.com", answers: ANSWERS }), { ok: false, error: "limit" });

  const noPlan = await setup({ planId: null });
  assert.deepEqual(await addStudent(noPlan.both, noPlan.teacher, { name: "A", email: "a@x.com", answers: ANSWERS }), { ok: false, error: "limit" });
  assert.equal((await listStudents(noPlan.both, noPlan.teacher)).limit, 0);

  const owner = await setup({ role: "owner", students: 1 });
  ok(await addStudent(owner.both, owner.teacher, { name: "A", email: "a@x.com", answers: ANSWERS }));
  assert.deepEqual(await addStudent(owner.both, owner.teacher, { name: "B", email: "b@x.com", answers: ANSWERS }), { ok: false, error: "limit" });
});

test("an email that has an account is refused and leaves no link, no document, no token; so is the teacher's own", async () => {
  const s = await setup();
  const own = await addStudent(s.both, s.teacher, { name: "T", email: "TESS@school.com", answers: ANSWERS });
  assert.deepEqual(own, { ok: false, error: "exists" });
  ok(await addStudent(s.both, s.teacher, { name: "A", email: "a@x.com", answers: ANSWERS }));
  const before = { users: s.users.length, links: s.links.length, tokens: s.tokens.length };
  assert.deepEqual(await addStudent(s.both, s.teacher, { name: "A2", email: "a@x.com", answers: ANSWERS }), { ok: false, error: "exists" });
  assert.deepEqual({ users: s.users.length, links: s.links.length, tokens: s.tokens.length }, before);
});

test("a lost race on the email is exists", async () => {
  const s = await setup();
  const racing: AuthRepo = { ...s.repo, createUser: async () => null };
  const r = await addStudent({ auth: { ...s.deps, repo: racing }, userData: s.userData }, s.teacher, { name: "A", email: "a@x.com", answers: ANSWERS });
  assert.deepEqual(r, { ok: false, error: "exists" });
});

test("a step that throws after the user was made deletes the user", async () => {
  const s = await setup();
  const broken: AuthRepo = { ...s.repo, addStudent: async () => { throw new Error("db down"); } };
  await assert.rejects(addStudent({ auth: { ...s.deps, repo: broken }, userData: s.userData }, s.teacher, { name: "A", email: "a@x.com", answers: ANSWERS }), /db down/);
  assert.equal(await s.repo.userByEmail("a@x.com"), null);
  assert.equal(s.users.length, 1);
  assert.equal(s.tokens.length, 0);
});

test("a document write that fails also deletes the user", async () => {
  const s = await setup();
  const brokenData = { ...s.userData, putDoc: async () => { throw new Error("docs down"); } };
  await assert.rejects(addStudent({ auth: s.deps, userData: brokenData }, s.teacher, { name: "A", email: "a@x.com", answers: ANSWERS }), /docs down/);
  assert.equal(await s.repo.userByEmail("a@x.com"), null);
  assert.equal(s.links.length, 0);
});

test("openClaim signs in once, sets claimedAt, and goes to /welcome", async () => {
  const s = await setup();
  const r = ok(await addStudent(s.both, s.teacher, { name: "Ben", email: "ben@home.com", answers: ANSWERS }));
  assert.deepEqual(await peekClaim(s.deps, r.claimToken), { name: "Ben" });
  s.wait(5 * MINUTE);
  const done = await openClaim(s.deps, r.claimToken, "Firefox");
  assert.ok(done);
  assert.equal(done.next, "/welcome");
  assert.equal(done.account.id, r.studentId);
  assert.equal(done.expiresAt.getTime(), START + 5 * MINUTE + SESSION_TTL);
  assert.equal((await s.repo.studentLink(s.teacher.id, r.studentId))?.claimedAt?.getTime(), START + 5 * MINUTE);
  assert.equal(await openClaim(s.deps, r.claimToken, null), null);
  assert.equal(await peekClaim(s.deps, r.claimToken), null);
  assert.equal(await openClaim(s.deps, "made-up", null), null);
  assert.equal(await peekClaim(s.deps, "made-up"), null);
});

test("an expired claim is null", async () => {
  const s = await setup();
  const r = ok(await addStudent(s.both, s.teacher, { name: "Ben", email: "ben@home.com", answers: ANSWERS }));
  s.wait(CLAIM_TTL + 1);
  assert.equal(await peekClaim(s.deps, r.claimToken), null);
  assert.equal(await openClaim(s.deps, r.claimToken, null), null);
  assert.equal((await s.repo.studentLink(s.teacher.id, r.studentId))?.claimedAt, null);
});

test("a mailed log-in link token is not a claim token", async () => {
  const s = await setup();
  const r = ok(await addStudent(s.both, s.teacher, { name: "Ben", email: "ben@home.com", answers: ANSWERS }));
  await s.repo.createToken({ kind: "email_link", tokenHash: hashToken("other"), codeHash: null, email: "ben@home.com", name: null, role: null, provider: null, providerAccountId: null, next: null, expiresAt: new Date(START + MINUTE) }, new Date(START));
  assert.equal(await openClaim(s.deps, "other", null), null);
  assert.ok(await openClaim(s.deps, r.claimToken, null));
});

test("newClaimLink: own unclaimed student, one a minute; not another teacher's; not a claimed one", async () => {
  const s = await setup();
  const r = ok(await addStudent(s.both, s.teacher, { name: "Ben", email: "ben@home.com", answers: ANSWERS }));
  assert.deepEqual(await newClaimLink(s.both, s.teacher, r.studentId), { ok: false, error: "wait", waitMs: MINUTE });
  s.wait(MINUTE);
  const again = ok(await newClaimLink(s.both, s.teacher, r.studentId));
  assert.equal(again.email, "ben@home.com");
  assert.equal(again.name, "Ben");
  assert.deepEqual(await newClaimLink(s.both, s.teacher, r.studentId), { ok: false, error: "wait", waitMs: MINUTE });
  assert.deepEqual(await peekClaim(s.deps, again.claimToken), { name: "Ben" });

  const other = await s.repo.createUser({ email: "olly@school.com", name: "Olly", role: "teacher" }, new Date(START));
  assert.deepEqual(await newClaimLink(s.both, toAccount(other!), r.studentId), { ok: false, error: "not-found" });
  assert.deepEqual(await newClaimLink(s.both, s.teacher, "nobody"), { ok: false, error: "not-found" });

  s.wait(MINUTE);
  assert.ok(await openClaim(s.deps, again.claimToken, null));
  s.wait(MINUTE);
  assert.deepEqual(await newClaimLink(s.both, s.teacher, r.studentId), { ok: false, error: "claimed" });
});

test("listStudents: newest first, with the dates and the limit", async () => {
  const s = await setup({ students: 5 });
  const a = ok(await addStudent(s.both, s.teacher, { name: "A", email: "a@x.com", answers: ANSWERS }));
  s.wait(MINUTE);
  const b = ok(await addStudent(s.both, s.teacher, { name: "B", email: "b@x.com", answers: ANSWERS }));
  s.wait(MINUTE);
  await openClaim(s.deps, a.claimToken, null);
  const list = await listStudents(s.both, s.teacher);
  assert.equal(list.limit, 5);
  assert.deepEqual(list.students, [
    { id: b.studentId, name: "B", email: "b@x.com", addedAt: new Date(START + MINUTE).toISOString(), claimedAt: null },
    { id: a.studentId, name: "A", email: "a@x.com", addedAt: new Date(START).toISOString(), claimedAt: new Date(START + 2 * MINUTE).toISOString() },
  ]);
});
