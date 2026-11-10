"use client";

import { Button } from "@/components/ui";
import { sanitiseState, PLAN_KEY } from "@/features/plan/store/localPlanStore";
import { DEFAULT_STUDIO, type StudioState } from "../model/compose";
import type { RunSummary } from "../model/history";

const field = "w-full rounded-lg border border-slate-700 bg-slate-950/60 p-2 font-mono text-xs text-slate-200 focus:border-sky-500 focus:outline-none";

/** The answers stored by /plan in this browser, as JSON text; null when there are none. Read only. */
function planAnswersText(): string | null {
  try {
    const raw = localStorage.getItem(PLAN_KEY);
    const answers = raw ? sanitiseState(JSON.parse(raw)).answers : null;
    return answers ? JSON.stringify(answers, null, 2) : null;
  } catch {
    return null;
  }
}

/** What the prompt is built from: the answers JSON, first or next week, and for next week a past run as last week. */
export default function StudioInputs({ state, set, error, runs }: {
  state: StudioState; set: (change: Partial<StudioState>) => void; error?: string; runs: RunSummary[];
}) {
  const past = runs.filter((r) => r.ok && r.title);
  const loadPlan = () => {
    const text = planAnswersText();
    if (text) set({ answersText: text });
  };
  return (
    <div className="grid gap-3 lg:grid-cols-[1fr_20rem]">
      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
          <span className="font-semibold text-slate-300">Answers</span>
          <Button size="sm" onClick={() => set({ answersText: DEFAULT_STUDIO.answersText })}>Reset to defaults</Button>
          <Button size="sm" onClick={loadPlan}>Load my /plan answers</Button>
          <Button size="sm" onClick={() => set({ answersText: "null" })}>Skipped questionnaire</Button>
        </div>
        <textarea aria-label="Answers JSON" value={state.answersText} onChange={(e) => set({ answersText: e.target.value })} spellCheck={false} className={`${field} h-48`} />
        {error && <p role="alert" className="text-xs text-rose-300">Answers: {error}</p>}
      </div>
      <div className="flex flex-col gap-2 text-xs">
        <span className="font-semibold text-slate-300">Prompt for</span>
        <div className="flex gap-2">
          <Button size="sm" pressed={state.mode === "first"} onClick={() => set({ mode: "first" })}>First week</Button>
          <Button size="sm" pressed={state.mode === "next"} onClick={() => set({ mode: "next" })}>Next week</Button>
        </div>
        {state.mode === "next" &&
          (past.length ? (
            <>
              <label className="flex flex-col gap-1 text-slate-400">
                Last week (a past run)
                <select value={state.previousId ?? ""} onChange={(e) => set({ previousId: e.target.value || undefined })} className={field}>
                  <option value="">None</option>
                  {past.map((r) => <option key={r.id} value={r.id}>{r.at.slice(0, 16).replace("T", " ")} · {r.title}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-slate-400">
                Feedback on that week
                <input value={state.feedback} onChange={(e) => set({ feedback: e.target.value })} placeholder="too easy, loved the blues…" className={field} />
              </label>
              <p className="text-slate-500">Tick exercises in that run&apos;s preview below to mark them done.</p>
            </>
          ) : (
            <p className="text-slate-500">No past runs yet.</p>
          ))}
      </div>
    </div>
  );
}
