import { test } from "node:test";
import assert from "node:assert/strict";
import { INDIEAPPCIRCLE_PLAN_ID, PERSONAL_DEMO_PLAN_ID, TAUGHT_PLAN_ID, TEACHER_DEMO_PLAN_ID, type Plan } from "../plans";
import { accountPlans, choosePlan, hashToken, pathAfterSignIn, setUpAccount, toAccount, type AuthDeps } from "./auth";
import { joinWithInvite, listInvites, makeInvite, viewInvite } from "./invites";
import { memoryRepo } from "./repo.memory";

const BASE = { monthCents: 0, yearCents: 0, trialDays: 0, extraStudents: 0, autoplansPerMonth: 8, batch: false, sort: 0 } as const;
const PLANS: Plan[] = [
  { ...BASE, id: "student", name: "Student", role: "student", students: 0, enabled: true },
  { ...BASE, id: TEACHER_DEMO_PLAN_ID, name: "Teacher Demo", role: "teacher", students: 2, enabled: false },
  { ...BASE, id: PERSONAL_DEMO_PLAN_ID, name: "Personal Demo", role: "student", students: 0, enabled: false },
  { ...BASE, id: INDIEAPPCIRCLE_PLAN_ID, name: "IndieAppCircle", role: "student", students: 0, enabled: false },
  { ...BASE, id: "student-paid", name: "Student", role: "student", students: 0, enabled: true, monthCents: 599, yearCents: 3600 },
  { ...BASE, id: TAUGHT_PLAN_ID, name: "Student of a teacher", role: "student", students: 0, enabled: false },
];

function setup() {
  const store = memoryRepo(PLANS);
  let n = 0;
  const deps: AuthDeps = { repo: store.repo, now: () => new Date(Date.UTC(2026, 10, 18)), token: () => `t${++n}`, code: () => "100000" };
  const person = async (email: string, planId: string | null = null, role: "student" | "teacher" | "owner" = "student") => {
    const u = await store.repo.createUser({ email, name: email.split("@")[0], role }, deps.now());
    assert.ok(u);
    if (planId) await store.repo.setUserPlan(u.id, planId, "year", role, deps.now());
    return toAccount((await store.repo.userById(u.id))!);
  };
  return { ...store, deps, person };
}

test("an invite is found by its token's hash, keeps its token and lists who it is for", async () => {
  const { deps, invites } = setup();
  const { token, invite } = await makeInvite(deps, "  Ann   at Ridge school ");
  assert.equal(token, "t1");
  assert.equal(invites[0].tokenHash, hashToken("t1"));
  assert.equal(invite.note, "Ann at Ridge school");
  assert.equal(invite.planId, TEACHER_DEMO_PLAN_ID);
  assert.deepEqual((await listInvites(deps)).map((i) => [i.id, i.token]), [[invite.id, "t1"]]);
});

test("a student joins: becomes a teacher on Teacher Demo, and the invite is theirs", async () => {
  const { deps, person } = setup();
  const { token } = await makeInvite(deps, "Ann");
  const ann = await person("ann@school.com", "student");
  assert.equal((await viewInvite(deps, ann, token)).state, "open");
  assert.equal((await viewInvite(deps, ann, token)).name, "Ann", "the invite's note names who it is for");
  const r = await joinWithInvite(deps, ann, token, {});
  assert.ok(r.ok);
  assert.equal(r.account.role, "teacher");
  assert.equal((await deps.repo.userById(ann.id))?.planId, TEACHER_DEMO_PLAN_ID);
  assert.deepEqual(await viewInvite(deps, ann, token), { state: "yours", kind: "teacher", plan: { name: "Teacher Demo", students: 2 }, name: "Ann", days: null });
  assert.ok((await joinWithInvite(deps, ann, token, {})).ok, "joining again changes nothing");
  const [listed] = await listInvites(deps);
  assert.equal(listed.claimedBy?.email, "ann@school.com");
});

test("one invite, one account", async () => {
  const { deps, person } = setup();
  const { token } = await makeInvite(deps, "");
  await joinWithInvite(deps, await person("ann@school.com", "student"), token, {});
  const bob = await person("bob@school.com", "student");
  assert.equal((await viewInvite(deps, bob, token)).state, "used");
  assert.equal((await viewInvite(deps, bob, token)).name, null, "no name from an invite made without one");
  assert.deepEqual(await joinWithInvite(deps, bob, token, {}), { ok: false, error: "used" });
  assert.equal((await deps.repo.userById(bob.id))?.planId, "student");
});

