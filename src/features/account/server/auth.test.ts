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
  pathAfterSignIn,
  safeNext,
  setEmailUpdates,
  setUpAccount,
  sessionAccount,
  signOut,
  startName,
  toAccount,
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
  assert.deepEqual({ ...done.account, id: "" }, { id: "", name: "ann", email: "ann@school.com", role: "student", permissions: [], createdAt: new Date(START).toISOString(), needsSetup: true, emailUpdates: false, taught: false });
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

test("emails about what we fix and add: off for a new account, on from the first yes, and off again", async () => {
  const { deps, users, wait } = setup();
  const r = await signUp(deps, "ann@school.com", "Ann");
  assert.equal(r.account.emailUpdates, false);
  assert.equal((await setEmailUpdates(deps, r.account.id, true))?.emailUpdates, true);
  const first = users[0].emailUpdatesAt;
  assert.equal(first?.getTime(), START);
  wait(60_000);
  await setEmailUpdates(deps, r.account.id, true);
  assert.equal(users[0].emailUpdatesAt, first, "a second yes keeps the time of the first");
  assert.equal((await setEmailUpdates(deps, r.account.id, false))?.emailUpdates, false);
  assert.equal(users[0].emailUpdatesAt, null);
  assert.equal(await setEmailUpdates(deps, r.account.id, "yes"), null);
  assert.equal(await setEmailUpdates(deps, "nobody", true), null);
});

test("setup: the box turns the emails on or off; left out, they stay as they were", async () => {
  const store = memoryRepo(PLANS);
  const deps: AuthDeps = { ...setup().deps, repo: store.repo };
  const { account } = await signUp(deps, "ann@school.com", "Ann");
  const off = await setUpAccount(deps, account, { name: "Ann", planId: "student", billing: "year", acceptTerms: true, emailUpdates: false });
  assert.ok(off.ok && !off.account.emailUpdates);
  const on = await setUpAccount(deps, account, { name: "Ann", planId: "student", billing: "year", acceptTerms: true, emailUpdates: true });
  assert.ok(on.ok && on.account.emailUpdates);
  const kept = await setUpAccount(deps, account, { name: "Ann", planId: "student", billing: "year", acceptTerms: true });
  assert.ok(kept.ok && kept.account.emailUpdates);
  const offAgain = await setUpAccount(deps, account, { name: "Ann", planId: "student", billing: "year", acceptTerms: true, emailUpdates: false });
  assert.ok(offAgain.ok && !offAgain.account.emailUpdates);
});

test("setup: the terms of use must be agreed to, before anything is saved, and are kept with their date", async () => {
  const store = memoryRepo(PLANS);
  const deps: AuthDeps = { ...setup().deps, repo: store.repo };
  const { account } = await signUp(deps, "ann@school.com", "Ann");
  for (const acceptTerms of [undefined, false, "yes"]) {
    assert.deepEqual(await setUpAccount(deps, account, { name: "Ann Lee", planId: "student", billing: "year", acceptTerms }), { ok: false, error: "terms" });
  }
  assert.equal(store.users[0].name, "Ann", "a refused setup changes nothing");
  assert.equal(store.users[0].planId, null);
  assert.equal(store.users[0].termsAcceptedAt, null);
  assert.ok((await setUpAccount(deps, account, { name: "Ann Lee", planId: "student", billing: "year", acceptTerms: true }, false)).ok);
  assert.equal(store.users[0].termsVersion, 5, "the beta terms, with payments off");
  assert.notEqual(store.users[0].termsAcceptedAt, null);
});

test("setup with payments on saves the paid terms' version", async () => {
  const store = memoryRepo(PLANS);
  const deps: AuthDeps = { ...setup().deps, repo: store.repo };
  const { account } = await signUp(deps, "ann@school.com", "Ann");
  assert.ok((await setUpAccount(deps, account, { name: "Ann Lee", planId: "student", billing: "year", acceptTerms: true }, true)).ok);
  assert.equal(store.users[0].termsVersion, 6);
});

