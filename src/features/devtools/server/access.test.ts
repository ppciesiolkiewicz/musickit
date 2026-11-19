import { test } from "node:test";
import assert from "node:assert/strict";
import type { Account } from "@/features/account/model";
import { devOrAdmin } from "./access";

const acc = (role: Account["role"]): Account => ({ id: "a1", name: "Ann", email: "ann@x.test", role, createdAt: "2026-11-19T10:00:00.000Z", needsSetup: false, emailUpdates: false, taught: false });

test("in development everyone gets in, without looking anyone up", async () => {
  let asked = false;
  assert.equal(await devOrAdmin(async () => ((asked = true), null), true), true);
  assert.equal(asked, false);
});

test("in production only a signed-in admin gets in", async () => {
  assert.equal(await devOrAdmin(async () => acc("admin"), false), true);
  for (const role of ["student", "teacher", "owner"] as const) assert.equal(await devOrAdmin(async () => acc(role), false), false, role);
  assert.equal(await devOrAdmin(async () => null, false), false);
});

test("a failed look-up keeps the door shut", async () => {
  const error = console.error;
  console.error = () => {};
  try {
    assert.equal(await devOrAdmin(async () => { throw new Error("db down"); }, false), false);
  } finally {
    console.error = error;
  }
});
