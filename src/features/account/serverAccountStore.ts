import type { AccountStore } from "./AccountStore";
import { cleanAccounts } from "./model";

/**
 * The cookie that says "this browser has a session". The session cookie itself is hidden from scripts, so this one
 * is what lets a page skip asking the server when nobody is signed in. It proves nothing: the server never reads it as a sign-in.
 */
export const HINT_COOKIE = "mk_in";

/** True when the site has accounts (it was built with a database). Set from DATABASE_URL in next.config.ts. */
export const accountsOpen = (): boolean => process.env.NEXT_PUBLIC_ACCOUNTS === "on";

export const hasSessionHint = (): boolean => typeof document !== "undefined" && document.cookie.split("; ").some((c) => c.startsWith(`${HINT_COOKIE}=`));

/** Real sign-in: the session lives in a cookie and the account in the database, read through /api/auth. */
export const serverAccountStore: AccountStore = {
  async current() {
    if (!hasSessionHint()) return null;
    try {
      const res = await fetch("/api/auth/session", { cache: "no-store" });
      if (!res.ok) return null;
      const body = (await res.json()) as { account?: unknown };
      return cleanAccounts([body.account])[0] ?? null;
    } catch {
      return null;
    }
  },
  async signOut() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      /* offline: the session stays until the next try */
    }
  },
};
