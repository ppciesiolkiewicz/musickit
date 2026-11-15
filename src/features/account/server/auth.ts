import { createHash, randomBytes, randomInt } from "node:crypto";
import { NEW_ACCOUNT_ROLE, cleanEmail, cleanName, isEmail, type Account } from "../model";
import { canChoose, choosablePlans, roleOnPlan, type Plan } from "../plans";
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
/** A year from the last visit: somebody who comes back now and then is never logged out. (Browsers cap a cookie at 400 days.) */
export const SESSION_TTL = 365 * DAY;
/** A session used after this much time gets its full life again. */
const SESSION_REFRESH = DAY;
/** At most this many links to one email in `LINK_WINDOW`. */
export const LINK_LIMIT = 3;
export const LINK_WINDOW = 15 * MINUTE;
/** A new link to the same email waits this long after the last one, so a double click or an impatient press sends one email. */
export const RESEND_WAIT = MINUTE;
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

/**
 * `created`: the sign-in made the account. `nameFrom`: where its name came from, Google's profile or the email (which
 * is only a stand-in until the person types their name on /account/setup).
 */
export type SignedIn = { kind: "session"; sessionToken: string; expiresAt: Date; account: Account; next: string; created: boolean; nameFrom: NameFrom };
export type NameFrom = "google" | "email";

async function startSession(deps: AuthDeps, user: UserRow, next: string | null, userAgent: string | null, created: boolean, nameFrom: NameFrom): Promise<SignedIn> {
  const now = deps.now();
  const sessionToken = deps.token();
  const expiresAt = later(now, SESSION_TTL);
  await deps.repo.createSession({ tokenHash: hashToken(sessionToken), userId: user.id, userAgent: userAgent?.slice(0, 300) ?? null, expiresAt }, now);
  return { kind: "session", sessionToken, expiresAt, account: toAccount(user), next: next ?? AFTER_LOGIN, created, nameFrom };
}

/** The page a new account sets up its name and plan on, before going on to `next`. */
export const SETUP_PATH = "/account/setup";

/**
 * Where the browser goes after signing in: `next`, or first /account/setup for an account the sign-in just made. The
 * setup page asks for the name with an empty field when it came from the email (`ask=name`), and shows Google's to keep.
 */
export function pathAfterSignIn(result: Pick<SignedIn, "next" | "created" | "nameFrom">): string {
  if (!result.created) return result.next;
  const q = new URLSearchParams({ next: result.next });
  if (result.nameFrom === "email") q.set("ask", "name");
  return `${SETUP_PATH}?${q.toString()}`;
}

/**
 * The name a new account starts with: Google's, or the part of the email before the @. A new account is then asked for
 * its name on /account/setup (Google's filled in), and can change it on /account.
 */
export const startName = (email: string, given?: unknown): string => cleanName(given) || cleanName(email.split("@")[0]) || "Me";

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

export type LinkError = "email" | "wait" | "limit" | "daily";
/** `waitMs`, with "wait": how long until a new link can be sent. */
export type LinkRequest = { ok: true; email: string; token: string; code: string; expiresAt: Date } | { ok: false; error: LinkError; waitMs?: number };

/**
 * A link and a code to mail; either one proves the email. There is one form for logging in and for a new account: the
 * proof signs in an email that has an account, and makes one (named from the email) for an email that has none. The answer
 * never says which.
 */
export async function requestEmailLink(deps: AuthDeps, input: { email: unknown; next?: unknown }): Promise<LinkRequest> {
  const email = typeof input.email === "string" ? cleanEmail(input.email) : "";
  if (!isEmail(email)) return { ok: false, error: "email" };

  const now = deps.now();
  const last = await deps.repo.lastTokenAt(email, "email_link");
  const waitMs = last ? last.getTime() + RESEND_WAIT - now.getTime() : 0;
  if (waitMs > 0) return { ok: false, error: "wait", waitMs };
  if ((await deps.repo.countTokens(email, "email_link", new Date(now.getTime() - LINK_WINDOW))) >= LINK_LIMIT) return { ok: false, error: "limit" };
  if ((await deps.repo.countTokens(email, "email_link", new Date(now.getTime() - DAY))) >= LINK_DAY_LIMIT) return { ok: false, error: "daily" };

  const token = deps.token();
  const code = deps.code();
  const expiresAt = later(now, LINK_TTL);
  await deps.repo.createToken({ kind: "email_link", tokenHash: hashToken(token), codeHash: hashCode(email, code), email, name: null, role: null, provider: null, providerAccountId: null, next: safeNext(input.next), expiresAt }, now);
  return { ok: true, email, token, code, expiresAt };
}

/** The mailed link was opened. Signs in, making the account when the email has none. */
export async function openEmailLink(deps: AuthDeps, token: unknown, userAgent: string | null): Promise<SignedIn | null> {
  if (typeof token !== "string" || !token) return null;
  const row = await deps.repo.takeToken(hashToken(token), "email_link", deps.now());
  return row ? emailProven(deps, row, userAgent) : null;
}

