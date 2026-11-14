import { createHash, randomBytes, randomInt } from "node:crypto";
import { NEW_ACCOUNT_ROLE, cleanEmail, cleanName, isEmail, type Account } from "../model";
import type { AuthRepo, TokenRow, UserRow } from "./repo";

/**
 * Sign-in, as rules over the repo: mailed links, Google, sessions. No HTTP and no database here; the routes in
 * app/api/auth call these and turn the results into cookies and redirects.
 *
 * A raw token goes to the person (in a link or a cookie); the repo only ever sees its SHA-256.
 */

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

/** How long a mailed link, and the code in the same email, work. */
export const LINK_TTL = 60 * MINUTE;
/** How long somebody with a proven email has to give their name. */
export const SIGNUP_TTL = 30 * MINUTE;
/** A year from the last visit: somebody who comes back now and then is never logged out. (Browsers cap a cookie at 400 days.) */
export const SESSION_TTL = 365 * DAY;
/** A session used after this much time gets its full life again. */
const SESSION_REFRESH = DAY;
/** At most this many links to one email in `LINK_WINDOW`. */
export const LINK_LIMIT = 3;
export const LINK_WINDOW = 15 * MINUTE;
/** At most this many in a day. With `CODE_TRIES`, this keeps guessing a 6-digit code hopeless: 50 guesses a day. */
export const LINK_DAY_LIMIT = 10;
/** Wrong guesses one code takes before it stops working. */
export const CODE_TRIES = 5;

export interface AuthDeps {
  repo: AuthRepo;
  now: () => Date;
  /** A new unguessable token. */
  token: () => string;
  /** A new 6-digit code, for the email. */
  code: () => string;
}

export const newToken = (): string => randomBytes(32).toString("base64url");
export const hashToken = (token: string): string => createHash("sha256").update(token).digest("hex");
export const newCode = (): string => String(randomInt(0, 1_000_000)).padStart(6, "0");
/** A code is stored hashed with its email, like a token. */
export const hashCode = (email: string, code: string): string => hashToken(`${email}:${code}`);

export const authDeps = (repo: AuthRepo): AuthDeps => ({ repo, now: () => new Date(), token: newToken, code: newCode });

export const toAccount = (u: UserRow): Account => ({ id: u.id, name: u.name, email: u.email, role: u.role, createdAt: u.createdAt.toISOString() });

/** Where to go after signing in when no page was asked for. */
export const AFTER_LOGIN = "/plan";

/** A path on this site, or null: never another site ("//evil.com", "/\\evil.com", "https://..."). */
export function safeNext(next: unknown): string | null {
  if (typeof next !== "string" || next.length > 500) return null;
  return /^\/(?![/\\])[^\s\\]*$/.test(next) ? next : null;
}

const later = (now: Date, ms: number) => new Date(now.getTime() + ms);

export type SignedIn = { kind: "session"; sessionToken: string; expiresAt: Date; account: Account; next: string; created: boolean };
export type NeedsProfile = { kind: "signup"; signupToken: string; expiresAt: Date; next: string };

async function startSession(deps: AuthDeps, user: UserRow, next: string | null, userAgent: string | null, created: boolean): Promise<SignedIn> {
  const now = deps.now();
  const sessionToken = deps.token();
  const expiresAt = later(now, SESSION_TTL);
  await deps.repo.createSession({ tokenHash: hashToken(sessionToken), userId: user.id, userAgent: userAgent?.slice(0, 300) ?? null, expiresAt }, now);
  return { kind: "session", sessionToken, expiresAt, account: toAccount(user), next: next ?? AFTER_LOGIN, created };
}

/** A user for the email: the one that exists, or a new one. Safe when two requests create it at once. */
async function userFor(deps: AuthDeps, email: string, name: string): Promise<{ user: UserRow; created: boolean }> {
  const had = await deps.repo.userByEmail(email);
  if (had) return { user: had, created: false };
  const made = await deps.repo.createUser({ email, name, role: NEW_ACCOUNT_ROLE }, deps.now());
  if (made) return { user: made, created: true };
  const raced = await deps.repo.userByEmail(email);
  if (!raced) throw new Error("user could not be created");
  return { user: raced, created: false };
}

