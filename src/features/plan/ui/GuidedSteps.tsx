"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import { Button } from "@/components/ui";
import type { PlanTool } from "../model/tools";
import ExerciseTool from "./ExerciseTool";

/**
 * An exercise whose tools belong to its steps, one step at a time: the steps as numbered pills (tap any), the current
 * step's words, its tools, and Back / Next. The step's tools change with the step; the exercise's other tools (a band
 * keeping time) live outside, so they keep playing.
 */
export default function GuidedSteps({ steps, tools }: { steps: string[]; tools: PlanTool[] }) {
  const [at, setAt] = useState(0);
  const mine = tools.filter((t) => t.step === at + 1);
  const last = at === steps.length - 1;
  return (
    <div className="flex flex-col gap-3">
      <ol className="flex flex-wrap gap-1.5" aria-label="Steps">
        {steps.map((s, i) => (
          <li key={i}>
            <button type="button" onClick={() => setAt(i)} aria-current={i === at ? "step" : undefined} title={s}
              className={`grid size-7 place-items-center rounded-full border text-xs tabular-nums transition ${i === at ? "border-sky-400 bg-sky-500/20 text-sky-100" : i < at ? "border-emerald-500/50 text-emerald-300" : "border-slate-700 text-slate-400 hover:border-slate-500"}`}>
              {i < at ? <Icon name="check" size={12} /> : i + 1}
            </button>
          </li>
        ))}
      </ol>
      <p className="text-sm leading-relaxed text-slate-100">
        <span className="mr-2 text-xs uppercase tracking-wider text-slate-500">Step {at + 1} of {steps.length}</span>
        {steps[at]}
      </p>
      {/* keyed by step: each step's views start fresh */}
      {mine.length > 0 && <div key={at} className="flex flex-col gap-3">{mine.map((t, i) => <ExerciseTool key={i} tool={t} />)}</div>}
      <div className="flex items-center gap-2">
        {at > 0 && <Button size="sm" onClick={() => setAt(at - 1)}><Icon name="chevron-left" size={12} />Back</Button>}
        {!last && <Button size="sm" className="ml-auto" onClick={() => setAt(at + 1)}>Next step<Icon name="chevron-right" size={12} /></Button>}
      </div>
    </div>
  );
}