/**
 * The code from the email was typed in. Every try, right or wrong, uses one of each live code's `CODE_TRIES`, counted
 * before the code is compared, so guesses sent at once can't get past the limit. The code is then spent like the link.
 */
export async function openEmailCode(deps: AuthDeps, input: { email: unknown; code: unknown }, userAgent: string | null): Promise<SignedIn | null> {
  const email = typeof input.email === "string" ? cleanEmail(input.email) : "";
  const code = typeof input.code === "string" ? input.code.replace(/[\s-]/g, "") : "";
  if (!isEmail(email) || !/^\d{6}$/.test(code)) return null;
  const now = deps.now();
  const hash = hashCode(email, code);
  const match = (await deps.repo.tryCodes(email, CODE_TRIES, now)).find((t) => t.codeHash === hash);
  const row = match && (await deps.repo.takeToken(match.tokenHash, "email_link", now));
  return row ? emailProven(deps, row, userAgent) : null;
}

async function emailProven(deps: AuthDeps, row: TokenRow, userAgent: string | null): Promise<SignedIn> {
  const { user, created } = await userFor(deps, row.email, startName(row.email));
  return startSession(deps, user, row.next, userAgent, created, "email");
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
 * (and links the two). A new person gets an account with Google's name. Null when Google has not
 * verified the email: it then proves nothing.
 */
export async function googleSignIn(deps: AuthDeps, profile: GoogleProfile, opts: { next?: unknown; userAgent: string | null }): Promise<SignedIn | null> {
  const email = cleanEmail(profile.email);
  if (!profile.sub || !profile.emailVerified || !isEmail(email)) return null;
  const next = safeNext(opts.next);

  const linked = await deps.repo.userByIdentity("google", profile.sub);
  if (linked) return startSession(deps, linked, next, opts.userAgent, false, "google");

  const { user, created } = await userFor(deps, email, startName(email, profile.name));
  await deps.repo.linkIdentity(user.id, "google", profile.sub, deps.now());
  return startSession(deps, user, next, opts.userAgent, created, "google");
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

/** Who the session cookie belongs to, without renewing it: for a server page, which can't send a renewed cookie back. */
export async function peekSession(deps: AuthDeps, sessionToken: unknown): Promise<Account | null> {
  if (typeof sessionToken !== "string" || !sessionToken) return null;
  const row = await deps.repo.sessionUser(hashToken(sessionToken), deps.now());
  return row ? toAccount(row.user) : null;
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

/** The plans a person can see and the one they are on (see `choosablePlans`). Null when there is no such user. */
export async function accountPlans(deps: AuthDeps, userId: string): Promise<{ plans: Plan[]; current: string } | null> {
  const current = await deps.repo.userPlanId(userId);
  if (current === null) return null;
  return { plans: choosablePlans(await deps.repo.listPlans(), current), current };
}

/**
 * Moves the person to an enabled plan, with no payment (the beta). The plan's role comes with it, so a Teacher plan
 * makes a student a teacher; an owner stays an owner. Null when the plan can't be chosen: unknown, turned off, or the
 * one they are on.
 */
export async function choosePlan(deps: AuthDeps, account: Account, planId: unknown): Promise<Account | null> {
  const current = await deps.repo.userPlanId(account.id);
  const plan = canChoose(await deps.repo.listPlans(), current, planId);
  if (!plan) return null;
  const user = await deps.repo.setUserPlan(account.id, plan.id, roleOnPlan(account.role, plan), deps.now());
  return user ? toAccount(user) : null;
}

export type SetupError = "name" | "plan";

/**
 * /account/setup: a new account's name and plan, in one step. The plan is checked before anything changes, so a bad
 * plan leaves the name as it was. Choosing the plan the account is already on (Student) keeps it. No payment (the beta).
 */
export async function setUpAccount(deps: AuthDeps, account: Account, input: { name: unknown; planId: unknown }): Promise<{ ok: true; account: Account } | { ok: false; error: SetupError }> {
  const name = cleanName(input.name);
  if (!name) return { ok: false, error: "name" };
  const current = await deps.repo.userPlanId(account.id);
  if (current === null) return { ok: false, error: "plan" };
  const plans = await deps.repo.listPlans();
  const plan = input.planId === current ? null : canChoose(plans, current, input.planId);
  if (input.planId !== current && !plan) return { ok: false, error: "plan" };
  let user = await deps.repo.updateUserName(account.id, name, deps.now());
  if (user && plan) user = await deps.repo.setUserPlan(account.id, plan.id, roleOnPlan(account.role, plan), deps.now());
  return user ? { ok: true, account: toAccount(user) } : { ok: false, error: "plan" };
}
