import { test } from "node:test";
import assert from "node:assert/strict";
import { TEACHER_SIGNUP, asksForTeachers, loginWords, sendToLogin, stashHash, takeHash } from "./loginGuard";

/** A Storage in memory. */
function memory(): Storage {
  const m = new Map<string, string>();
  return {
    get length() { return m.size; },
    clear: () => m.clear(),
    getItem: (k) => m.get(k) ?? null,
    key: (i) => [...m.keys()][i] ?? null,
    removeItem: (k) => void m.delete(k),
    setItem: (k, v) => void m.set(k, String(v)),
  };
}

const MIN = 60_000;

test("a hash stashed before logging in comes back once on the same path", () => {
  const s = memory();
  stashHash(s, "/admin/content/stories", "#scale-neck~3", 0);
  assert.equal(takeHash(s, "/admin/content/stories", 5 * MIN), "#scale-neck~3");
  assert.equal(takeHash(s, "/admin/content/stories", 5 * MIN), null);
});

test("another path doesn't take it, and leaves it for the right one", () => {
  const s = memory();
  stashHash(s, "/admin/content/stories", "#scale-neck~3", 0);
  assert.equal(takeHash(s, "/plan", MIN), null);
  assert.equal(takeHash(s, "/admin/content/stories", MIN), "#scale-neck~3");
});

test("after an hour the hash is gone", () => {
  const s = memory();
  stashHash(s, "/admin/content/stories", "#scale-neck~3", 0);
  assert.equal(takeHash(s, "/admin/content/stories", 61 * MIN), null);
  assert.equal(s.length, 0);
});

test("an empty hash is not stored", () => {
  const s = memory();
  stashHash(s, "/plan", "", 0);
  stashHash(s, "/plan", "#", 0);
  assert.equal(s.length, 0);
});

test("only a definite 'signed out' sends a person to log in, never a check that failed", () => {
  // the server clears the hint cookie when the session is gone; a network or server error leaves it
  assert.equal(sendToLogin(false, false), true);
  assert.equal(sendToLogin(false, true), false);
  assert.equal(sendToLogin(true, false), false);
  assert.equal(sendToLogin(true, true), false);
});

test("the login page asks an invited person to create an account or log in; any other next keeps the usual words", () => {
  assert.equal(loginWords("/plan/invite/abc").title, "Create your account or log in to view");
  assert.equal(loginWords("/plan").title, "Log in");
  assert.equal(loginWords(null).title, "Log in");
  assert.equal(loginWords("/plan/invitex").title, "Log in");
  assert.notEqual(loginWords("/plan/invite/abc").intro, loginWords(null).intro);
});

test("Become a founding partner asks for the Teachers side, through login and setup", () => {
  assert.equal(asksForTeachers(TEACHER_SIGNUP), true);
  assert.equal(asksForTeachers("/account?for=students"), false);
  assert.equal(asksForTeachers("/account"), false);
  assert.equal(asksForTeachers(null), false);
  assert.equal(loginWords(TEACHER_SIGNUP).title, "Create your teacher account");
});
