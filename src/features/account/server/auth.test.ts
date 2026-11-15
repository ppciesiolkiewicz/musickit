import { test } from "node:test";
import assert from "node:assert/strict";
import type { Plan } from "../plans";
import {
  AFTER_LOGIN,
  accountPlans,
  choosePlan,
  CODE_TRIES,
  LINK_DAY_LIMIT,
  LINK_LIMIT,
  RESEND_WAIT,
  LINK_WINDOW,
  LINK_TTL,
  SESSION_TTL,
  googleSignIn,
  hashToken,
  openEmailCode,
  openEmailLink,
  rename,
  requestEmailLink,
  safeNext,
  peekSession,
  sessionAccount,
  signOut,
  startName,
  type AuthDeps,
  type GoogleProfile,
} from "./auth";
import { memoryRepo } from "./repo.memory";

const START = Date.UTC(2026, 10, 11, 12, 0, 0);

/** Deps over the memory repo, with a clock the test moves, tokens "t1", "t2", ... and codes "100001", "100002", ... */
function setup() {
  const store = memoryRepo();
  let time = START;
  let n = 0;
  let c = 100_000;
  const deps: AuthDeps = { repo: store.repo, now: () => new Date(time), token: () => `t${++n}`, code: () => String(++c) };
  return { ...store, deps, wait: (ms: number) => void (time += ms) };
}

const ann: GoogleProfile = { sub: "g-1", email: "Ann@School.com", emailVerified: true, name: "Ann Lee" };

async function link(deps: AuthDeps, input: Parameters<typeof requestEmailLink>[1]) {
  const r = await requestEmailLink(deps, input);
  assert.ok(r.ok);
  return r.token;
}

/** A new account by a mailed link, then its name set on /account. */
async function signUp(deps: AuthDeps, email: string, name: string, next?: string) {
  const done = await openEmailLink(deps, await link(deps, { email, next }), "Firefox");
  assert.ok(done?.created);
  assert.ok(await rename(deps, done.account.id, name));
  return done;
}

test("a link for a new email makes a student account, named from the email, and signs in", async () => {
  const { deps, users, tokens } = setup();
  const token = await link(deps, { email: " Ann@School.com ", next: "/plan" });
  assert.equal(tokens[0].tokenHash, hashToken(token), "only the hash is stored");

  const done = await openEmailLink(deps, token, "Firefox");
  assert.ok(done?.kind === "session");
  assert.equal(done.created, true);
  assert.equal(done.next, "/plan");
  assert.deepEqual({ ...done.account, id: "" }, { id: "", name: "ann", email: "ann@school.com", role: "student", createdAt: new Date(START).toISOString() });
  assert.equal((await sessionAccount(deps, done.sessionToken))?.account.email, "ann@school.com");
  assert.equal(users.length, 1);
});

test("a new account's first name: Google's, or the email before the @", () => {
  assert.equal(startName("ann.lee@school.com"), "ann.lee");
  assert.equal(startName("ann@school.com", "  Ann   Lee "), "Ann Lee");
  assert.equal(startName("ann@school.com", "   "), "ann");
});

test("a link works once, and not after it expires", async () => {
  const { deps, wait } = setup();
  const first = await link(deps, { email: "ann@school.com" });
  assert.ok(await openEmailLink(deps, first, null));
  assert.equal(await openEmailLink(deps, first, null), null);

  wait(RESEND_WAIT);
  const second = await link(deps, { email: "ann@school.com" });
  wait(LINK_TTL + 1);
  assert.equal(await openEmailLink(deps, second, null), null);
  assert.equal(await openEmailLink(deps, "made-up", null), null);
  assert.equal(await openEmailLink(deps, undefined, null), null);
});