test("a new account gives its name and agrees to the terms when it joins, before the invite is taken", async () => {
  const { deps, person, invites } = setup();
  const { token } = await makeInvite(deps, "");
  const ann = await person("ann@school.com");
  assert.equal(ann.needsSetup, true);
  assert.deepEqual(await joinWithInvite(deps, ann, token, { name: " " , acceptTerms: true }), { ok: false, error: "name" });
  assert.deepEqual(await joinWithInvite(deps, ann, token, { name: "Ann Lee" }), { ok: false, error: "terms" });
  assert.equal(invites[0].claimedBy, null, "nothing taken yet");
  const r = await joinWithInvite(deps, ann, token, { name: "Ann Lee", acceptTerms: true, emailUpdates: true });
  assert.ok(r.ok);
  assert.equal(r.account.needsSetup, false);
  assert.equal(r.account.name, "Ann Lee");
  assert.equal(r.account.emailUpdates, true);
  assert.equal((await deps.repo.userById(ann.id))?.termsVersion, 5, "the beta terms, with payments off");
});

test("an owner stays an owner; a teacher's student can't join; a wrong token is not found", async () => {
  const { deps, person } = setup();
  const owner = await person("o@school.com", "student", "owner");
  const r = await joinWithInvite(deps, owner, (await makeInvite(deps, "")).token, {});
  assert.ok(r.ok);
  assert.equal(r.account.role, "owner");
  const taught = await person("kid@school.com", TAUGHT_PLAN_ID);
  assert.deepEqual(await joinWithInvite(deps, taught, (await makeInvite(deps, "")).token, {}), { ok: false, error: "taught" });
  assert.deepEqual(await joinWithInvite(deps, owner, "nope", {}), { ok: false, error: "not-found" });
  assert.deepEqual(await joinWithInvite(deps, owner, 42, {}), { ok: false, error: "not-found" });
  assert.equal((await viewInvite(deps, owner, "nope")).state, "not-found");
});

test("sign-in goes straight to an invite, not to setup", () => {
  const account = { needsSetup: true } as Parameters<typeof pathAfterSignIn>[0]["account"];
  assert.equal(pathAfterSignIn({ account, next: "/join/abc" }), "/join/abc");
  assert.equal(pathAfterSignIn({ account, next: "/plan" }), "/account/setup?next=%2Fplan");
});

test("listUsers gives every user, newest first, with their role", async () => {
  const { deps, person } = setup();
  const a = await person("a@x.test");
  const b = await person("b@x.test", null, "owner");
  const listed = await deps.repo.listUsers();
  assert.deepEqual(new Set(listed.map((u) => `${u.email}:${u.role}`)), new Set([`${a.email}:student`, `${b.email}:owner`]));
});

test("listSessionTimes: per user, the newest log-in and the newest visit over all their browsers", async () => {
  const { deps, person } = setup();
  const a = await person("a@x.test");
  const at = (d: number) => new Date(Date.UTC(2026, 10, d));
  await deps.repo.createSession({ tokenHash: "h1", userId: a.id, userAgent: null, expiresAt: at(30) }, at(1));
  await deps.repo.createSession({ tokenHash: "h2", userId: a.id, userAgent: null, expiresAt: at(30) }, at(5));
  await deps.repo.touchSession("h1", at(30), at(9));
  const mine = (await deps.repo.listSessionTimes()).find((t) => t.userId === a.id);
  assert.deepEqual(mine, { userId: a.id, lastLogin: at(5), lastSeen: at(9) });
});

test("a personal invite: a new account gives its name and agrees to the terms, then is a student on Personal Demo", async () => {
  const { deps, person } = setup();
  const { token, invite } = await makeInvite(deps, "Cat", "personal");
  assert.equal(invite.planId, PERSONAL_DEMO_PLAN_ID);
  const cat = await person("cat@mail.com");
  assert.equal((await viewInvite(deps, cat, token)).kind, "personal");
  assert.deepEqual(await joinWithInvite(deps, cat, token, { name: "Cat" }), { ok: false, error: "terms" });
  const r = await joinWithInvite(deps, cat, token, { name: "Cat", acceptTerms: true });
  assert.ok(r.ok);
  assert.equal(r.account.role, "student");
  assert.equal(r.account.needsSetup, false);
  assert.equal((await deps.repo.userById(cat.id))?.planId, PERSONAL_DEMO_PLAN_ID);
});

test("a teacher who joins with a personal invite becomes a student; an owner stays an owner", async () => {
  const { deps, person } = setup();
  const t = await makeInvite(deps, "", "personal");
  const r = await joinWithInvite(deps, await person("tom@school.com", TEACHER_DEMO_PLAN_ID, "teacher"), t.token, {});
  assert.ok(r.ok);
  assert.equal(r.account.role, "student");
  const o = await makeInvite(deps, "", "personal");
  const r2 = await joinWithInvite(deps, await person("own@school.com", "student", "owner"), o.token, {});
  assert.ok(r2.ok);
  assert.equal(r2.account.role, "owner");
});

test("an unknown kind makes a teacher invite", async () => {
  const { deps } = setup();
  assert.equal((await makeInvite(deps, "", "school")).invite.planId, TEACHER_DEMO_PLAN_ID);
});

const DAY = 24 * 60 * 60 * 1000;

