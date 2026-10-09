"use client";

import { useSyncExternalStore } from "react";
import Icon from "@/components/Icon";
import type { LooperEngine } from "@/lib/looper/engine";

const ibtn = "grid h-8 min-w-8 place-items-center rounded-lg border border-slate-700 bg-slate-900 px-1.5 text-xs text-slate-200 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400";

const clock = (t: number) => new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

/** Every change, newest first. Click a line to go back (or forward) to just after it; dimmed lines are undone and can be redone. */
export default function HistoryPanel({ engine }: { engine: LooperEngine }) {
  const h = engine.history;
  const state = useSyncExternalStore(h.subscribe, h.getState, h.getState);
  const rows = state.entries.map((e, i) => ({ e, i })).reverse();
  return (
    <div className="flex h-full min-h-0 flex-col gap-2 p-2">
      <div className="flex items-center gap-1.5">
        <button type="button" className={ibtn} disabled={state.cursor === 0} onClick={() => h.undo()} title="Undo (Ctrl+Z)" aria-label="Undo"><Icon name="undo-2" /></button>
        <button type="button" className={ibtn} disabled={state.cursor >= state.entries.length} onClick={() => h.redo()} title="Redo (Ctrl+Shift+Z)" aria-label="Redo"><Icon name="redo-2" /></button>
        <span className="text-xs text-slate-400">{state.cursor} of {state.entries.length}</span>
        <button type="button" className={`${ibtn} ml-auto`} disabled={state.entries.length === 0} onClick={() => h.clear()} title="Clear the history (the mix stays as it is)" aria-label="Clear the history"><Icon name="trash" /></button>
      </div>
      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-700 p-2 text-xs text-slate-400">Nothing yet. Volumes, mutes, moves, effects and the metronome show up here.</p>
      ) : (
        <ol className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-auto" aria-label="History">
          {rows.map(({ e, i }) => {
            const undone = i >= state.cursor;
            return (
              <li key={e.id}>
                <button type="button" onClick={() => h.jumpTo(i)} aria-current={i === state.cursor - 1 ? "step" : undefined} title="Go back to just after this change"
                  className={`flex w-full items-center gap-2 rounded-md border px-2 py-1 text-left text-xs transition ${i === state.cursor - 1 ? "border-sky-500/60 bg-sky-500/10 text-sky-100" : "border-transparent hover:border-slate-700"} ${undone ? "text-slate-500 line-through" : "text-slate-200"}`}>
                  <span className="min-w-0 flex-1 truncate">{e.label}</span>
                  {e.group && <Icon name="zap" size={12} className="shrink-0 text-amber-300" label="From a macro" />}
                  <span className="shrink-0 tabular-nums text-slate-500">{clock(e.at)}</span>
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
