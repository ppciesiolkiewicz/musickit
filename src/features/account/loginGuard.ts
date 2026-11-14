/*
 * The part of a page's address that never reaches the server (the hash: a shared note travels in `#note=…`) is kept
 * across logging in here, so a signed-out person opening a shared note still sees it once they are in.
 */

const KEY = "musickit.loginHash";
/** A login that takes longer than this is a new visit; the old hash is dropped. */
const LIFE = 60 * 60_000;

type Stashed = { path: string; hash: string; at: number };

/** Keep `hash` for `path` before going to log in. */
export function stashHash(store: Storage, path: string, hash: string, now: number): void {
  if (!hash || hash === "#") return;
  store.setItem(KEY, JSON.stringify({ path, hash, at: now } satisfies Stashed));
}

/** The hash kept for `path`, once: it is removed when taken, and when it is over an hour old. */
export function takeHash(store: Storage, path: string, now: number): string | null {
  let s: Stashed | null = null;
  try {
    s = JSON.parse(store.getItem(KEY) ?? "null") as Stashed | null;
  } catch {}
  if (!s || typeof s.hash !== "string" || typeof s.at !== "number" || now - s.at > LIFE) {
    store.removeItem(KEY);
    return null;
  }
  if (s.path !== path) return null;
  store.removeItem(KEY);
  return s.hash;
}
