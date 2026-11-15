import { report, type SaveStatus, type Tracked } from "./registry";

export type { SaveStatus } from "./registry";

/** Runs `fn` after `ms` and returns a cancel. Tests pass a fake clock. */
export type Schedule = (fn: () => void, ms: number) => () => void;

export const realSchedule: Schedule = (fn, ms) => {
  const t = setTimeout(fn, ms);
  return () => clearTimeout(t);
};

/** Waits between retries; the last one repeats. */
export const RETRY_MS = [2000, 5000, 15000, 30000];

export type Send = (init: { keepalive: boolean }) => Promise<Response>;

export interface RetryOpts {
  retryMs?: number[];
  schedule?: Schedule;
  /** join the save registry (the notice, pagehide). A wrapper that tracks itself (DocClient) passes false. */
  track?: boolean;
}

export interface Retrying {
  /** Send now: cancels a waiting retry. Called while a send is out, it sends again once that one is back. */
  run(opts?: { keepalive?: boolean }): Promise<void>;
  /** the HTTP status of the last failed answer (413 for too big), undefined after a success or a network error */
  lastCode(): number | undefined;
  /** a retry is waiting on its timer */
  waiting(): boolean;
  /** the send that is out now (with any send queued behind it), or null */
  inFlight(): Promise<void> | null;
  status(): SaveStatus;
  /** hears the status on every change and every answer */
  subscribe(fn: (s: SaveStatus) => void): () => void;
}

type Outcome = { kind: "ok" | "signedOut" | "rejected" | "retry"; code?: number };

async function attempt(send: Send, keepalive: boolean): Promise<Outcome> {
  try {
    const res = await send({ keepalive });
    if (res.ok) return { kind: "ok" };
    if (res.status === 401) return { kind: "signedOut", code: 401 };
    if (res.status >= 500) return { kind: "retry", code: res.status };
    return { kind: "rejected", code: res.status };
  } catch {
    return { kind: "retry" };
  }
}

/**
 * A sender that reports its status and retries. Network errors and 5xx wait `retryMs` and try again; a 401 is
 * "signedOut" and any other 4xx (400, 403, 413) "rejected", both with no retry until `run` is called again. `send` is called afresh on
 * every attempt, so a sender that reads the latest value (DocClient) sends the newest one; a one-off request
 * (one progress entry) gets its own `withRetry` and leaves the registry once it is saved.
 */
export function withRetry(send: Send, opts: RetryOpts = {}): Retrying {
  const retryMs = opts.retryMs ?? RETRY_MS;
  const schedule = opts.schedule ?? realSchedule;
  let state: SaveStatus = "saved";
  let tries = 0;
  let cancelRetry: (() => void) | null = null;
  let busy: Promise<void> | null = null;
  let again = false;
  let againKeepalive = false;
  let code: number | undefined;
  const subs = new Set<(s: SaveStatus) => void>();

  const tracked: Tracked = { status: () => state, lastCode: () => code, flush: (keepalive) => void (cancelRetry && self.run({ keepalive })) };
  const set = (s: SaveStatus) => {
    // told on every answer, even with the status unchanged: a 400 then a 413 changes what the notice says
    state = s;
    subs.forEach((fn) => fn(s));
    if (opts.track !== false) report(tracked);
  };

  const finish = (outcome: Outcome) => {
    code = outcome.code;
    if (outcome.kind === "ok") {
      tries = 0;
      set("saved");
    } else if (outcome.kind === "signedOut") set("signedOut");
    else if (outcome.kind === "rejected") set("rejected");
    else {
      set("failed");
      const ms = retryMs[Math.min(tries, retryMs.length - 1)];
      tries++;
      cancelRetry = schedule(() => {
        cancelRetry = null;
        void self.run();
      }, ms);
    }
  };

  const loop = async (keepalive: boolean) => {
    let k = keepalive;
    for (;;) {
      again = false;
      const outcome = await attempt(send, k);
      if (!again) {
        busy = null;
        finish(outcome);
        return;
      }
      k = againKeepalive;
      againKeepalive = false;
    }
  };

  const self: Retrying = {
    run({ keepalive = false } = {}) {
      cancelRetry?.();
      cancelRetry = null;
      if (state === "saved") set("saving");
      if (busy) {
        again = true;
        againKeepalive ||= keepalive;
        return busy;
      }
      busy = loop(keepalive);
      return busy;
    },
    lastCode: () => code,
    waiting: () => cancelRetry !== null,
    inFlight: () => busy,
    status: () => state,
    subscribe(fn) {
      subs.add(fn);
      return () => {
        subs.delete(fn);
      };
    },
  };
  return self;
}