test("the page to open next is always on this site", () => {
  assert.equal(safeNext("/plan?day=2#top"), "/plan?day=2#top");
  for (const bad of ["//evil.com", "/\\evil.com", "https://evil.com", "plan", "", "/a b", null, 5, `/${"x".repeat(600)}`]) assert.equal(safeNext(bad), null, String(bad));
});

test("with nowhere else to go, logging in lands on the plan", () => {
  assert.equal(AFTER_LOGIN, "/plan");
});

const PLAN = { monthCents: 1500, yearCents: 12000, trialDays: 14, students: 10, extraStudents: 0, autoplansPerMonth: 40, batch: false } as const;
const PLANS: Plan[] = [
  { ...PLAN, id: "teacher-pro", name: "Teacher Pro", role: "teacher", enabled: true, sort: 2 },
  { ...PLAN, id: "student", name: "Student", role: "student", enabled: true, sort: 0 },
  { ...PLAN, id: "teacher-old", name: "Old", role: "teacher", enabled: false, sort: 1 },
  { ...PLAN, id: "teacher-unlimited", name: "Teacher Unlimited", role: "teacher", monthCents: 0, yearCents: 0, students: null, enabled: true, sort: 3 },
];

test("a new account has no plan yet and sees the enabled plans in order", async () => {
  const store = memoryRepo(PLANS);
  const deps: AuthDeps = { ...setup().deps, repo: store.repo };
  const { account } = await signUp(deps, "ann@school.com", "Ann");
  assert.equal(account.needsSetup, true);
  const seen = await accountPlans(deps, account.id);
  assert.equal(seen?.current, null);
  assert.deepEqual(seen?.plans.map((p) => p.id), ["student", "teacher-pro", "teacher-unlimited"]);
  assert.equal(await accountPlans(deps, "nobody"), null);
  assert.deepEqual(seen?.early, { individual: true, teachers: true }, "the early price shows in the beta");
});

test("choosing a Teacher plan makes a student a teacher, and back; an owner stays an owner", async () => {
  const store = memoryRepo(PLANS);
  const deps: AuthDeps = { ...setup().deps, repo: store.repo };
  const { account } = await signUp(deps, "ann@school.com", "Ann");
  const teacher = await choosePlan(deps, account, "teacher-pro", "year");
  assert.equal(teacher?.role, "teacher");
  assert.equal(teacher?.needsSetup, false);
  assert.equal((await store.repo.userById(account.id))?.planId, "teacher-pro");
  assert.equal((await choosePlan(deps, teacher!, "student", "year"))?.role, "student");
  const owner = { ...account, role: "owner" as const };
  store.users.find((u) => u.id === account.id)!.role = "owner";
  assert.equal((await choosePlan(deps, owner, "teacher-pro", "year"))?.role, "owner");
});

test("a turned-off plan, an unknown one or the current one can't be chosen, and the one you are on stays shown when turned off", async () => {
  const store = memoryRepo(PLANS);
  const deps: AuthDeps = { ...setup().deps, repo: store.repo };
  const { account } = await signUp(deps, "ann@school.com", "Ann");
  assert.equal(await choosePlan(deps, account, "teacher-old", "year"), null);
  assert.equal(await choosePlan(deps, account, "nope", "year"), null);
  assert.ok(await choosePlan(deps, account, "student", "year"));
  assert.equal(await choosePlan(deps, account, "student", "year"), null);
  assert.equal(await choosePlan(deps, account, "student", "week"), null, "no billing");
  assert.ok(await choosePlan(deps, account, "student", "month"), "the same plan paid the other way");
  assert.equal((await accountPlans(deps, account.id))?.billing, "month");
  store.users.find((u) => u.id === account.id)!.planId = "teacher-old";
  assert.deepEqual((await accountPlans(deps, account.id))?.plans.map((p) => p.id), ["student", "teacher-old", "teacher-pro", "teacher-unlimited"]);
});

