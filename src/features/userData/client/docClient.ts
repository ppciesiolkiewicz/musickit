import type { DocKind } from "../model";
import { accountHeaders } from "./accountHeader";
import { report, type SaveStatus, type Tracked } from "./registry";
import { realSchedule, withRetry, type Schedule } from "./retry";

export type { SaveStatus } from "./registry";

export interface DocClient {
  /** Keep `value` as the document; it is sent `delayMs` after the last save. Nothing is merged: the last write wins. */
  save(value: unknown): void;
  /**
   * Send any pending value at once, and wait for a send already out, then give the status: "saved" only when the latest
   * value has landed. Used before something reads the stored document (sharing the note).
   */
  flush(opts?: { keepalive?: boolean }): Promise<SaveStatus>;
  /**
   * Tell the client the version of the document the page loaded. It only ever goes up: a save that was answered already
   * knows a newer one. Until a version is known a save is sent without one, as before.
   */
  setVersion(n: number): void;
  status(): SaveStatus;
  subscribe(fn: (s: SaveStatus) => void): () => void;
}

export interface DocClientOpts {
  /** sends one document; `keepalive` is asked for when the page is going away; `version` is the one the document was last read at or answered with, when known */
  put: (body: unknown, init?: { keepalive: boolean }, version?: number) => Promise<Response>;
  /** the version of the document as loaded; sent with every save, and replaced by the one each answer gives */
  version?: number;
  /** called once when the server refuses a save as stale (409 `stale`): the document was changed elsewhere. No save is sent after it. */
  onStale?: () => void;
  delayMs?: number;
  retryMs?: number[];
  now?: () => number;
  schedule?: Schedule;
}

/** Browsers refuse a keepalive request whose body is over 64 KB; past this a normal fetch is the best try. */
const KEEPALIVE_MAX = 60_000;

/** The `put` for one document kind: `PUT /api/me/documents/<kind>` with `{ data, version }` (no version when none is known) and `X-Account-Id`. */
export const putDocument =
  (kind: DocKind) =>
  (data: unknown, init?: { keepalive: boolean }, version?: number): Promise<Response> => {
    const body = JSON.stringify(version === undefined ? { data } : { data, version });
    const keepalive = !!init?.keepalive && new TextEncoder().encode(body).length <= KEEPALIVE_MAX;
    return fetch(`/api/me/documents/${kind}`, { method: "PUT", headers: accountHeaders({ "content-type": "application/json" }), body, keepalive });
  };

/** After a stale refusal: the notice is up, and the page loads the newer version. Nothing saves in between, so this does not loop. */
export const reloadSoon = (): void => {
  if (typeof window !== "undefined") setTimeout(() => window.location.reload(), 2500);
};

/** The JSON of an answer, or null; read from a copy so the caller can still read the answer. */
const bodyOf = (res: Response): Promise<{ version?: unknown; code?: unknown } | null> => res.clone().json().then((b: unknown) => (b && typeof b === "object" ? b : null), () => null);

/** Debounced, retrying saves of one document. Its status is the worst of the waiting change and the sender. */
export function createDocClient(opts: DocClientOpts): DocClient {
  const delayMs = opts.delayMs ?? 1000;
  const schedule = opts.schedule ?? realSchedule;
  let latest: unknown;
  let cancelDelay: (() => void) | null = null;
  let last: SaveStatus = "saved";
  let version = opts.version;
  let stale = false;
  const subs = new Set<(s: SaveStatus) => void>();

  const sender = withRetry(
    async ({ keepalive }) => {
      // a send queued behind the refused one must not go out
      if (stale) return new Response(null, { status: 409 });
      const res = await opts.put(latest, { keepalive }, version);
      // an answer names the version now stored: the next save is made at that one
      if (res.ok) {
        const v = (await bodyOf(res))?.version;
        if (typeof v === "number") version = v;
      } else if (res.status === 409 && (await bodyOf(res))?.code === "stale") {
        stale = true;
        cancelDelay?.();
        cancelDelay = null;
        opts.onStale?.();
      }
      return res;
    },
    { retryMs: opts.retryMs, schedule, track: false },
  );

  const status = (): SaveStatus => {
    if (stale) return "stale";
    const s = sender.status();
    if (s === "failed" || s === "rejected" || s === "signedOut") return s;
    return cancelDelay || s === "saving" ? "saving" : "saved";
  };
  const tracked: Tracked = { status, lastCode: () => sender.lastCode(), flush: (keepalive) => void client.flush({ keepalive }), unsaved: () => !stale };
  const changed = () => {
    const s = status();
    if (s !== last) {
      last = s;
      subs.forEach((fn) => fn(s));
    }
    report(tracked);
  };
  sender.subscribe(changed);

  const client: DocClient = {
    save(value) {
      latest = value;
      if (stale) return;
      cancelDelay?.();
      cancelDelay = schedule(() => {
        cancelDelay = null;
        void sender.run();
      }, delayMs);
      changed();
    },
    async flush({ keepalive = false } = {}) {
      if (stale) return status();
      if (cancelDelay || sender.waiting()) {
        cancelDelay?.();
        cancelDelay = null;
        await sender.run({ keepalive });
      } else await sender.inFlight();
      return status();
    },
    setVersion(n) {
      version = version === undefined ? n : Math.max(version, n);
    },
    status,
    subscribe(fn) {
      subs.add(fn);
      return () => {
        subs.delete(fn);
      };
    },
  };
  return client;
}
