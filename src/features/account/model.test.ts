import { test } from "node:test";
import assert from "node:assert/strict";
import { FEATURES, ROLES, can, cleanAccounts, type Account, type Feature } from "./model";

const acc = (over: Partial<Account> = {}): Account => ({ id: "a1", name: "Ann", email: "ann@school.test", role: "student", createdAt: "2026-11-11T10:00:00.000Z", ...over });

test("nobody signed in can use every feature", () => {
  for (const f of Object.keys(FEATURES) as Feature[]) assert.equal(can(null, f), true);
});

test("the notes creator and AI plans are for teachers and owners, not students", () => {
  for (const f of ["notesCreator", "aiPlan"] as const) {
    assert.equal(can(acc({ role: "student" }), f), false);
    assert.equal(can(acc({ role: "teacher" }), f), true);
    assert.equal(can(acc({ role: "owner" }), f), true);
  }
});

test("an owner can use everything a teacher can", () => {
  for (const roles of Object.values(FEATURES) as readonly (readonly string[])[]) {
    if (roles.includes("teacher")) assert.ok(roles.includes("owner"));
    for (const r of roles) assert.ok((ROLES as readonly string[]).includes(r));
  }
});

test("cleanAccounts drops broken rows and repeats", () => {
  assert.deepEqual(cleanAccounts(null), []);
  assert.deepEqual(cleanAccounts("x"), []);
  const good = acc();
  const list = cleanAccounts([good, { ...good, id: "a2" }, { ...good, email: "b@b.co" }, { ...good, id: "a3", email: "c@b.co", role: "admin" }, null, { id: "a4" }]);
  assert.deepEqual(list, [good]);
});
