import { test } from "node:test";
import assert from "node:assert/strict";
import {
  AFTER_LOGIN,
  LINK_LIMIT,
  LINK_TTL,
  SESSION_TTL,
  finishSignup,
  googleSignIn,
  hashToken,
  openEmailLink,
  pendingSignup,
  rename,
  requestEmailLink,
  safeNext,
  sessionAccount,
  signOut,
  type AuthDeps,
  type GoogleProfile,
} from "./auth";
import { memoryRepo } from "./repo.memory";

const START = Date.UTC(2026, 10, 11, 12, 0, 0);

/** Deps over the memory repo, with a clock the test moves and tokens "t1", "t2", ... */
function setup() {
  const store = memoryRepo();
  let time = START;
  let n = 0;
  const deps: AuthDeps = { repo: store.repo, now: () => new Date(time), token: () => `t${++n}` };
  return { ...store, deps, wait: (ms: number) => void (time += ms) };
}

const ann: GoogleProfile = { sub: "g-1", email: "Ann@School.com", emailVerified: true, name: "Ann Lee" };

async function link(deps: AuthDeps, input: Parameters<typeof requestEmailLink>[1]) {
  const r = await requestEmailLink(deps, input);
  assert.ok(r.ok);
  return r.token;
}

/** A new account by a mailed link: the link, then the name on the account setup. */
async function signUp(deps: AuthDeps, email: string, name: string, next?: string) {
  const r = await openEmailLink(deps, await link(deps, { email, next }), null);
  assert.ok(r?.kind === "signup");
  const done = await finishSignup(deps, r.signupToken, { name }, "Firefox");
  assert.ok(done.kind === "session");
  return done;
}

test("a link for a new email asks for the name, then makes a student account and signs in", async () => {
  const { deps, users, tokens } = setup();
  const token = await link(deps, { email: " Ann@School.com ", next: "/plan" });
  assert.equal(tokens[0].tokenHash, hashToken(token), "only the hash is stored");

  const r = await openEmailLink(deps, token, "Firefox");
  assert.ok(r?.kind === "signup");
  assert.equal(users.length, 0, "nothing is made until the name is given");
  assert.deepEqual(await pendingSignup(deps, r.signupToken), { email: "ann@school.com", name: "" });

  assert.deepEqual(await finishSignup(deps, r.signupToken, { name: " " }, null), { kind: "error", error: "name" });
  const done = await finishSignup(deps, r.signupToken, { name: "  Ann   Lee " }, null);
  assert.ok(done.kind === "session", "a wrong try left the ticket usable");
  assert.equal(done.created, true);
  assert.equal(done.next, "/plan");
  assert.deepEqual({ ...done.account, id: "" }, { id: "", name: "Ann Lee", email: "ann@school.com", role: "student", createdAt: new Date(START).toISOString() });
  assert.equal((await sessionAccount(deps, done.sessionToken))?.account.email, "ann@school.com");
  assert.deepEqual(await finishSignup(deps, r.signupToken, { name: "Ann" }, null), { kind: "error", error: "expired" });
  assert.equal(await pendingSignup(deps, r.signupToken), null);
});

test("a link works once, and not after it expires", async () => {
  const { deps, wait } = setup();
  const first = await link(deps, { email: "ann@school.com" });
  assert.ok(await openEmailLink(deps, first, null));
  assert.equal(await openEmailLink(deps, first, null), null);

  const second = await link(deps, { email: "ann@school.com" });
  wait(LINK_TTL + 1);
  assert.equal(await openEmailLink(deps, second, null), null);
  assert.equal(await openEmailLink(deps, "made-up", null), null);
  assert.equal(await openEmailLink(deps, undefined, null), null);
});

test("a link for an email with an account signs in to it", async () => {
  const { deps, users } = setup();
  await signUp(deps, "ann@school.com", "Ann");
  const again = await openEmailLink(deps, await link(deps, { email: "ann@school.com" }), null);
  assert.ok(again?.kind === "session");
  assert.equal(again.created, false);
  assert.equal(again.account.name, "Ann");
  assert.equal(again.next, AFTER_LOGIN);
  assert.equal(users.length, 1);
});

test("requesting a link checks the email and is limited per email", async () => {
  const { deps } = setup();
  assert.deepEqual(await requestEmailLink(deps, { email: "ann" }), { ok: false, error: "email" });
  assert.deepEqual(await requestEmailLink(deps, { email: 7 }), { ok: false, error: "email" });
  for (let i = 0; i < LINK_LIMIT; i++) assert.ok((await requestEmailLink(deps, { email: "a@b.co" })).ok);
  assert.deepEqual(await requestEmailLink(deps, { email: "A@B.co" }), { ok: false, error: "limit" });
  assert.ok((await requestEmailLink(deps, { email: "other@b.co" })).ok, "another email is not held back");
});

test("Google: a new person is asked for the name, with Google's offered, and the next time is known by the Google id", async () => {
  const { deps, users, identities } = setup();
  const first = await googleSignIn(deps, ann, { next: "/creator", userAgent: null });
  assert.ok(first?.kind === "signup");
  assert.equal(users.length, 0);
  assert.deepEqual(await pendingSignup(deps, first.signupToken), { email: "ann@school.com", name: "Ann Lee" });
  const done = await finishSignup(deps, first.signupToken, { name: "Ann L" }, null);
  assert.ok(done.kind === "session");
  assert.equal(done.next, "/creator");
  assert.deepEqual([done.account.name, done.account.email, done.account.role], ["Ann L", "ann@school.com", "student"]);
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

test("the page to open next is always on this site", () => {
  assert.equal(safeNext("/plan?day=2#top"), "/plan?day=2#top");
  for (const bad of ["//evil.com", "/\\evil.com", "https://evil.com", "plan", "", "/a b", null, 5, `/${"x".repeat(600)}`]) assert.equal(safeNext(bad), null, String(bad));
});