async function startSignup(deps: AuthDeps, proof: { email: string; name: string | null; provider: string | null; providerAccountId: string | null; next: string | null }): Promise<NeedsProfile> {
  const now = deps.now();
  const signupToken = deps.token();
  const expiresAt = later(now, SIGNUP_TTL);
  await deps.repo.createToken({ kind: "signup", tokenHash: hashToken(signupToken), codeHash: null, role: null, expiresAt, ...proof }, now);
  return { kind: "signup", signupToken, expiresAt, next: proof.next ?? AFTER_LOGIN };
}

export type LinkError = "email" | "limit" | "daily";
export type LinkRequest = { ok: true; email: string; token: string; code: string; expiresAt: Date } | { ok: false; error: LinkError };

/**
 * A link and a code to mail; either one proves the email. There is one form for logging in and for a new account: the
 * proof signs in an email that has an account, and leads to the account setup for one that has none. The answer
 * never says which.
 */
export async function requestEmailLink(deps: AuthDeps, input: { email: unknown; next?: unknown }): Promise<LinkRequest> {
  const email = typeof input.email === "string" ? cleanEmail(input.email) : "";
  if (!isEmail(email)) return { ok: false, error: "email" };

  const now = deps.now();
  if ((await deps.repo.countTokens(email, "email_link", new Date(now.getTime() - LINK_WINDOW))) >= LINK_LIMIT) return { ok: false, error: "limit" };
  if ((await deps.repo.countTokens(email, "email_link", new Date(now.getTime() - DAY))) >= LINK_DAY_LIMIT) return { ok: false, error: "daily" };

  const token = deps.token();
  const code = deps.code();
  const expiresAt = later(now, LINK_TTL);
  await deps.repo.createToken({ kind: "email_link", tokenHash: hashToken(token), codeHash: hashCode(email, code), email, name: null, role: null, provider: null, providerAccountId: null, next: safeNext(input.next), expiresAt }, now);
  return { ok: true, email, token, code, expiresAt };
}

/** The mailed link was opened and confirmed. Signs in, or, for an email with no account, asks for the name. */
export async function openEmailLink(deps: AuthDeps, token: unknown, userAgent: string | null): Promise<SignedIn | NeedsProfile | null> {
  if (typeof token !== "string" || !token) return null;
  const row = await deps.repo.takeToken(hashToken(token), "email_link", deps.now());
  return row ? emailProven(deps, row, userAgent) : null;
}

/**
 * The code from the email was typed in. Every try, right or wrong, uses one of each live code's `CODE_TRIES`, counted
 * before the code is compared, so guesses sent at once can't get past the limit. The code is then spent like the link.
 */
export async function openEmailCode(deps: AuthDeps, input: { email: unknown; code: unknown }, userAgent: string | null): Promise<SignedIn | NeedsProfile | null> {
  const email = typeof input.email === "string" ? cleanEmail(input.email) : "";
  const code = typeof input.code === "string" ? input.code.replace(/[\s-]/g, "") : "";
  if (!isEmail(email) || !/^\d{6}$/.test(code)) return null;
  const now = deps.now();
  const hash = hashCode(email, code);
  const match = (await deps.repo.tryCodes(email, CODE_TRIES, now)).find((t) => t.codeHash === hash);
  const row = match && (await deps.repo.takeToken(match.tokenHash, "email_link", now));
  return row ? emailProven(deps, row, userAgent) : null;
}

async function emailProven(deps: AuthDeps, row: TokenRow, userAgent: string | null): Promise<SignedIn | NeedsProfile> {
  const had = await deps.repo.userByEmail(row.email);
  if (had) return startSession(deps, had, row.next, userAgent, false);
  return startSignup(deps, { email: row.email, name: null, provider: null, providerAccountId: null, next: row.next });
}

