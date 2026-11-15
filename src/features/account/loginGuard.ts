/*
 * The part of a page's address that never reaches the server (the hash: the dev pages' `/dev/stories#<story>` and
 * `/dev/copy` routes travel in it) is kept across logging in here, so a signed-out person opening such a link lands on
 * the same place once they are in.
 */

const KEY = "musickit.loginHash";

/** Where an account with no plan yet chooses its name and plan; it can't open the app's three places before that. */
export const SETUP_PATH = "/account/setup";

/** The setup page, going on to `next` afterwards. */
export const setupHref = (next: string): string => `${SETUP_PATH}?${new URLSearchParams({ next }).toString()}`;
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

/**
 * Whether a page should send this person to log in, once the account check is done. The server clears the session hint
 * cookie when the session is gone, so a hint still there after an empty answer means the check failed (offline, a server
 * error): stay on the page.
 */
export const sendToLogin = (signedIn: boolean, hintLeft: boolean): boolean => !signedIn && !hintLeft;

/** Where a plan invite opens (`/plan/invite/<id>`); the login page words itself for it. */
const INVITE = "/plan/invite/";

/** The login page's heading and line under it: for a plan invite, an invitation to make an account; else the usual, naming `goingTo` (where the visitor was going). */
export function loginWords(next: string | null, goingTo = "your practice plan"): { title: string; intro: string } {
  if (next?.startsWith(INVITE)) {
    return { title: "Create your account or log in to view", intro: "A teacher shared a practice plan with you. Log in with your email or with Google, and the plan is added to your plans. If you're new, this also creates your account." };
  }
  return { title: "Log in", intro: `Log in with your email or with Google to open ${goingTo}. If you're new, this also creates your account.` };
}
