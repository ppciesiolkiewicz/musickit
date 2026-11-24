import { test } from "node:test";
import assert from "node:assert/strict";
import { PERSONAL_DEMO_PLAN_ID, TAUGHT_PLAN_ID, TEACHER_DEMO_PLAN_ID, type Plan } from "../plans";
import { TERMS_UPDATED } from "../terms";
import { hashToken, pathAfterSignIn, toAccount, type AuthDeps } from "./auth";
import { joinWithInvite, listInvites, makeInvite, viewInvite } from "./invites";
import { memoryRepo } from "./repo.memory";

const BASE = { monthCents: 0, yearCents: 0, trialDays: 0, extraStudents: 0, autoplansPerMonth: 8, batch: false, sort: 0 } as const;
const PLANS: Plan[] = [
  { ...BASE, id: "student", name: "Student", role: "student", students: 0, enabled: true },
  { ...BASE, id: TEACHER_DEMO_PLAN_ID, name: "Teacher Demo", role: "teacher", students: 2, enabled: false },
  { ...BASE, id: PERSONAL_DEMO_PLAN_ID, name: "Personal Demo", role: "student", students: 0, enabled: false },
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
  assert.deepEqual(await viewInvite(deps, ann, token), { state: "yours", kind: "teacher", plan: { name: "Teacher Demo", students: 2 }, name: "Ann" });
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
  assert.equal((await deps.repo.userById(ann.id))?.termsVersion, TERMS_UPDATED);
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