/** What Google says about the person, after its token was checked (see google.ts). */
export interface GoogleProfile {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string;
}

/**
 * Google signed the person in. A known Google id, or a Google-verified email that already has an account, signs in
 * (and links the two). A new person is asked for their name, with Google's offered. Null when Google has not
 * verified the email: it then proves nothing.
 */
export async function googleSignIn(deps: AuthDeps, profile: GoogleProfile, opts: { next?: unknown; userAgent: string | null }): Promise<SignedIn | NeedsProfile | null> {
  const email = cleanEmail(profile.email);
  if (!profile.sub || !profile.emailVerified || !isEmail(email)) return null;
  const next = safeNext(opts.next);

  const linked = await deps.repo.userByIdentity("google", profile.sub);
  if (linked) return startSession(deps, linked, next, opts.userAgent, false);

  const had = await deps.repo.userByEmail(email);
  if (!had) return startSignup(deps, { email, name: cleanName(profile.name) || null, provider: "google", providerAccountId: profile.sub, next });

  await deps.repo.linkIdentity(had.id, "google", profile.sub, deps.now());
  return startSession(deps, had, next, opts.userAgent, false);
}

/** The proven email waiting for a name, for the account setup. Null when the ticket is gone. */
export async function pendingSignup(deps: AuthDeps, signupToken: unknown): Promise<{ email: string; name: string } | null> {
  if (typeof signupToken !== "string" || !signupToken) return null;
  const row = await deps.repo.peekToken(hashToken(signupToken), "signup", deps.now());
  return row ? { email: row.email, name: row.name ?? "" } : null;
}

export type FinishError = "expired" | "name";

/** The account setup: makes the account for the proven email and signs in. An empty name leaves the ticket usable. */
export async function finishSignup(deps: AuthDeps, signupToken: unknown, input: { name: unknown }, userAgent: string | null): Promise<SignedIn | { kind: "error"; error: FinishError }> {
  const name = cleanName(input.name);
  if (typeof signupToken !== "string" || !signupToken) return { kind: "error", error: "expired" };
  if (!(await pendingSignup(deps, signupToken))) return { kind: "error", error: "expired" };
  if (!name) return { kind: "error", error: "name" };
  const row = await deps.repo.takeToken(hashToken(signupToken), "signup", deps.now());
  if (!row) return { kind: "error", error: "expired" };
  const { user, created } = await userFor(deps, row.email, name);
  if (row.provider && row.providerAccountId) await deps.repo.linkIdentity(user.id, row.provider, row.providerAccountId, deps.now());
  return startSession(deps, user, row.next, userAgent, created);
}

/** Who the session cookie belongs to. `expiresAt` is set when the session's life was renewed, so the cookie's can be too. */
export async function sessionAccount(deps: AuthDeps, sessionToken: unknown): Promise<{ account: Account; renewed: Date | null } | null> {
  if (typeof sessionToken !== "string" || !sessionToken) return null;
  const now = deps.now();
  const hash = hashToken(sessionToken);
  const row = await deps.repo.sessionUser(hash, now);
  if (!row) return null;
  let renewed: Date | null = null;
  if (row.expiresAt.getTime() - now.getTime() < SESSION_TTL - SESSION_REFRESH) {
    renewed = later(now, SESSION_TTL);
    await deps.repo.touchSession(hash, renewed, now);
  }
  return { account: toAccount(row.user), renewed };
}

export async function signOut(deps: AuthDeps, sessionToken: unknown): Promise<void> {
  if (typeof sessionToken === "string" && sessionToken) await deps.repo.deleteSession(hashToken(sessionToken));
}

/** Null when the name is empty or the account is gone. */
export async function rename(deps: AuthDeps, userId: string, name: unknown): Promise<Account | null> {
  const clean = cleanName(name);
  if (!clean) return null;
  const user = await deps.repo.updateUserName(userId, clean, deps.now());
  return user ? toAccount(user) : null;
}