test("setup: a new account's name and plan in one step; a bad plan changes nothing", async () => {
  const store = memoryRepo(PLANS);
  const deps: AuthDeps = { ...setup().deps, repo: store.repo };
  const done = await openEmailLink(deps, await link(deps, { email: "ann@school.com" }), null);
  assert.ok(done);
  assert.equal(done.account.needsSetup, true);

  assert.deepEqual(await setUpAccount(deps, done.account, { name: "  ", planId: "student", billing: "year", acceptTerms: true }), { ok: false, error: "name" });
  assert.deepEqual(await setUpAccount(deps, done.account, { name: "Ann", planId: "teacher-old", billing: "year", acceptTerms: true }), { ok: false, error: "plan" });
  assert.deepEqual(await setUpAccount(deps, done.account, { name: "Ann", planId: "nope", billing: "year", acceptTerms: true }), { ok: false, error: "plan" });
  assert.equal(store.users.find((u) => u.id === done.account.id)?.name, "ann", "nothing changed");

  assert.equal((await sessionAccount(deps, done.sessionToken))?.account.needsSetup, true, "still no plan");

  const chose = await setUpAccount(deps, done.account, { name: "Ann", planId: "student", billing: "year", acceptTerms: true });
  assert.ok(chose.ok);
  assert.deepEqual([chose.account.name, chose.account.role, chose.account.needsSetup], ["Ann", "student", false]);
  const kept = await setUpAccount(deps, chose.account, { name: "Ann", planId: "student", billing: "year", acceptTerms: true });
  assert.ok(kept.ok, "the plan you are on can be kept");

  const moved = await setUpAccount(deps, kept.account, { name: "Ann Lee", planId: "teacher-pro", billing: "year", acceptTerms: true });
  assert.ok(moved.ok);
  assert.deepEqual([moved.account.name, moved.account.role], ["Ann Lee", "teacher"]);
  assert.equal((await store.repo.userById(done.account.id))?.planId, "teacher-pro");
});

test("choosing a plan priced with you, at setup or later, records one request we write to them about", async () => {
  const store = memoryRepo(PLANS);
  const t = setup();
  const deps: AuthDeps = { ...t.deps, repo: store.repo };
  const done = await openEmailLink(deps, await link(deps, { email: "ann@school.com" }), null);
  assert.ok(done);
  const chose = await setUpAccount(deps, done.account, { name: "Ann", planId: "teacher-pro", billing: "year", acceptTerms: true });
  assert.ok(chose.ok);
  assert.equal((await accountPlans(deps, done.account.id))?.request, null, "a priced plan asks nothing");

  const unlimited = await choosePlan(deps, chose.account, "teacher-unlimited", "month");
  assert.equal(unlimited?.role, "teacher");
  const at = new Date(START).toISOString();
  assert.deepEqual((await accountPlans(deps, done.account.id))?.request, { planId: "teacher-unlimited", at });

  t.wait(60_000);
  await choosePlan(deps, unlimited!, "teacher-pro", "year");
  await choosePlan(deps, unlimited!, "teacher-unlimited", "year");
  assert.deepEqual((await accountPlans(deps, done.account.id))?.request, { planId: "teacher-unlimited", at }, "the first request stays");
  assert.equal(store.planRequests.length, 1);

  const other = await openEmailLink(deps, await link(deps, { email: "bo@school.com" }), null);
  assert.ok(other);
  assert.ok((await setUpAccount(deps, other.account, { name: "Bo", planId: "teacher-unlimited", billing: "year", acceptTerms: true })).ok);
  assert.equal((await accountPlans(deps, other.account.id))?.request?.planId, "teacher-unlimited", "setup records it too");
});