test("a link for an email with an account signs in to it", async () => {
  const { deps, users, wait } = setup();
  await signUp(deps, "ann@school.com", "Ann");
  wait(RESEND_WAIT);
  const again = await openEmailLink(deps, await link(deps, { email: "ann@school.com" }), null);
  assert.ok(again?.kind === "session");
  assert.equal(again.created, false);
  assert.equal(again.account.name, "Ann");
  assert.equal(again.next, AFTER_LOGIN);
  assert.equal(users.length, 1);
});

test("a new link to the same email waits RESEND_WAIT after the last one", async () => {
  const { deps, wait } = setup();
  assert.ok((await requestEmailLink(deps, { email: "a@b.co" })).ok);
  wait(20_000);
  assert.deepEqual(await requestEmailLink(deps, { email: "A@B.co" }), { ok: false, error: "wait", waitMs: RESEND_WAIT - 20_000 });
  assert.ok((await requestEmailLink(deps, { email: "other@b.co" })).ok, "another email is not held back");
  wait(RESEND_WAIT - 20_000);
  assert.ok((await requestEmailLink(deps, { email: "a@b.co" })).ok);
});

test("requesting a link checks the email and is limited per email", async () => {
  const { deps, wait } = setup();
  assert.deepEqual(await requestEmailLink(deps, { email: "ann" }), { ok: false, error: "email" });
  assert.deepEqual(await requestEmailLink(deps, { email: 7 }), { ok: false, error: "email" });
  for (let i = 0; i < LINK_LIMIT; i++) {
    assert.ok((await requestEmailLink(deps, { email: "a@b.co" })).ok);
    wait(RESEND_WAIT);
  }
  assert.deepEqual(await requestEmailLink(deps, { email: "A@B.co" }), { ok: false, error: "limit" });
  assert.ok((await requestEmailLink(deps, { email: "other@b.co" })).ok, "another email is not held back");
});

test("requesting links is also limited per day", async () => {
  const { deps, wait } = setup();
  for (let i = 0; i < LINK_DAY_LIMIT; i++) {
    if (i && i % LINK_LIMIT === 0) wait(LINK_WINDOW + 1);
    assert.ok((await requestEmailLink(deps, { email: "a@b.co" })).ok);
    wait(RESEND_WAIT);
  }
  wait(LINK_WINDOW + 1);
  assert.deepEqual(await requestEmailLink(deps, { email: "a@b.co" }), { ok: false, error: "daily" });
  wait(24 * 3600_000);
  assert.ok((await requestEmailLink(deps, { email: "a@b.co" })).ok);
});

test("the mailed code signs in like the link, once, for its own email, and is stored hashed", async () => {
  const { deps, tokens, wait } = setup();
  const sent = await requestEmailLink(deps, { email: "Ann@School.com", next: "/plan" });
  assert.ok(sent.ok);
  assert.equal(sent.code, "100001");
  assert.ok(!JSON.stringify(tokens).includes("100001"), "the code is not stored as typed");

  assert.equal(await openEmailCode(deps, { email: "bob@school.com", code: "100001" }, null), null, "another email's code proves nothing");
  const r = await openEmailCode(deps, { email: " ann@school.com", code: "100 001" }, null);
  assert.ok(r?.kind === "session" && r.created);
  assert.equal(r.next, "/plan");
  assert.equal(await openEmailCode(deps, { email: "ann@school.com", code: "100001" }, null), null, "used once");
  assert.equal(await openEmailLink(deps, sent.token, null), null, "the code and the link are one proof");

  wait(RESEND_WAIT);
  const late = await requestEmailLink(deps, { email: "ann@school.com" });
  assert.ok(late.ok);
  wait(LINK_TTL + 1);
  assert.equal(await openEmailCode(deps, { email: "ann@school.com", code: late.code }, null), null, "expired");
  assert.equal(await openEmailCode(deps, { email: "ann@school.com", code: "12345" }, null), null);
  assert.equal(await openEmailCode(deps, { email: "ann@school.com", code: 100002 }, null), null);
});

