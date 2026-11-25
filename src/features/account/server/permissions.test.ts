import { test } from "node:test";
import assert from "node:assert/strict";
import type { Account, Permission } from "../model";
import type { AuthDeps } from "./auth";
import { changePermissions } from "./permissions";
import { memoryRepo } from "./repo.memory";

const NOW = new Date(Date.UTC(2026, 10, 25, 12));

async function setup() {
  const { repo } = memoryRepo();
  const deps: AuthDeps = { repo, now: () => NOW, token: () => "t", code: () => "1" };
  const admin = await repo.createUser({ email: "boss@school.test", name: "Boss", role: "student" }, NOW);
  const other = await repo.createUser({ email: "kim@school.test", name: "Kim", role: "teacher" }, NOW);
  assert.ok(admin && other);
  await repo.setPermissions(admin.id, ["admin"], NOW);
  const actor = (permissions: Permission[] = ["admin"]): Account => ({ id: admin.id, name: "Boss", email: admin.email, role: "student", permissions, createdAt: NOW.toISOString(), needsSetup: false, emailUpdates: false, taught: false });
  return { repo, deps, admin, other, actor };
}

test("an admin sets another person's permissions", async () => {
  const { repo, deps, other, actor } = await setup();
  assert.deepEqual(await changePermissions(deps, actor(), other.id, ["content"]), { ok: true, permissions: ["content"] });
  assert.deepEqual((await repo.userById(other.id))?.permissions, ["content"]);
});

test("an admin cannot remove their own admin", async () => {
  const { repo, deps, admin, actor } = await setup();
  assert.deepEqual(await changePermissions(deps, actor(), admin.id, ["dev"]), { ok: false, error: "self" });
  assert.deepEqual((await repo.userById(admin.id))?.permissions, ["admin"]);
});

test("an admin may change their own other ticks", async () => {
  const { deps, admin, actor } = await setup();
  assert.deepEqual(await changePermissions(deps, actor(), admin.id, ["admin", "content"]), { ok: true, permissions: ["content", "admin"] });
});

test("nobody signed in (development) may change anyone", async () => {
  const { deps, admin } = await setup();
  assert.deepEqual(await changePermissions(deps, null, admin.id, []), { ok: true, permissions: [] });
});

test("unknown permissions are refused", async () => {
  const { repo, deps, other, actor } = await setup();
  for (const raw of [["owner"], "dev", {}, null]) assert.deepEqual(await changePermissions(deps, actor(), other.id, raw), { ok: false, error: "bad" }, JSON.stringify(raw));
  assert.deepEqual((await repo.userById(other.id))?.permissions, []);
});

test("an unknown user is missing", async () => {
  const { deps, actor } = await setup();
  assert.deepEqual(await changePermissions(deps, actor(), "nobody", ["dev"]), { ok: false, error: "missing" });
});
