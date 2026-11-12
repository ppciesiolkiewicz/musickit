import type { PlanState, StoredPlan } from "@/features/plan/model/types";
import type { ProgressEntry } from "@/features/progress/log";

/** One stored plan as /dev/data lists it. */
export interface PlanRow {
  id: string;
  title: string;
  startedOn: string;
  /** exercises with stars, of `total` in the week */
  rated: number;
  total: number;
  current: boolean;
  /** the AI's hidden progress summary that came with the plan */
  progress?: string;
}

const rowOf = (p: StoredPlan, current: boolean): PlanRow => ({
  id: p.id,
  title: p.config.title,
  startedOn: p.startedOn,
  rated: Object.keys(p.rated ?? {}).length,
  total: p.config.days.reduce((n, d) => n + d.exercises.length, 0),
  current,
  ...(p.config.progress ? { progress: p.config.progress } : {}),
});

/** The stored plans: the current one first, then the history in its own order (newest first). */
export const planRows = (state: PlanState): PlanRow[] => [...(state.current ? [rowOf(state.current, true)] : []), ...state.history.map((p) => rowOf(p, false))];

/** One exercise's time as /dev/data lists it: what the day timer counted while its card was in view. */
export interface SpentRow {
  plan: string;
  /** 0-based */
  day: number;
  exercise: string;
  planned: number;
  /** seconds */
  spent: number;
}

/** Every exercise with time on it, of the current plan and the history, in plan, day and exercise order. */
export const spentRows = (state: PlanState): SpentRow[] =>
  [...(state.current ? [state.current] : []), ...state.history].flatMap((p) =>
    p.config.days.flatMap((d, di) =>
      d.exercises.flatMap((e, ei) => {
        const s = p.spent?.[`${di}:${ei}`];
        return typeof s === "number" && s > 0 ? [{ plan: p.config.title, day: di, exercise: e.title, planned: e.minutes, spent: Math.floor(s) }] : [];
      }),
    ),
  );

/** Seconds as m:ss. */
export const clockLabel = (s: number): string => `${Math.floor(s / 60)}:${String(Math.floor(s) % 60).padStart(2, "0")}`;

/** The progress log, newest rating first; `topic` (a topic id) keeps only that topic's rows. */
export const logRows = (entries: ProgressEntry[], topic?: string): ProgressEntry[] =>
  entries.filter((e) => !topic || e.topic === topic).sort((a, b) => b.at.localeCompare(a.at));

/** One key in localStorage or sessionStorage as /dev/data lists it. */
export interface StorageRow {
  key: string;
  /** characters in the stored string */
  size: number;
  /** the value parsed as JSON, or the plain string when it is not JSON */
  value: unknown;
  /** true when `value` is the raw string because it did not parse */
  text: boolean;
}

/** The part of the Storage interface the rows need. */
export type StorageLike = Pick<Storage, "length" | "key" | "getItem">;

/** Every key in a storage, sorted by name, with its value parsed where it is JSON. */
export function storageRows(storage: StorageLike): StorageRow[] {
  const rows: StorageRow[] = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key === null) continue;
    const raw = storage.getItem(key) ?? "";
    let value: unknown = raw;
    let text = true;
    try {
      value = JSON.parse(raw);
      text = false;
    } catch {}
    rows.push({ key, size: raw.length, value, text });
  }
  return rows.sort((a, b) => a.key.localeCompare(b.key));
}

/** A size in characters as a short label: "812 B", "4.2 kB", "1.3 MB" (one character counted as one byte). */
export const sizeLabel = (n: number): string => (n < 1000 ? `${n} B` : n < 1e6 ? `${(n / 1000).toFixed(1)} kB` : `${(n / 1e6).toFixed(1)} MB`);
