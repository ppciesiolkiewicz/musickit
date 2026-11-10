import { getDb } from "@/lib/db/client";
import { SITE_URL } from "@/lib/site";
import type { Account } from "../model";
import { HINT_COOKIE } from "../serverAccountStore";
import { authDeps, sessionAccount, type AuthDeps, type NeedsProfile, type SignedIn } from "./auth";
import { drizzleRepo } from "./repo.drizzle";

/** What the auth routes share: cookies, the same-site check, JSON answers and the one place that builds `AuthDeps`. */

type Env = Record<string, string | undefined>;

export const SESSION_COOKIE = "mk_session";
export const SIGNUP_COOKIE = "mk_signup";
export const OAUTH_COOKIE = "mk_oauth";

/** Sign-in over the database, or null when the site has none (DATABASE_URL unset): then there are no accounts. */
export function auth(env: Env = process.env): AuthDeps | null {
  const db = getDb(env);
  return db ? authDeps(drizzleRepo(db)) : null;
}

export function readCookie(req: Request, name: string): string | null {
  for (const part of (req.headers.get("cookie") ?? "").split(";")) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i).trim() === name) {
      try {
        return decodeURIComponent(part.slice(i + 1).trim());
      } catch {
        return null;
      }
    }
  }
  return null;
}

/** A Set-Cookie value. Cookies are for the whole site, Lax, and Secure in production; `script: true` lets the page's own code read it. */
export function cookie(name: string, value: string, opts: { expires: Date; script?: boolean }, env: Env = process.env): string {
  const parts = [`${name}=${encodeURIComponent(value)}`, "Path=/", `Expires=${opts.expires.toUTCString()}`, "SameSite=Lax"];
  if (!opts.script) parts.push("HttpOnly");
  if (env.NODE_ENV === "production") parts.push("Secure");
  return parts.join("; ");
}

export const clearCookie = (name: string, env: Env = process.env): string => cookie(name, "", { expires: new Date(0), script: name === HINT_COOKIE }, env);

/** The cookies of a new or renewed session: the token (hidden from scripts) and the hint that tells the page to ask who is signed in. */
export const sessionCookies = (sessionToken: string, expiresAt: Date, env: Env = process.env): string[] => [
  cookie(SESSION_COOKIE, sessionToken, { expires: expiresAt }, env),
  cookie(HINT_COOKIE, "1", { expires: expiresAt, script: true }, env),
];

export const signOutCookies = (env: Env = process.env): string[] => [clearCookie(SESSION_COOKIE, env), clearCookie(HINT_COOKIE, env)];

/** The cookies a finished sign-in step sets: a session, or the ticket for the finish form. Either way the one-time cookies of the step before go. */
export function resultCookies(result: SignedIn | NeedsProfile, env: Env = process.env): string[] {
  return result.kind === "session"
    ? [...sessionCookies(result.sessionToken, result.expiresAt, env), clearCookie(SIGNUP_COOKIE, env)]
    : [cookie(SIGNUP_COOKIE, result.signupToken, { expires: result.expiresAt }, env)];
}

/** Where the browser goes after the step: the page asked for, or the finish form with that page kept. */
export const resultPath = (result: SignedIn | NeedsProfile): string =>
  result.kind === "session" ? result.next : `/register/finish?next=${encodeURIComponent(result.next)}`;

function withCookies(init: ResponseInit, cookies: string[]): ResponseInit {
  const headers = new Headers(init.headers);
  headers.set("cache-control", "no-store");
  for (const c of cookies) headers.append("set-cookie", c);
  return { ...init, headers };
}

export const json = (body: unknown, status = 200, cookies: string[] = []): Response => Response.json(body, withCookies({ status }, cookies));

export const redirect = (url: string, cookies: string[] = []): Response => new Response(null, withCookies({ status: 303, headers: { location: url } }, cookies));

/**
 * False for a request another site made a browser send. A browser names the sending site in Origin on every POST;
 * it has to be this host. A request with no Origin is not from a page (curl, a server), so it carries nobody's cookies by stealth.
 */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? new URL(req.url).host;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/**
 * The site's address for links we mail and for Google's return address. In production it never comes from the
 * request (a forged Host header must not end up in a mailed link): AUTH_URL, or the site's public address.
 */
export function baseUrl(req: Request, env: Env = process.env): string {
  const set = env.AUTH_URL?.trim().replace(/\/$/, "");
  if (set) return set;
  return env.NODE_ENV === "production" ? SITE_URL : new URL(req.url).origin;
}

export async function readJson(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await req.json();
    return body && typeof body === "object" ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export const NO_ACCOUNTS = "Accounts aren't open on this site yet.";

/** The signed-in account of a request, with the cookies to send back (a renewed session's, or the clearing ones when the session is gone). */
export async function requestAccount(deps: AuthDeps, req: Request, env: Env = process.env): Promise<{ account: Account | null; cookies: string[] }> {
  const token = readCookie(req, SESSION_COOKIE);
  if (!token) return { account: null, cookies: readCookie(req, HINT_COOKIE) ? [clearCookie(HINT_COOKIE, env)] : [] };
  const found = await sessionAccount(deps, token);
  if (!found) return { account: null, cookies: signOutCookies(env) };
  return { account: found.account, cookies: found.renewed ? sessionCookies(token, found.renewed, env) : [] };
}
