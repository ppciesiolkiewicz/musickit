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
  status(): SaveStatus;
  subscribe(fn: (s: SaveStatus) => void): () => void;
}

export interface DocClientOpts {
  /** sends one document; `keepalive` is asked for when the page is going away */
  put: (body: unknown, init?: { keepalive: boolean }) => Promise<Response>;
  delayMs?: number;
  retryMs?: number[];
  now?: () => number;
  schedule?: Schedule;
}

/** Browsers refuse a keepalive request whose body is over 64 KB; past this a normal fetch is the best try. */
const KEEPALIVE_MAX = 60_000;

/** The `put` for one document kind: `PUT /api/me/documents/<kind>` with `{ data }` and `X-Account-Id`. */
export const putDocument =
  (kind: DocKind) =>
  (data: unknown, init?: { keepalive: boolean }): Promise<Response> => {
    const body = JSON.stringify({ data });
    const keepalive = !!init?.keepalive && new TextEncoder().encode(body).length <= KEEPALIVE_MAX;
    return fetch(`/api/me/documents/${kind}`, { method: "PUT", headers: accountHeaders({ "content-type": "application/json" }), body, keepalive });
  };

/** Debounced, retrying saves of one document. Its status is the worst of the waiting change and the sender. */
export function createDocClient(opts: DocClientOpts): DocClient {
  const delayMs = opts.delayMs ?? 1000;
  const schedule = opts.schedule ?? realSchedule;
  let latest: unknown;
  let cancelDelay: (() => void) | null = null;
  let last: SaveStatus = "saved";
  const subs = new Set<(s: SaveStatus) => void>();

  const sender = withRetry(({ keepalive }) => opts.put(latest, { keepalive }), { retryMs: opts.retryMs, schedule, track: false });

  const status = (): SaveStatus => {
    const s = sender.status();
    if (s === "failed" || s === "rejected" || s === "signedOut") return s;
    return cancelDelay || s === "saving" ? "saving" : "saved";
  };
  const tracked: Tracked = { status, lastCode: () => sender.lastCode(), flush: (keepalive) => void client.flush({ keepalive }) };
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
      cancelDelay?.();
      cancelDelay = schedule(() => {
        cancelDelay = null;
        void sender.run();
      }, delayMs);
      changed();
    },
    async flush({ keepalive = false } = {}) {
      if (cancelDelay || sender.waiting()) {
        cancelDelay?.();
        cancelDelay = null;
        await sender.run({ keepalive });
      } else await sender.inFlight();
      return status();
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
