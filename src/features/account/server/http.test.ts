import { test } from "node:test";
import assert from "node:assert/strict";
import { googleAuthUrl, googleConfig, pkceChallenge, profileFromIdToken } from "./google";
import { baseUrl, clearCookie, cookie, readCookie, resultPath, sameOrigin, sessionCookies } from "./http";
import { confirmUrl, linkEmail } from "./mail";

const req = (headers: Record<string, string>, url = "http://localhost:3000/api/auth/session") => new Request(url, { headers });

test("cookies: hidden from scripts, Lax, Secure only in production", () => {
  const expires = new Date(Date.UTC(2026, 11, 11));
  assert.equal(cookie("mk_session", "a b", { expires }, {}), "mk_session=a%20b; Path=/; Expires=Fri, 11 Dec 2026 00:00:00 GMT; SameSite=Lax; HttpOnly");
  assert.match(cookie("mk_session", "x", { expires }, { NODE_ENV: "production" }), /; Secure$/);
  const [session, hint] = sessionCookies("tok", expires, {});
  assert.match(session, /^mk_session=tok;.*HttpOnly/);
  assert.match(hint, /^mk_in=1;/);
  assert.doesNotMatch(hint, /HttpOnly/, "the page reads the hint");
  assert.match(clearCookie("mk_session", {}), /^mk_session=; Path=\/; Expires=Thu, 01 Jan 1970/);
});

test("reading a cookie from a request", () => {
  const r = req({ cookie: "theme=jazz; mk_session=a%20b; mk_in=1" });
  assert.equal(readCookie(r, "mk_session"), "a b");
  assert.equal(readCookie(r, "mk_in"), "1");
  assert.equal(readCookie(r, "session"), null);
  assert.equal(readCookie(req({}), "mk_session"), null);
  assert.equal(readCookie(req({ cookie: "mk_session=%E0%A4%A" }), "mk_session"), null);
});

test("a POST from another site is refused", () => {
  assert.equal(sameOrigin(req({ origin: "http://localhost:3000", host: "localhost:3000" })), true);
  assert.equal(sameOrigin(req({ origin: "https://evil.com", host: "localhost:3000" })), false);
  assert.equal(sameOrigin(req({ origin: "https://www.attunr.app", host: "internal:3000", "x-forwarded-host": "www.attunr.app" })), true);
  assert.equal(sameOrigin(req({ origin: "null", host: "localhost:3000" })), false);
  assert.equal(sameOrigin(req({ host: "localhost:3000" })), true, "no Origin: not sent by a page");
});

test("links never take their address from the request in production", () => {
  const r = req({ host: "evil.com" }, "https://evil.com/api/auth/email-link");
  assert.equal(baseUrl(r, { NODE_ENV: "production" }), "https://www.attunr.app");
  assert.equal(baseUrl(r, { NODE_ENV: "production", AUTH_URL: "https://beta.attunr.app/" }), "https://beta.attunr.app");
  assert.equal(baseUrl(req({}), { NODE_ENV: "development" }), "http://localhost:3000");
  assert.equal(baseUrl(req({}), { NODE_ENV: "development", AUTH_URL: "?" }), "http://localhost:3000", "a placeholder AUTH_URL is ignored");
});

test("after a step: the page asked for, or the finish form keeping it", () => {
  const at = new Date();
  assert.equal(resultPath({ kind: "session", sessionToken: "s", expiresAt: at, next: "/plan", created: false, account: { id: "1", name: "A", email: "a@b.co", role: "student", createdAt: "" } }), "/plan");
  assert.equal(resultPath({ kind: "signup", signupToken: "s", expiresAt: at, next: "/plan?day=2" }), "/account/setup?next=%2Fplan%3Fday%3D2");
});

test("the mailed link and its email", () => {
  const link = confirmUrl("https://www.attunr.app", "a/b+c");
  assert.equal(link, "https://www.attunr.app/login/confirm?token=a%2Fb%2Bc");
  const mail = linkEmail("ann@school.com", link, {});
  assert.deepEqual(mail.to, ["ann@school.com"]);
  assert.equal(mail.from, "attunr <hello@attunr.app>");
  assert.match(mail.text, /log in to attunr\. If you don't have an account yet, you'll set one up next:\n\nhttps:\/\/www\.attunr\.app\/login\/confirm\?token=/);
  assert.match(mail.text, /20 minutes/);
  assert.equal(linkEmail("a@b.co", link, { AUTH_FROM_EMAIL: "x <x@y.z>" }).from, "x <x@y.z>");
});

const idToken = (claims: Record<string, unknown>) => `h.${Buffer.from(JSON.stringify(claims)).toString("base64url")}.sig`;

test("Google: keys, the sign-in address and reading the ID token", () => {
  assert.equal(googleConfig({ GOOGLE_CLIENT_ID: "id" }), null);
  const config = googleConfig({ GOOGLE_CLIENT_ID: " id ", GOOGLE_CLIENT_SECRET: "secret" });
  assert.deepEqual(config, { clientId: "id", clientSecret: "secret" });

  const url = new URL(googleAuthUrl(config!, { redirectUri: "http://localhost:3000/api/auth/google/callback", state: "st", verifier: "ver" }));
  assert.equal(url.origin + url.pathname, "https://accounts.google.com/o/oauth2/v2/auth");
  assert.equal(url.searchParams.get("state"), "st");
  assert.equal(url.searchParams.get("code_challenge"), pkceChallenge("ver"));
  // the example in RFC 7636, appendix B
  assert.equal(pkceChallenge("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"), "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
  assert.equal(url.searchParams.has("client_secret"), false);

  const now = new Date(Date.UTC(2026, 10, 11));
  const good = { iss: "https://accounts.google.com", aud: "id", exp: now.getTime() / 1000 + 60, sub: "g-1", email: "ann@school.com", email_verified: true, name: "Ann" };
  assert.deepEqual(profileFromIdToken(idToken(good), "id", now), { sub: "g-1", email: "ann@school.com", emailVerified: true, name: "Ann" });
  assert.equal(profileFromIdToken(idToken({ ...good, aud: "someone-else" }), "id", now), null, "a token made for another app");
  assert.equal(profileFromIdToken(idToken({ ...good, iss: "https://evil.com" }), "id", now), null);
  assert.equal(profileFromIdToken(idToken({ ...good, exp: now.getTime() / 1000 - 1 }), "id", now), null);
  assert.equal(profileFromIdToken(idToken({ ...good, email_verified: false }), "id", now)?.emailVerified, false);
  assert.equal(profileFromIdToken("not-a-token", "id", now), null);
  assert.equal(profileFromIdToken(undefined, "id", now), null);
});
