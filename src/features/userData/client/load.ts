import { report, type SaveStatus, type Tracked } from "./registry";
import { RETRY_MS, realSchedule, type Schedule } from "./retry";

export interface LoadOpts {
  retryMs?: number[];
  schedule?: Schedule;
  fetcher?: (url: string) => Promise<Response>;
}

/** A refused read (401, 404): asking again gets the same answer. */
export class LoadRefused extends Error {
  constructor(readonly code: number) {
    super(`load refused: ${code}`);
  }
}

const noStore = (url: string) => fetch(url, { cache: "no-store" });

/**
 * Reads one JSON answer from the server. Network errors and 5xx wait `RETRY_MS` (the last repeating) and ask again, so a
 * page stays in its loading state rather than showing an empty plan it could then save over the real one. Any 4xx
 * rejects with `LoadRefused`.
 */
export async function getJson(url: string, opts: LoadOpts = {}): Promise<unknown> {
  const retryMs = opts.retryMs ?? RETRY_MS;
  const schedule = opts.schedule ?? realSchedule;
  const fetcher = opts.fetcher ?? noStore;
  for (let tries = 0; ; tries++) {
    try {
      const res = await fetcher(url);
      if (res.ok) return await res.json();
      if (res.status < 500) throw new LoadRefused(res.status);
    } catch (e) {
      if (e instanceof LoadRefused) throw e;
    }
    const ms = retryMs[Math.min(tries, retryMs.length - 1)];
    await new Promise<void>((resolve) => schedule(resolve, ms));
  }
}

/**
 * Tells the save notice about a refused read of a store's document (the plan, the note), so the player sees "logged out"
 * (401) or "reload the page" (another 4xx) instead of a page stuck on Loading… or a blank editor. `refused(e)` reports a
 * `LoadRefused` (other errors are not refusals); `loaded()` clears it once a later read gets through. A refused read
 * holds no change, so it never sets off the leave warning.
 */
export interface LoadReporter {
  refused(e: unknown): void;
  loaded(): void;
  /** what it shows in the save notice: "saved" when nothing was refused */
  status(): SaveStatus;
}

export function loadReporter(): LoadReporter {
  let code: number | null = null;
  const tracked: Tracked = {
    status: () => (code === null ? "saved" : code === 401 ? "signedOut" : "rejected"),
    lastCode: () => code ?? undefined,
    flush: () => {},
    unsaved: () => false,
  };
  return {
    refused(e) {
      if (!(e instanceof LoadRefused)) return;
      code = e.code;
      report(tracked);
    },
    loaded() {
      if (code === null) return;
      code = null;
      report(tracked);
    },
    status: () => tracked.status(),
  };
}
