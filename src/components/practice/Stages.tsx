"use client";

import type { ReactNode } from "react";
import Icon from "@/components/Icon";
import { Button } from "@/components/ui";

/**
 * Where an exercise of stages stands: "Stage 2 of 4", with a dot per stage, the ones behind green and the one being
 * played lit. `at` past the last stage shows every stage done.
 */
export function StageRow({ at, total, detail }: { at: number; total: number; /** after the stage: "question 3 of 5" */ detail?: string }) {
  const done = at >= total;
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400" aria-label={done ? `All ${total} stages done` : `Stage ${at + 1} of ${total}`}>
      <span className="font-semibold uppercase tracking-[0.12em] text-slate-300">{done ? "All stages done" : `Stage ${at + 1} of ${total}`}</span>
      <span className="flex gap-1" aria-hidden>
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className={`size-2 rounded-full ${i < at ? "bg-emerald-400/80" : i === at ? "bg-sky-300" : "bg-slate-700"}`} />
        ))}
      </span>
      {!done && detail && <span className="tabular-nums">{detail}</span>}
    </div>
  );
}

/** The end of an exercise of stages: says it is complete, what was done, and offers Start again from the first stage. */
export function ExerciseDone({ total, onRestart, children }: { total: number; onRestart(): void; /** a line about how it went, or what to notice */ children?: ReactNode }) {
  return (
    <div role="status" className="flex flex-col items-center gap-2 rounded-2xl border border-emerald-400/40 bg-emerald-500/10 p-4 text-center">
      <p className="text-lg font-semibold text-emerald-200">Exercise complete</p>
      <p className="text-sm text-slate-300">You went through all {total} {total === 1 ? "stage" : "stages"}.</p>
      {children && <div className="text-sm text-slate-300">{children}</div>}
      <Button size="sm" onClick={onRestart} className="inline-flex items-center gap-1.5"><Icon name="rotate-ccw" size={13} />Start again</Button>
    </div>
  );
}