test("paying for the same plan the other way changes the billing and never the role", async () => {
  const store = memoryRepo(PLANS);
  const deps: AuthDeps = { ...setup().deps, repo: store.repo };
  const { account } = await signUp(deps, "ann@school.com", "Ann");
  const student = await choosePlan(deps, account, "student", "year");
  assert.ok(student);
  store.users.find((u) => u.id === account.id)!.role = "teacher";
  const teacher = { ...student, role: "teacher" as const };
  assert.equal((await choosePlan(deps, teacher, "student", "month"))?.role, "teacher", "a billing switch keeps a hand-made teacher");
  assert.equal((await store.repo.userById(account.id))?.billing, "month");
  const owner = { ...teacher, role: "owner" as const };
  store.users.find((u) => u.id === account.id)!.role = "owner";
  assert.equal((await choosePlan(deps, owner, "student", "year"))?.role, "owner");
  store.users.find((u) => u.id === account.id)!.planId = "teacher-old";
  assert.ok(await choosePlan(deps, owner, "teacher-old", "month"), "your own plan, turned off, can switch billing");
});

test("setup: a missing billing changes nothing; the same plan the other way changes the billing", async () => {
  const store = memoryRepo(PLANS);
  const deps: AuthDeps = { ...setup().deps, repo: store.repo };
  const { account } = await signUp(deps, "ann@school.com", "Ann");
  assert.deepEqual(await setUpAccount(deps, account, { name: "Ann Lee", planId: "student", billing: undefined, acceptTerms: true }), { ok: false, error: "plan" });
  assert.equal((await store.repo.userById(account.id))?.name, "Ann", "nothing changed");
  const chose = await setUpAccount(deps, account, { name: "Ann", planId: "student", billing: "year", acceptTerms: true });
  assert.ok(chose.ok);
  const switched = await setUpAccount(deps, chose.account, { name: "Ann", planId: "student", billing: "month", acceptTerms: true });
  assert.ok(switched.ok);
  assert.equal((await store.repo.userById(account.id))?.billing, "month");
});

test("an account with no plan goes to setup after every sign-in, then straight to the page", async () => {
  const store = memoryRepo(PLANS);
  const deps: AuthDeps = { ...setup().deps, repo: store.repo };
  const first = await googleSignIn(deps, ann, { next: "/notes", userAgent: null });
  assert.ok(first);
  assert.equal(first.account.name, "Ann Lee", "Google's name, for the setup page to keep");
  assert.equal(pathAfterSignIn(first), "/account/setup?next=%2Fnotes");
  const again = await googleSignIn(deps, ann, { next: "/notes", userAgent: null });
  assert.equal(again && pathAfterSignIn(again), "/account/setup?next=%2Fnotes", "leaving setup doesn't skip it");
  assert.ok((await setUpAccount(deps, first.account, { name: "Ann Lee", planId: "student", billing: "year", acceptTerms: true })).ok);
  const done = await googleSignIn(deps, ann, { next: "/notes", userAgent: null });
  assert.equal(done && pathAfterSignIn(done), "/notes");
});

test("toAccount marks a student put on the taught plan", async () => {
  const { repo, deps } = setup();
  const user = await repo.createUser({ email: "kid@school.com", name: "Kid", role: "student" }, deps.now());
  assert.ok(user);
  assert.equal(toAccount(user).taught, false);
  assert.equal(toAccount({ ...user, planId: "student" }).taught, false);
  assert.equal(toAccount({ ...user, planId: "taught" }).taught, true);
});

test("toAccount carries the permissions", async () => {
  const { repo, deps } = setup();
  const user = await repo.createUser({ email: "dev@school.com", name: "Dev", role: "student" }, deps.now());
  assert.ok(user);
  assert.deepEqual(user.permissions, []);
  assert.deepEqual(toAccount({ ...user, permissions: ["content"] }).permissions, ["content"]);
});

test("setPermissions on the memory repo writes and returns the row", async () => {
  const { repo, deps } = setup();
  const user = await repo.createUser({ email: "dev@school.com", name: "Dev", role: "student" }, deps.now());
  assert.ok(user);
  assert.deepEqual((await repo.setPermissions(user.id, ["dev", "admin"], deps.now()))?.permissions, ["dev", "admin"]);
  assert.deepEqual((await repo.userById(user.id))?.permissions, ["dev", "admin"]);
  assert.equal(await repo.setPermissions("nobody", ["dev"], deps.now()), null);
});