test("a code stops working after its wrong tries, even the right one", async () => {
  const { deps, wait } = setup();
  const sent = await requestEmailLink(deps, { email: "ann@school.com" });
  assert.ok(sent.ok);
  for (let i = 0; i < CODE_TRIES - 1; i++) assert.equal(await openEmailCode(deps, { email: "ann@school.com", code: "999999" }, null), null);
  assert.ok(await openEmailCode(deps, { email: "ann@school.com", code: sent.code }, null), "the last try still works");

  wait(RESEND_WAIT);
  const again = await requestEmailLink(deps, { email: "ann@school.com" });
  assert.ok(again.ok);
  for (let i = 0; i < CODE_TRIES; i++) await openEmailCode(deps, { email: "ann@school.com", code: "999999" }, null);
  assert.equal(await openEmailCode(deps, { email: "ann@school.com", code: again.code }, null), null);
  assert.ok(await openEmailLink(deps, again.token, null), "the link in the same email still works");
});

test("Google: a new person gets an account with Google's name, and the next time is known by the Google id", async () => {
  const { deps, users, identities } = setup();
  const done = await googleSignIn(deps, ann, { next: "/creator", userAgent: null });
  assert.ok(done?.kind === "session");
  assert.equal(done.created, true);
  assert.equal(done.next, "/creator");
  assert.deepEqual([done.account.name, done.account.email, done.account.role], ["Ann Lee", "ann@school.com", "student"]);
  assert.deepEqual(identities, [{ userId: done.account.id, provider: "google", providerAccountId: "g-1" }]);

  // the email at Google changed; the id still finds the account
  const second = await googleSignIn(deps, { ...ann, email: "ann.new@school.com" }, { userAgent: null });
  assert.ok(second?.kind === "session");
  assert.equal(second.account.id, done.account.id);
  assert.equal(users.length, 1);
  assert.equal(identities.length, 1);
});

test("Google: an email that already has an account signs in to it and is linked", async () => {
  const { deps, users, identities } = setup();
  const byMail = await signUp(deps, "ann@school.com", "Ann");
  const byGoogle = await googleSignIn(deps, ann, { userAgent: null });
  assert.ok(byGoogle?.kind === "session");
  assert.equal(byGoogle.account.id, byMail.account.id);
  assert.equal(byGoogle.account.name, "Ann", "Google's name does not change an account");
  assert.equal(users.length, 1);
  assert.equal(identities.length, 1);
});

test("Google: an email Google has not verified proves nothing", async () => {
  const { deps, users } = setup();
  assert.equal(await googleSignIn(deps, { ...ann, emailVerified: false }, { userAgent: null }), null);
  assert.equal(users.length, 0);
});

test("a session ends on log out and after its life, and is renewed when used a day later", async () => {
  const { deps, sessions, wait } = setup();
  const r = await signUp(deps, "ann@school.com", "Ann");
  assert.equal(r.expiresAt.getTime(), START + SESSION_TTL);
  assert.equal((await sessionAccount(deps, r.sessionToken))?.renewed, null, "not renewed on every request");

  wait(2 * 24 * 3600_000);
  const later = await sessionAccount(deps, r.sessionToken);
  assert.equal(later?.renewed?.getTime(), START + 2 * 24 * 3600_000 + SESSION_TTL);
  assert.equal(sessions[0].expiresAt.getTime(), later?.renewed?.getTime());

  wait(SESSION_TTL + 1);
  assert.equal(await sessionAccount(deps, r.sessionToken), null);

  const again = await openEmailLink(deps, await link(deps, { email: "ann@school.com" }), null);
  assert.ok(again?.kind === "session");
  await signOut(deps, again.sessionToken);
  assert.equal(await sessionAccount(deps, again.sessionToken), null);
  assert.equal(await sessionAccount(deps, ""), null);
});

