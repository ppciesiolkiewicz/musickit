import { test } from "node:test";
import assert from "node:assert/strict";
import type { Account } from "../model";
import type { AuthDeps } from "./auth";
import { adminDeleteUser, previewDelete } from "./adminDelete";
import { memoryRepo } from "./repo.memory";

const NOW = new Date(Date.UTC(2026, 10, 26, 12));

async function setup() {
  const mem = memoryRepo();
  const { repo } = mem;
  const deps: AuthDeps = { repo, now: () => NOW, token: () => "t", code: () => "1" };
  const admin = (await repo.createUser({ email: "boss@school.test", name: "Boss", role: "student" }, NOW))!;
  const kim = (await repo.createUser({ email: "kim@school.test", name: "Kim", role: "teacher" }, NOW))!;
  const actor: Account = { id: admin.id, name: "Boss", email: admin.email, role: "student", permissions: ["admin"], createdAt: NOW.toISOString(), needsSetup: false, emailUpdates: false, taught: false };
  return { ...mem, deps, admin, kim, actor };
}

test("the preview counts what goes with the account", async () => {
  const { repo, deps, kim, actor } = await setup();
  const kid = (await repo.createUser({ email: "kid@school.test", name: "Kid", role: "student" }, NOW))!;
  await repo.addStudent(kim.id, kid.id, NOW);
  const invite = await repo.createInvite({ token: "tok", tokenHash: "hash", planId: "teacher-demo", note: "Kim" }, NOW);
  await repo.claimInvite("hash", kim.id, NOW);
  await repo.createSession({ tokenHash: "s", userId: kim.id, userAgent: null, expiresAt: new Date(NOW.getTime() + 1e9) }, NOW);
  const r = await previewDelete(deps, actor, kim.id);
  assert.ok(r.ok);
  assert.equal(r.footprint.user.id, kim.id);
  assert.equal(r.footprint.sessions, 1);
  assert.equal(r.footprint.invites, 1);
  assert.equal(r.footprint.students, 1);
  assert.ok(invite.id);
});

test("deleting takes the account, its sessions, the invite it joined with and its email links; students stay", async () => {
  const { repo, deps, kim, actor, invites, tokens, sessions, users } = await setup();
  const kid = (await repo.createUser({ email: "kid@school.test", name: "Kid", role: "student" }, NOW))!;
  await repo.addStudent(kim.id, kid.id, NOW);
  await repo.createInvite({ token: "tok", tokenHash: "hash", planId: "teacher-demo", note: "Kim" }, NOW);
  await repo.createInvite({ token: "tok2", tokenHash: "hash2", planId: "teacher-demo", note: "Someone else" }, NOW);
  await repo.claimInvite("hash", kim.id, NOW);
  await repo.createSession({ tokenHash: "s", userId: kim.id, userAgent: null, expiresAt: new Date(NOW.getTime() + 1e9) }, NOW);
  await repo.createToken({ kind: "email_link", tokenHash: "et", codeHash: null, email: kim.email, name: null, role: null, provider: null, providerAccountId: null, next: null, expiresAt: new Date(NOW.getTime() + 1e6) }, NOW);
  assert.deepEqual(await adminDeleteUser(deps, actor, kim.id), { ok: true });
  assert.equal(await repo.userById(kim.id), null);
  assert.deepEqual(invites.map((i) => i.note), ["Someone else"]);
  assert.equal(tokens.length, 0);
  assert.equal(sessions.length, 0);
  assert.ok(users.some((u) => u.id === kid.id), "the student's account stays");
  assert.equal(await repo.teacherOf(kid.id), null);
});

test("an admin can't delete their own account here, and a missing one is missing", async () => {
  const { repo, deps, admin, actor } = await setup();
  assert.deepEqual(await previewDelete(deps, actor, admin.id), { ok: false, error: "self" });
  assert.deepEqual(await adminDeleteUser(deps, actor, admin.id), { ok: false, error: "self" });
  assert.ok(await repo.userById(admin.id));
  assert.deepEqual(await previewDelete(deps, actor, "nobody"), { ok: false, error: "missing" });
  assert.deepEqual(await adminDeleteUser(deps, actor, "nobody"), { ok: false, error: "missing" });
});

test("with no one signed in (development) any account can be deleted", async () => {
  const { repo, deps, admin } = await setup();
  assert.deepEqual(await adminDeleteUser(deps, null, admin.id), { ok: true });
  assert.equal(await repo.userById(admin.id), null);
});
