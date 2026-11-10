import type { AccountStore } from "./AccountStore";
import { cleanAccounts, keyFor, makeAccount, type Account } from "./model";

export const ACCOUNTS_KEY = "musickit.dev.accounts";
export const SESSION_KEY = "musickit.dev.session";

type Env = { NODE_ENV?: string };

/**
 * Accounts exist everywhere except a production build. There, nobody is ever signed in and no account key is read.
 * The default reads the variable by name so Next inlines it in client code.
 */
export const accountsOn = (env: Env = { NODE_ENV: process.env.NODE_ENV }): boolean => env.NODE_ENV !== "production";

function readList(): Account[] {
  try {
    return cleanAccounts(JSON.parse(window.localStorage.getItem(ACCOUNTS_KEY) ?? "null"));
  } catch {
    return [];
  }
}

function writeList(list: Account[]): void {
  try {
    window.localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(list));
  } catch {
    /* storage full or blocked: nothing is kept */
  }
}

/** The signed-in account's id, read at once (the local data stores need it before their first read). Null in production, on the server, or signed out. */
export function sessionId(): string | null {
  if (!accountsOn() || typeof window === "undefined") return null;
  try {
    const id = window.localStorage.getItem(SESSION_KEY);
    return id && readList().some((a) => a.id === id) ? id : null;
  } catch {
    return null;
  }
}

/**
 * The localStorage key a local data store uses for `base`: the signed-in account's own copy ("musickit.plan@<id>"),
 * or `base` itself when nobody is signed in, which is always the case in production.
 */
export const accountKey = (base: string): string => keyFor(base, sessionId());

/** Accounts in this browser's localStorage, for development: no passwords, signing in is picking one. */
export const localAccountStore: AccountStore = {
  async list() {
    return readList();
  },
  async create(input) {
    const list = readList();
    const result = makeAccount(list, input, crypto.randomUUID(), new Date().toISOString());
    if (result.ok) writeList([...list, result.account]);
    return result;
  },
  async remove(id) {
    writeList(readList().filter((a) => a.id !== id));
    try {
      if (window.localStorage.getItem(SESSION_KEY) === id) window.localStorage.removeItem(SESSION_KEY);
      const own = Object.keys(window.localStorage).filter((k) => k.endsWith(`@${id}`));
      for (const k of own) window.localStorage.removeItem(k);
    } catch {
      /* blocked storage: nothing to clear */
    }
  },
  async current() {
    const id = sessionId();
    return id ? (readList().find((a) => a.id === id) ?? null) : null;
  },
  async signIn(id) {
    if (!readList().some((a) => a.id === id)) return false;
    try {
      window.localStorage.setItem(SESSION_KEY, id);
      return true;
    } catch {
      return false;
    }
  },
  async signOut() {
    try {
      window.localStorage.removeItem(SESSION_KEY);
    } catch {
      /* blocked storage: nobody was signed in */
    }
  },
};