test("renaming and deleting an account", async () => {
  const { deps, users, sessions } = setup();
  const r = await signUp(deps, "ann@school.com", "Ann");
  assert.equal((await rename(deps, r.account.id, "  Ann  B "))?.name, "Ann B");
  assert.equal(await rename(deps, r.account.id, "   "), null);
  assert.equal(await rename(deps, "nobody", "X"), null);
  await deps.repo.deleteUser(r.account.id);
  assert.equal(users.length, 0);
  assert.equal(sessions.length, 0);
  assert.equal(await sessionAccount(deps, r.sessionToken), null);
});

test("the page to open next is always on this site", () => {
  assert.equal(safeNext("/plan?day=2#top"), "/plan?day=2#top");
  for (const bad of ["//evil.com", "/\\evil.com", "https://evil.com", "plan", "", "/a b", null, 5, `/${"x".repeat(600)}`]) assert.equal(safeNext(bad), null, String(bad));
});

test("with nowhere else to go, logging in lands on the plan", () => {
  assert.equal(AFTER_LOGIN, "/plan");
});

test("peekSession finds the account without renewing the session", async () => {
  const { deps, sessions, wait } = setup();
  const r = await signUp(deps, "ann@school.com", "Ann");
  wait(2 * 24 * 3600_000);
  assert.equal((await peekSession(deps, r.sessionToken))?.email, "ann@school.com");
  assert.equal(sessions[0].expiresAt.getTime(), START + SESSION_TTL, "not renewed");
  assert.equal(await peekSession(deps, "nope"), null);
  assert.equal(await peekSession(deps, undefined), null);
});

const PLAN = { priceCents: 1500, period: "month", students: 10, autoplansPerMonth: 40, planModel: "claude-haiku-5-5", noteModel: "claude-haiku-5-5", batch: false } as const;
const PLANS: Plan[] = [
  { ...PLAN, id: "teacher-pro", name: "Teacher Pro", role: "teacher", enabled: true, sort: 2 },
  { ...PLAN, id: "student", name: "Student", role: "student", enabled: true, sort: 0 },
  { ...PLAN, id: "teacher-old", name: "Old", role: "teacher", enabled: false, sort: 1 },
];

test("a new account is on Student and sees the enabled plans in order", async () => {
  const store = memoryRepo(PLANS);
  const deps: AuthDeps = { ...setup().deps, repo: store.repo };
  const { account } = await signUp(deps, "ann@school.com", "Ann");
  const seen = await accountPlans(deps, account.id);
  assert.equal(seen?.current, "student");
  assert.deepEqual(seen?.plans.map((p) => p.id), ["student", "teacher-pro"]);
  assert.equal(await accountPlans(deps, "nobody"), null);
});

test("choosing a Teacher plan makes a student a teacher, and back; an owner stays an owner", async () => {
  const store = memoryRepo(PLANS);
  const deps: AuthDeps = { ...setup().deps, repo: store.repo };
  const { account } = await signUp(deps, "ann@school.com", "Ann");
  const teacher = await choosePlan(deps, account, "teacher-pro");
  assert.equal(teacher?.role, "teacher");
  assert.equal(await store.repo.userPlanId(account.id), "teacher-pro");
  assert.equal((await choosePlan(deps, teacher!, "student"))?.role, "student");
  const owner = { ...account, role: "owner" as const };
  assert.equal((await choosePlan(deps, owner, "teacher-pro"))?.role, "owner");
});

test("a turned-off plan, an unknown one or the current one can't be chosen, and the one you are on stays shown when turned off", async () => {
  const store = memoryRepo(PLANS);
  const deps: AuthDeps = { ...setup().deps, repo: store.repo };
  const { account } = await signUp(deps, "ann@school.com", "Ann");
  assert.equal(await choosePlan(deps, account, "teacher-old"), null);
  assert.equal(await choosePlan(deps, account, "nope"), null);
  assert.equal(await choosePlan(deps, account, "student"), null);
  store.planOf.set(account.id, "teacher-old");
  assert.deepEqual((await accountPlans(deps, account.id))?.plans.map((p) => p.id), ["student", "teacher-old", "teacher-pro"]);
});
