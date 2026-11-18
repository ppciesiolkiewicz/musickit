import { createHash, randomBytes, randomInt } from "node:crypto";
import { setupHref } from "../loginGuard";
import { NEW_ACCOUNT_ROLE, cleanEmail, cleanName, emailName, isEmail, type Account } from "../model";
import { canChoose, choosablePlans, pricedWithYou, roleOnPlan, TAUGHT_PLAN_ID, type Billing, type Plan } from "../plans";
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

export const toAccount = (u: UserRow): Account => ({ id: u.id, name: u.name, email: u.email, role: u.role, createdAt: u.createdAt.toISOString(), needsSetup: u.planId === null, emailUpdates: u.emailUpdatesAt !== null, taught: u.planId === TAUGHT_PLAN_ID });

/** Where to go after signing in when no page was asked for. */
export const AFTER_LOGIN = "/plan";

/** A path on this site, or null: never another site ("//evil.com", "/\\evil.com", "https://..."). */
export function safeNext(next: unknown): string | null {
  if (typeof next !== "string" || next.length > 500) return null;
  return /^\/(?![/\\])[^\s\\]*$/.test(next) ? next : null;
}

const later = (now: Date, ms: number) => new Date(now.getTime() + ms);

export type SignedIn = { kind: "session"; sessionToken: string; expiresAt: Date; account: Account; next: string; created: boolean };

/**
 * A new session for the user. A teacher's student (on the taught plan) signing in by any route counts as having opened
 * their claim link: `markClaimed` writes only the first time, so the teacher sees them as in and can't resend. A failure
 * there is logged and never stops the sign-in.
 */
export async function startSession(deps: AuthDeps, user: UserRow, next: string | null, userAgent: string | null, created: boolean): Promise<SignedIn> {
  const now = deps.now();
  const sessionToken = deps.token();
  const expiresAt = later(now, SESSION_TTL);
  await deps.repo.createSession({ tokenHash: hashToken(sessionToken), userId: user.id, userAgent: userAgent?.slice(0, 300) ?? null, expiresAt }, now);
  if (user.planId === TAUGHT_PLAN_ID) {
    try {
      await deps.repo.markClaimed(user.id, now);
    } catch (error) {
      console.error(`[auth] the claim of student ${user.id} was not recorded`, error);
    }
  }
  return { kind: "session", sessionToken, expiresAt, account: toAccount(user), next: next ?? AFTER_LOGIN, created };
}

/**
 * Where the browser goes after signing in: `next`, or first /account/setup for an account with no plan yet (a new one,
 * or one that left setup before finishing), which then goes on to `next`.
 */
export const pathAfterSignIn = (result: Pick<SignedIn, "next" | "account">): string => (result.account.needsSetup ? setupHref(result.next) : result.next);

/**
 * The name a new account starts with: Google's, or the part of the email before the @. /account/setup then asks for the
 * name, with Google's filled in and the email's left out (`emailName`); it is changed later on /account.
 */
export const startName = (email: string, given?: unknown): string => cleanName(given) || emailName(email) || "Me";

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
  return startSession(deps, user, row.next, userAgent, created);
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
  if (linked) return startSession(deps, linked, next, opts.userAgent, false);

  const { user, created } = await userFor(deps, email, startName(email, profile.name));
  await deps.repo.linkIdentity(user.id, "google", profile.sub, deps.now());
  return startSession(deps, user, next, opts.userAgent, created);
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

/** Turns the emails about what we fix and add on or off. Null when `on` isn't true or false, or the account is gone. */
export async function setEmailUpdates(deps: AuthDeps, userId: string, on: unknown): Promise<Account | null> {
  if (typeof on !== "boolean") return null;
  const user = await deps.repo.setEmailUpdates(userId, on, deps.now());
  return user ? toAccount(user) : null;
}

/** The plans a person can see and the one they are on (see `choosablePlans`). Null when there is no such user. */
/** `current` is null for an account that hasn't chosen one yet; `billing` is how they pay for it. */
export async function accountPlans(deps: AuthDeps, userId: string): Promise<AccountPlans | null> {
  const user = await deps.repo.userById(userId);
  if (!user) return null;
  const request = await deps.repo.planRequest(userId);
  return {
    plans: choosablePlans(await deps.repo.listPlans(), user.planId),
    current: user.planId,
    billing: user.billing,
    request: request ? { planId: request.planId, at: request.createdAt.toISOString() } : null,
  };
}

/** `GET /api/account/plan`: the plans to choose from, the one they are on, how they'd pay, and their request for a plan priced with them. */
export interface AccountPlans {
  plans: Plan[];
  current: string | null;
  billing: Billing;
  request: { planId: string; at: string } | null;
}

/** On the plan now, and when it is one priced with the person, the request we write to them about. */
async function movePlan(deps: AuthDeps, userId: string, plan: Plan, billing: Billing, role: Account["role"]) {
  const moved = await deps.repo.setUserPlan(userId, plan.id, billing, role, deps.now());
  if (moved && pricedWithYou(plan)) await deps.repo.requestPlan(userId, plan.id, deps.now());
  return moved;
}

/**
 * Moves the person to an enabled plan, paid monthly or yearly, with no payment (the beta). The plan's role comes with
 * it, so a Teacher plan makes a student a teacher; an owner stays an owner. Their own plan can move to the other
 * billing. Null when the plan can't be chosen: unknown, turned off, the one they are on paid the same way, or no billing.
 */
export async function choosePlan(deps: AuthDeps, account: Account, planId: unknown, billing: unknown): Promise<Account | null> {
  const user = await deps.repo.userById(account.id);
  const plan = user && canChoose(await deps.repo.listPlans(), user, planId, billing);
  if (!plan) return null;
  const moved = await movePlan(deps, account.id, plan, billing as Billing, roleAfter(user, plan));
  return moved ? toAccount(moved) : null;
}

/** The role after a plan change: the plan's, except that paying for the same plan the other way changes no role. */
const roleAfter = (user: { role: Account["role"]; planId: string | null }, plan: Plan) => (plan.id === user.planId ? user.role : roleOnPlan(user.role, plan));

export type SetupError = "name" | "plan";

/**
 * /account/setup: the account's name and plan, in one step; a new account has no plan and must choose one. The plan is
 * checked before anything changes, so a bad plan leaves the name as it was. Choosing the plan the account is already on,
 * paid the same way, keeps it. No payment (the beta).
 */
export async function setUpAccount(deps: AuthDeps, account: Account, input: { name: unknown; planId: unknown; billing: unknown; emailUpdates?: unknown }): Promise<{ ok: true; account: Account } | { ok: false; error: SetupError }> {
  const name = cleanName(input.name);
  if (!name) return { ok: false, error: "name" };
  const had = await deps.repo.userById(account.id);
  if (!had) return { ok: false, error: "plan" };
  const keeps = had.planId !== null && input.planId === had.planId && input.billing === had.billing;
  const plan = keeps ? null : canChoose(await deps.repo.listPlans(), had, input.planId, input.billing);
  if (!keeps && !plan) return { ok: false, error: "plan" };
  let user = await deps.repo.updateUserName(account.id, name, deps.now());
  if (user && plan) user = await movePlan(deps, account.id, plan, input.billing as Billing, roleAfter(had, plan));
  // the box on setup, ticked or not; left out, the choice stays as it was
  if (user && typeof input.emailUpdates === "boolean") user = await deps.repo.setEmailUpdates(account.id, input.emailUpdates, deps.now());
  return user ? { ok: true, account: toAccount(user) } : { ok: false, error: "plan" };
}
