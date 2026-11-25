import { test } from "node:test";
import assert from "node:assert/strict";
import { FEATURES, ROLES, can, cleanAccounts, cleanPermissions, hasPermission, homePage, type Account, type Feature } from "./model";

const acc = (over: Partial<Account> = {}): Account => ({ id: "a1", name: "Ann", email: "ann@school.test", role: "student", createdAt: "2026-11-11T10:00:00.000Z", needsSetup: false, emailUpdates: false, taught: false, permissions: [], ...over });

test("nobody signed in can use every feature", () => {
  for (const f of Object.keys(FEATURES) as Feature[]) assert.equal(can(null, f), true);
});

test("every role can use every feature but sharePlan and students: a teacher gets the same app as a student, plus plan invites and students", () => {
  for (const f of Object.keys(FEATURES) as Feature[]) {
    if (f === "sharePlan" || f === "students") continue;
    for (const role of ROLES) assert.equal(can(acc({ role }), f), true, `${role} ${f}`);
  }
  assert.equal(can(acc({ role: "student" }), "sharePlan"), false);
  assert.equal(can(acc({ role: "teacher" }), "sharePlan"), true);
  assert.equal(can(acc({ role: "owner" }), "sharePlan"), true);
});

test("the admin permission opens every feature, whatever the role", () => {
  const a = acc({ role: "student", permissions: ["admin"] });
  for (const f of Object.keys(FEATURES) as Feature[]) assert.equal(can(a, f), true, f);
  assert.equal(can(acc({ role: "student", permissions: ["dev", "content"] }), "sharePlan"), false);
});

test("hasPermission reads the list and nothing else", () => {
  assert.equal(hasPermission(acc({ permissions: ["content"] }), "content"), true);
  assert.equal(hasPermission(acc({ permissions: ["admin"] }), "dev"), false);
  assert.equal(hasPermission(null, "dev"), false);
});

test("cleanPermissions keeps known values once, in order, and refuses the rest", () => {
  assert.deepEqual(cleanPermissions(["admin", "dev", "admin"]), ["dev", "admin"]);
  assert.deepEqual(cleanPermissions([]), []);
  assert.equal(cleanPermissions(["owner"]), null);
  assert.equal(cleanPermissions("dev"), null);
});

test("an owner can use everything a teacher can", () => {
  for (const roles of Object.values(FEATURES) as readonly (readonly string[])[]) {
    if (roles.includes("teacher")) assert.ok(roles.includes("owner"));
    for (const r of roles) assert.ok((ROLES as readonly string[]).includes(r));
  }
});

test("a teacher or owner's home page is the music-school page; a student's is the solo musicians' page", () => {
  assert.equal(homePage(acc({ role: "student" })), "/");
  assert.equal(homePage(acc({ role: "teacher" })), "/schools");
  assert.equal(homePage(acc({ role: "owner" })), "/schools");
});

test("cleanAccounts drops broken rows and repeats", () => {
  assert.deepEqual(cleanAccounts(null), []);
  assert.deepEqual(cleanAccounts("x"), []);
  const good = acc();
  const list = cleanAccounts([good, { ...good, id: "a2" }, { ...good, email: "b@b.co" }, { ...good, id: "a3", email: "c@b.co", role: "superuser" }, null, { id: "a4" }]);
  assert.deepEqual(list, [good]);
});

test("students is for teachers and owners; nobody signed in has it", () => {
  assert.equal(can(null, "students"), true);
  assert.equal(can(acc({ role: "student" }), "students"), false);
  assert.equal(can(acc({ role: "teacher" }), "students"), true);
  assert.equal(can(acc({ role: "owner" }), "students"), true);
});

test("a stored account without taught is still an account", () => {
  const { taught, ...old } = acc();
  void taught;
  assert.equal(cleanAccounts([old]).length, 1);
});

test("cleanAccounts gives an account without permissions an empty list", () => {
  const { permissions, ...old } = acc({});
  void permissions;
  assert.deepEqual(cleanAccounts([old])[0].permissions, []);
  assert.equal(cleanAccounts([{ ...old, role: "admin" }]).length, 0);
});
