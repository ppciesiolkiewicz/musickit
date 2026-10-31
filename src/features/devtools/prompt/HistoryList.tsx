"use client";

import type { RunSummary } from "../model/history";

const when = (at: string) => new Date(at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

/** Past runs, newest first: when, model, plan title (or why not), warnings, cost, edited parts. Click one to open it. */
export default function HistoryList({ runs, selectedId, onOpen }: { runs: RunSummary[]; selectedId?: string; onOpen: (id: string) => void }) {
  if (!runs.length) return <p className="text-xs text-slate-500">No runs yet. They are kept in tools/prompt-history/.</p>;
  return (
    <ol className="flex max-h-[40rem] flex-col gap-1 overflow-y-auto text-xs">
      {runs.map((r) => (
        <li key={r.id}>
          <button
            type="button"
            onClick={() => onOpen(r.id)}
            aria-current={r.id === selectedId ? "true" : undefined}
            className={`w-full rounded-lg border px-2 py-1.5 text-left transition ${r.id === selectedId ? "border-sky-500/70 bg-sky-500/10" : "border-slate-800 hover:border-slate-600"}`}
          >
            <span className="flex justify-between gap-2 text-slate-500">
              <span>{when(r.at)} · {r.model}{r.mode === "next" ? " · next week" : ""}</span>
              {r.costUsd !== undefined && <span className="tabular-nums">${r.costUsd.toFixed(3)}</span>}
            </span>
            <span className={`block truncate ${!r.ok ? "text-rose-300" : r.title ? "text-slate-200" : "text-amber-300"}`}>
              {!r.ok ? r.error ?? "failed" : r.title ?? "not a plan"}
              {r.warnings ? <span className="text-amber-300/80"> · {r.warnings} warnings</span> : null}
            </span>
            {r.edited.length > 0 && <span className="block truncate text-amber-300/70">edited: {r.edited.join(", ")}</span>}
          </button>
        </li>
      ))}
    </ol>
  );
}
