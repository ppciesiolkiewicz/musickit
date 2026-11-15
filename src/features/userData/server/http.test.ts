import { test } from "node:test";
import assert from "node:assert/strict";
import { openEmailLink, requestEmailLink, type AuthDeps } from "@/features/account/server/auth";
import { memoryRepo } from "@/features/account/server/repo.memory";
import { signedIn } from "./http";

function setup() {
  const store = memoryRepo();
  let n = 0;
  const deps: AuthDeps = { repo: store.repo, now: () => new Date(Date.UTC(2026, 10, 11, 12)), token: () => `t${++n}`, code: () => "100001" };
  return { deps };
}

async function session(deps: AuthDeps): Promise<string> {
  const link = await requestEmailLink(deps, { email: "ann@school.com" });
  assert.ok(link.ok);
  const done = await openEmailLink(deps, link.token, "Firefox");
  assert.ok(done?.kind === "session");
  return done.sessionToken;
}

const req = (method: string, headers: Record<string, string> = {}) => new Request("http://localhost:3000/api/me/progress", { method, headers: { host: "localhost:3000", ...headers } });

test("signedIn: no database gives 503", async () => {
  const r = await signedIn(req("GET"), null);
  assert.ok(r instanceof Response);
  assert.equal(r.status, 503);
  assert.equal(r.headers.get("cache-control"), "no-store");
});

test("signedIn: no cookie gives 401", async () => {
  const { deps } = setup();
  const r = await signedIn(req("GET"), deps);
  assert.ok(r instanceof Response);
  assert.equal(r.status, 401);
});

test("signedIn: a session cookie gives the account", async () => {
  const { deps } = setup();
  const token = await session(deps);
  const r = await signedIn(req("PUT", { cookie: `mk_session=${token}`, origin: "http://localhost:3000" }), deps);
  assert.ok(!(r instanceof Response));
  assert.equal(r.account.email, "ann@school.com");
});

test("signedIn: a changing request from another site gives 403, even with a session", async () => {
  const { deps } = setup();
  const token = await session(deps);
  for (const method of ["PUT", "DELETE"]) {
    const r = await signedIn(req(method, { cookie: `mk_session=${token}`, origin: "https://evil.com" }), deps);
    assert.ok(r instanceof Response);
    assert.equal(r.status, 403);
  }
});

test("signedIn: a GET needs a session but not the Origin check", async () => {
  const { deps } = setup();
  const token = await session(deps);
  const ok = await signedIn(req("GET", { cookie: `mk_session=${token}`, origin: "https://evil.com" }), deps);
  assert.ok(!(ok instanceof Response));
  const none = await signedIn(req("GET", { origin: "https://evil.com" }), deps);
  assert.ok(none instanceof Response);
  assert.equal(none.status, 401);
});

test("signedIn: a request naming another account than the session's is 409 account-changed; the same one, or none, goes through", async () => {
  const { deps } = setup();
  const token = await session(deps);
  const headers = { cookie: `mk_session=${token}`, origin: "http://localhost:3000" };
  const me = await signedIn(req("PUT", headers), deps);
  assert.ok(!(me instanceof Response));
  for (const method of ["PUT", "DELETE", "POST", "GET"]) {
    const other = await signedIn(req(method, { ...headers, "x-account-id": "22222222-2222-4222-8222-222222222222" }), deps);
    assert.ok(other instanceof Response);
    assert.equal(other.status, 409);
    assert.deepEqual(await other.json(), { error: "account-changed" });
    const same = await signedIn(req(method, { ...headers, "x-account-id": me.account.id }), deps);
    assert.ok(!(same instanceof Response));
    assert.equal(same.account.id, me.account.id);
  }
});
