import type { ActiveRun, RunRecord, RunSummary } from "../model/history";

/** The page's side of /api/dev: kept out of the components so editing them stays a hot update, not a reload. */

/** The past runs, newest first; [] when the history can't be read. */
export async function fetchRuns(): Promise<RunSummary[]> {
  try {
    return ((await (await fetch("/api/dev/history", { cache: "no-store" })).json()) as { runs: RunSummary[] }).runs ?? [];
  } catch {
    return [];
  }
}

export async function fetchRun(id: string): Promise<RunRecord | null> {
  const res = await fetch(`/api/dev/history/${encodeURIComponent(id)}`, { cache: "no-store" });
  return res.ok ? ((await res.json()) as RunRecord) : null;
}

/** Runs in progress on the dev server; [] when it can't be asked. */
export async function fetchRunning(): Promise<ActiveRun[]> {
  try {
    return ((await (await fetch("/api/dev/run", { cache: "no-store" })).json()) as { running: ActiveRun[] }).running ?? [];
  } catch {
    return [];
  }
}

export const cancelRunning = (id: string) => fetch(`/api/dev/run?id=${encodeURIComponent(id)}`, { method: "DELETE" });

export async function post(url: string, body: unknown): Promise<RunRecord> {
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
  if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json as RunRecord;
}
