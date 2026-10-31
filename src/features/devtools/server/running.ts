import type { ActiveRun } from "../model/history";

// on globalThis, so a dev reload of this module still finds the runs started before it
const g = globalThis as { __devToolsRuns?: Map<string, ActiveRun & { ac: AbortController }> };
const runs = () => (g.__devToolsRuns ??= new Map());

/** Registers a run; its signal aborts on cancelRun. Call endRun when it is over. */
export function startRun(r: ActiveRun): AbortSignal {
  const ac = new AbortController();
  runs().set(r.id, { ...r, ac });
  return ac.signal;
}

export function endRun(id: string): void {
  runs().delete(id);
}

/** Cancels a run in progress; false when there is none with that id. */
export function cancelRun(id: string): boolean {
  const r = runs().get(id);
  r?.ac.abort();
  return !!r;
}

export const listRunning = (): ActiveRun[] => [...runs().values()].map(({ id, at, model }) => ({ id, at, model }));
