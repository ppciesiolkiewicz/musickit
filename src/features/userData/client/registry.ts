/*
 * Every saving client that has something unsaved, in one place: `useSaveStatus` reads the worst status from it, and a
 * page leaving (`pagehide`) flushes each one. A client is listed only while its status is not "saved", so one-off senders
 * (a progress entry) leave by themselves once they get through.
 */

/**
 * `failed`: a network error or 5xx, being retried. `rejected`: another 4xx (400, 403, 409, 413), not retried, since sending
 * the same thing again gets the same answer. `stale`: a 409 `stale`, the document was changed elsewhere (another device, a teacher);
 * the page reloads to load the newer version, and nothing more is sent. `signedOut`: a 401.
 */
export type SaveStatus = "saved" | "saving" | "failed" | "rejected" | "stale" | "signedOut";

/** Worse is higher: the notice shows the worst of all clients. */
const RANK: Record<SaveStatus, number> = { saved: 0, saving: 1, failed: 2, rejected: 3, stale: 4, signedOut: 5 };

export interface Tracked {
  status(): SaveStatus;
  /** send what is waiting now; `keepalive` when the page is going away */
  flush(keepalive: boolean): void;
  /** the HTTP status of the last answer, when it was a refusal (413 for too big) */
  lastCode?(): number | undefined;
  /** whether the player has a change here that leaving would lose; a refused load with nothing waiting has none (default true) */
  unsaved?(): boolean;
}

const live = new Set<Tracked>();
const listeners = new Set<() => void>();
let hooked = false;

/** Call after a client's status changed: it joins or leaves the list, and listeners hear it. */
export function report(client: Tracked): void {
  if (client.status() === "saved") live.delete(client);
  else live.add(client);
  hookPageHide();
  listeners.forEach((fn) => fn());
}

export function worstStatus(): SaveStatus {
  let worst: SaveStatus = "saved";
  for (const c of live) if (RANK[c.status()] > RANK[worst]) worst = c.status();
  return worst;
}

/** Some client's change was refused as too big (413): the notice says so instead of "reload". */
export function anyTooBig(): boolean {
  for (const c of live) if (c.status() === "rejected" && c.lastCode?.() === 413) return true;
  return false;
}

/** Some client's change was refused because another account logged in since the page loaded (409 `account-changed`). */
export function anyAccountChanged(): boolean {
  for (const c of live) if (c.status() === "rejected" && c.lastCode?.() === 409) return true;
  return false;
}

/** Some client holds a change that leaving the page would lose: the leave warning. */
export function anyUnsaved(): boolean {
  for (const c of live) if (c.unsaved?.() ?? true) return true;
  return false;
}

export function subscribeSaves(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** Once, in a browser: send everything unsaved as the page goes away. */
function hookPageHide() {
  if (hooked || typeof window === "undefined") return;
  hooked = true;
  window.addEventListener("pagehide", () => {
    for (const c of [...live]) c.flush(true);
  });
}
