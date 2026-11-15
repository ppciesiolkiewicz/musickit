import type { AccountStore } from "./AccountStore";
import { cleanAccounts, type Account } from "./model";

/**
 * The cookie that says "this browser has a session". The session cookie itself is hidden from scripts, so this one
 * is what lets a page skip asking the server when nobody is signed in. It proves nothing: the server never reads it as a sign-in.
 */
export const HINT_COOKIE = "mk_in";

/** True when the site has accounts (it was built with a database). Set from DATABASE_URL in next.config.ts. */
export const accountsOpen = (): boolean => process.env.NEXT_PUBLIC_ACCOUNTS === "on";

export const hasSessionHint = (): boolean => typeof document !== "undefined" && document.cookie.split("; ").some((c) => c.startsWith(`${HINT_COOKIE}=`));

/** Waits between tries of a failed session read; the last one repeats. (The same steps as a save's retry, `userData/client/retry.ts`.) */
export const SESSION_RETRY_MS = [2000, 5000, 15000, 30000];

export interface SessionOpts {
  hasHint?: () => boolean;
  fetcher?: () => Promise<Response>;
  retryMs?: number[];
  /** runs `fn` after `ms`; tests pass a fake clock */
  schedule?: (fn: () => void, ms: number) => void;
}

/**
 * Who is signed in, read once. With no hint cookie it is nobody, and the server is not asked. Otherwise only a 200 is an
 * answer (`{ account: null }` is signed out); a network error, a 5xx or anything else is asked again after
 * `SESSION_RETRY_MS`, so a signed-in player is never taken for a visitor (whose data the page would keep in memory only).
 */
export async function readSession(opts: SessionOpts = {}): Promise<Account | null> {
  const hasHint = opts.hasHint ?? hasSessionHint;
  if (!hasHint()) return null;
  const fetcher = opts.fetcher ?? (() => fetch("/api/auth/session", { cache: "no-store" }));
  const retryMs = opts.retryMs ?? SESSION_RETRY_MS;
  const schedule = opts.schedule ?? ((fn, ms) => void setTimeout(fn, ms));
  for (let tries = 0; ; tries++) {
    try {
      const res = await fetcher();
      if (res.status === 200) {
        const body = (await res.json()) as { account?: unknown };
        return cleanAccounts([body?.account])[0] ?? null;
      }
    } catch {
      // offline, or not JSON: ask again
    }
    await new Promise<void>((resolve) => schedule(resolve, retryMs[Math.min(tries, retryMs.length - 1)]));
  }
}

/** One session read shared by everyone on the page, so every `useAccount()` agrees. `known()` is its answer once it came. */
export function sessionReader(opts: SessionOpts = {}) {
  let shared: Promise<Account | null> | null = null;
  let known: Account | null | undefined;
  return {
    read: (): Promise<Account | null> =>
      (shared ??= readSession(opts).then((a) => {
        known = a;
        return a;
      })),
    known: (): Account | null | undefined => known,
    /** forget the answer: the next read asks again */
    reset: () => {
      shared = null;
      known = undefined;
    },
  };
}

const session = sessionReader();

/**
 * The id of the account this page loaded for, once the session read answered: null for a visitor, undefined before. Every
 * request that changes a player's data sends it as `X-Account-Id` (`userData/client/accountHeader.ts`), so a tab left open
 * under one account can't write into another that logged in since.
 */
export const pageAccountId = (): string | null | undefined => {
  const a = session.known();
  return a === undefined ? undefined : (a?.id ?? null);
};

/** The header a page sends with the id of the account it loaded for; the server refuses a mismatch with 409 `account-changed`. */
export const ACCOUNT_HEADER = "x-account-id";

/**
 * Headers for a request that changes the account or its data: `extra`, plus `X-Account-Id` once the page knows its account
 * (`id`, the page's own by default). A tab left open under one account then can't change another that logged in since.
 */
export function accountHeaders(extra: Record<string, string> = {}, id: string | null | undefined = pageAccountId()): Record<string, string> {
  return id ? { ...extra, [ACCOUNT_HEADER]: id } : { ...extra };
}

/** What the player reads when the server refused a request with 409 `account-changed`. */
export const ACCOUNT_CHANGED_WORDS = "Another account is logged in now. Reload the page, then try again.";

/** The server refused the request because another account logged in since the page loaded. */
export const isAccountChanged = (status: number, body: unknown): boolean =>
  status === 409 && (body as { error?: unknown } | null)?.error === "account-changed";

/** Real sign-in: the session lives in a cookie and the account in the database, read through /api/auth (once per page). */
export const serverAccountStore: AccountStore = {
  current: () => session.read(),
  async signOut() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      /* offline: the session stays until the next try */
    }
    session.reset();
  },
};