test("a teacher's students: listed newest first, linked to one teacher, claimed once", async () => {
  const { repo, deps } = setup();
  const now = deps.now();
  const at = (min: number) => new Date(now.getTime() + min * 60_000);
  const teacher = (await repo.createUser({ email: "t@school.com", name: "T", role: "teacher" }, now))!;
  const other = (await repo.createUser({ email: "o@school.com", name: "O", role: "teacher" }, now))!;
  const a = (await repo.createUser({ email: "a@school.com", name: "A", role: "student" }, now))!;
  const b = (await repo.createUser({ email: "b@school.com", name: "B", role: "student" }, now))!;

  assert.equal(await repo.teacherOf(a.id), null);
  await repo.addStudent(teacher.id, a.id, at(1));
  await repo.addStudent(teacher.id, b.id, at(2));
  assert.deepEqual((await repo.studentsOf(teacher.id)).map((s) => s.user.id), [b.id, a.id]);
  assert.deepEqual(await repo.studentsOf(other.id), []);

  assert.deepEqual(await repo.studentLink(teacher.id, a.id), { createdAt: at(1), claimedAt: null });
  assert.equal(await repo.studentLink(other.id, a.id), null);
  assert.equal((await repo.teacherOf(a.id))?.id, teacher.id);

  await repo.markClaimed(a.id, at(5));
  await repo.markClaimed(a.id, at(9));
  assert.deepEqual(await repo.studentLink(teacher.id, a.id), { createdAt: at(1), claimedAt: at(5) });
  assert.equal((await repo.studentsOf(teacher.id)).find((s) => s.user.id === b.id)?.claimedAt, null);
});

test("a student has one teacher: a second link for the same student is refused", async () => {
  const { repo, deps } = setup();
  const now = deps.now();
  const t1 = (await repo.createUser({ email: "t1@school.com", name: "T", role: "teacher" }, now))!;
  const t2 = (await repo.createUser({ email: "t2@school.com", name: "T", role: "teacher" }, now))!;
  const kid = (await repo.createUser({ email: "k@school.com", name: "K", role: "student" }, now))!;
  await repo.addStudent(t1.id, kid.id, now);
  await assert.rejects(repo.addStudent(t2.id, kid.id, now));
  assert.equal((await repo.teacherOf(kid.id))?.id, t1.id);
});

test("deleting a user removes their links", async () => {
  const { repo, deps } = setup();
  const now = deps.now();
  const t = (await repo.createUser({ email: "t@school.com", name: "T", role: "teacher" }, now))!;
  const kid = (await repo.createUser({ email: "k@school.com", name: "K", role: "student" }, now))!;
  await repo.addStudent(t.id, kid.id, now);
  await repo.deleteUser(kid.id);
  assert.deepEqual(await repo.studentsOf(t.id), []);
});

test("a teacher's student who logs in the normal way, by the email link or Google, counts as having opened their link", async () => {
  const { repo, deps } = setup();
  const now = deps.now();
  const teacher = (await repo.createUser({ email: "t@school.com", name: "T", role: "teacher" }, now))!;
  const kid = async (email: string) => {
    const u = (await repo.createUser({ email, name: "K", role: "student" }, now))!;
    await repo.setUserPlan(u.id, "taught", "year", "student", now);
    await repo.addStudent(teacher.id, u.id, now);
    return u;
  };
  const byLink = await kid("ann@school.com");
  const byGoogle = await kid("ben@school.com");

  const signedIn = await openEmailLink(deps, await link(deps, { email: "ann@school.com" }), null);
  assert.equal(signedIn?.account.id, byLink.id);
  assert.deepEqual(await repo.studentLink(teacher.id, byLink.id), { createdAt: now, claimedAt: deps.now() });

  const google = await googleSignIn(deps, { sub: "g-ben", email: "ben@school.com", emailVerified: true, name: "Ben" }, { userAgent: null });
  assert.equal(google?.account.id, byGoogle.id);
  assert.equal((await repo.studentLink(teacher.id, byGoogle.id))?.claimedAt?.getTime(), deps.now().getTime());
});