/** The same repo with the clock moved on by `days`. */
const later = (deps: AuthDeps, days: number): AuthDeps => ({ ...deps, now: () => new Date(deps.now().getTime() + days * DAY) });

test("the INDIEAPPCIRCLE code: a new account joins as a student, free for 60 days, on its own invite", async () => {
  const { deps, person, invites } = setup();
  const ann = await person("ann@school.com");
  assert.deepEqual(await viewInvite(deps, ann, "indieappcircle"), { state: "open", kind: "personal", plan: { name: "IndieAppCircle", students: 0 }, name: null, days: 60 });
  assert.equal(invites.length, 0, "opening the link stores nothing");

  const r = await joinWithInvite(deps, ann, "INDIEAPPCIRCLE", { name: "Ann", acceptTerms: true }, true);
  assert.ok(r.ok);
  assert.equal(r.account.role, "student");
  assert.equal(r.account.needsSetup, false);
  assert.equal(r.account.needsPayment, false, "no Stripe with payments on");
  const user = (await deps.repo.userById(ann.id))!;
  assert.equal(user.planId, INDIEAPPCIRCLE_PLAN_ID);
  assert.equal(user.planEndsAt?.getTime(), deps.now().getTime() + 60 * DAY);
  const [own] = await listInvites(deps);
  assert.equal(own.note, "INDIEAPPCIRCLE");
  assert.equal(own.claimedBy?.email, "ann@school.com");
  assert.equal((await viewInvite(deps, ann, "IndieAppCircle")).state, "yours");
  assert.ok((await joinWithInvite(deps, ann, "INDIEAPPCIRCLE", {})).ok, "joining again changes nothing");
  assert.equal(invites.length, 1);
  assert.equal((await deps.repo.userById(ann.id))!.planEndsAt?.getTime(), deps.now().getTime() + 60 * DAY, "and doesn't add days");
});

test("the code is for anyone, once each: a second account gets its own invite, and a teacher becomes a student", async () => {
  const { deps, person } = setup();
  await joinWithInvite(deps, await person("ann@school.com"), "INDIEAPPCIRCLE", { name: "Ann", acceptTerms: true });
  const bob = await person("bob@school.com", TEACHER_DEMO_PLAN_ID, "teacher");
  assert.equal((await viewInvite(deps, bob, "INDIEAPPCIRCLE")).state, "open");
  const r = await joinWithInvite(deps, bob, "INDIEAPPCIRCLE", {});
  assert.ok(r.ok);
  assert.equal(r.account.role, "student");
  assert.equal((await listInvites(deps)).length, 2);
});

test("after 60 days the plan has ended: held on setup, can't join again, chooses a plan there", async () => {
  const { deps, person } = setup();
  const ann = await person("ann@school.com");
  await joinWithInvite(deps, ann, "INDIEAPPCIRCLE", { name: "Ann", acceptTerms: true });
  const day59 = later(deps, 59);
  assert.equal(toAccount((await deps.repo.userById(ann.id))!, false, day59.now()).needsSetup, false);

  const day60 = later(deps, 60);
  const user = (await deps.repo.userById(ann.id))!;
  assert.equal(toAccount(user, false, day60.now()).needsSetup, true);
  assert.equal(toAccount(user, true, day60.now()).needsPayment, false, "no plan, so nothing to pay for yet");
  assert.equal((await viewInvite(day60, ann, "INDIEAPPCIRCLE")).state, "ended");
  assert.deepEqual(await joinWithInvite(day60, ann, "INDIEAPPCIRCLE", {}), { ok: false, error: "ended" });

  const plans = (await accountPlans(day60, ann.id))!;
  assert.equal(plans.current, null);
  assert.ok(!plans.plans.some((p) => p.id === INDIEAPPCIRCLE_PLAN_ID), "the ended plan isn't offered");
  assert.equal(await choosePlan(day60, ann, INDIEAPPCIRCLE_PLAN_ID, "month"), null, "nor kept by paying the other way");
  assert.deepEqual(await setUpAccount(day60, ann, { name: "Ann", planId: INDIEAPPCIRCLE_PLAN_ID, billing: "year", acceptTerms: true }), { ok: false, error: "plan" });

  const r = await setUpAccount(day60, ann, { name: "Ann", planId: "student-paid", billing: "month", acceptTerms: true }, true);
  assert.ok(r.ok);
  assert.equal(r.account.needsPayment, true, "a paid plan goes to Checkout");
  assert.equal((await deps.repo.userById(ann.id))!.planEndsAt, null, "a new plan has no end");
});

test("an unknown word is not a code", async () => {
  const { deps, person } = setup();
  const ann = await person("ann@school.com");
  assert.equal((await viewInvite(deps, ann, "INDIEAPP")).state, "not-found");
  assert.deepEqual(await joinWithInvite(deps, ann, "toString", { name: "Ann", acceptTerms: true }), { ok: false, error: "not-found" });
});
