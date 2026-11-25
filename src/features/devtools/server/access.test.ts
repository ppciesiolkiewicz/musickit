import { test } from "node:test";
import assert from "node:assert/strict";
import type { Account, Permission } from "@/features/account/model";
import { openPermissions, permitted } from "./access";

const acc = (role: Account["role"], permissions: Permission[] = []): Account => ({ id: "a1", name: "Ann", email: "ann@x.test", role, permissions, createdAt: "2026-11-19T10:00:00.000Z", needsSetup: false, emailUpdates: false, taught: false });

test("in development everyone gets in, without looking anyone up", async () => {
  let asked = false;
  assert.equal(await permitted("admin", async () => ((asked = true), null), true), true);
  assert.equal(asked, false);
});

test("in production a page needs its own permission", async () => {
  assert.equal(await permitted("dev", async () => acc("student", ["dev"]), false), true);
  assert.equal(await permitted("admin", async () => acc("teacher", ["dev", "content"]), false), false);
  assert.equal(await permitted("content", async () => acc("owner"), false), false);
  assert.equal(await permitted("dev", async () => null, false), false);
});

test("a failed look-up keeps the door shut", async () => {
  const error = console.error;
  console.error = () => {};
  try {
    assert.equal(await permitted("dev", async () => { throw new Error("db down"); }, false), false);
  } finally {
    console.error = error;
  }
});

test("a list opens to anyone with one of them", async () => {
  assert.equal(await permitted(["dev", "content"], async () => acc("student", ["content"]), false), true);
  assert.equal(await permitted(["dev", "content"], async () => acc("student", ["admin"]), false), false);
});

test("open permissions are all three in development", async () => {
  assert.deepEqual(await openPermissions(true), ["dev", "content", "admin"]);
});
