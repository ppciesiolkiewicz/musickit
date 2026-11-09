"use client";

import { useMemo, useState } from "react";
import { catalogue } from "@/features/plan/model/catalogue";
import { parsePlanConfig } from "@/features/plan/model/config";
import { localDate, ratePlan } from "@/features/plan/model/schedule";
import type { StoredPlan } from "@/features/plan/model/types";
import type { Stars } from "@/features/progress/stars";
import WeekView from "@/features/plan/ui/WeekView";
import { DISPLAY } from "@/components/landing/Display";

/**
 * A reply rendered the way the player gets it: the parse error, or the warnings and the real week view. Ratings are local
 * to the preview and the exercises they mark done are reported through `onDone` (the next-week prompt uses them as "done"). Remount it (key) for a new reply.
 */
export default function PlanPreview({ reply, onDone }: { reply: string; onDone?: (done: Record<string, boolean>) => void }) {
  const entries = useMemo(() => catalogue(), []);
  const result = useMemo(() => parsePlanConfig(reply, entries), [reply, entries]);
  const [day, setDay] = useState(0);
  const [marks, setMarks] = useState<Pick<StoredPlan, "done" | "rated">>({ done: {} });
  const [startedOn] = useState(() => localDate());

  if (!result.ok) return <p role="alert" className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">Not a plan: {result.error}</p>;
  const plan: StoredPlan = { id: "preview", config: result.config, startedOn, ...marks };
  const rate = (d: number, e: number, stars: Stars | null) => {
    const { done, rated } = ratePlan(plan, d, e, stars, new Date().toISOString());
    setMarks({ done, rated });
    onDone?.(done);
  };
  return (
    <div className="flex flex-col gap-3">
      <div>
        <h3 className="text-2xl text-slate-50" style={DISPLAY}>{result.config.title}</h3>
        {result.config.summary && <p className="text-sm text-slate-400">{result.config.summary}</p>}
      </div>
      {result.warnings.length > 0 && (
        <ul className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-2 text-xs text-amber-300/90">
          {result.warnings.map((w) => <li key={w}>{w}</li>)}
        </ul>
      )}
      <WeekView plan={plan} today={0} day={day} onDay={setDay} onRate={rate} />
    </div>
  );
}
