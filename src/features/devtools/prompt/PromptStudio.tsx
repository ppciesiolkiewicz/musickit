"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Icon from "@/components/Icon";
import { Button, Section } from "@/components/ui";
import { catalogue } from "@/features/plan/model/catalogue";
import { promptParts } from "@/features/plan/model/prompt";
import { DEFAULT_STUDIO, STUDIO_KEY, answersFromText, composePrompt, readStudio, storedPlanFrom, type StudioState } from "../model/compose";
import type { RunRecord, RunSummary } from "../model/history";
import { fetchRun, fetchRuns } from "./api";
import HistoryList from "./HistoryList";
import PartList from "./PartList";
import PlanPreview from "./PlanPreview";
import RunPanel from "./RunPanel";
import StudioInputs from "./StudioInputs";

const noSubscribe = () => () => {};

const loadStudio = (): StudioState => {
  try {
    return readStudio(JSON.parse(localStorage.getItem(STUDIO_KEY) ?? "null"));
  } catch {
    return readStudio(null);
  }
};

/**
 * The autoplan prompt, taken apart: the answers and week it is built from, every labelled part (switch off, edit in place)
 * and the prompt as composed from them. The studio's state stays in this browser (STUDIO_KEY), never in the plan's store.
 */
export default function PromptStudio() {
  const entries = useMemo(() => catalogue(), []);
  // the saved state lives in localStorage, so the server and the hydrating render show "Loading…" and the studio comes after
  const mounted = useSyncExternalStore(noSubscribe, () => true, () => false);
  const [state, setState] = useState<StudioState>(() => (typeof window === "undefined" ? DEFAULT_STUDIO : loadStudio()));
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [previous, setPrevious] = useState<RunRecord | null>(null);
  const [open, setOpen] = useState<RunRecord | null>(null);
  // ticks made on each run's preview, by run id: the chosen last week's ticks are its "done"
  const [doneById, setDoneById] = useState<Record<string, Record<string, boolean>>>({});
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (mounted) localStorage.setItem(STUDIO_KEY, JSON.stringify(state));
  }, [mounted, state]);
  const refreshRuns = useCallback(() => {
    fetchRuns().then(setRuns);
  }, []);
  useEffect(refreshRuns, [refreshRuns]);
  const previousId = state.mode === "next" ? state.previousId : undefined;
  useEffect(() => {
    if (!previousId) return;
    let live = true;
    fetchRun(previousId).then((r) => live && setPrevious(r));
    return () => {
      live = false;
    };
  }, [previousId]);

  const read = useMemo(() => answersFromText(state.answersText), [state.answersText]);
  const prevDone = previousId ? doneById[previousId] : undefined;
  const lastWeek = useMemo(
    () => (previousId && previous?.id === previousId ? storedPlanFrom(previous, prevDone ?? {}, state.feedback, entries) : null),
    [previousId, previous, prevDone, state.feedback, entries],
  );
  const parts = useMemo(() => (!read.error ? promptParts(read.answers, entries, lastWeek ? [lastWeek] : []) : []), [read, entries, lastWeek]);
  const composed = useMemo(() => composePrompt(parts, state.overrides), [parts, state.overrides]);

  if (!mounted) return <p className="text-sm text-slate-500">Loading…</p>;
  const set = (change: Partial<StudioState>) => setState((s) => ({ ...s, ...change }));
  const openRun = async (id: string) => setOpen(await fetchRun(id));
  const onRecord = (r: RunRecord) => {
    setOpen(r);
    refreshRuns();
  };
  const loadInputs = (r: RunRecord) =>
    set({
      answersText: JSON.stringify(r.answers, null, 2), mode: r.mode, overrides: r.overrides, previousId: r.previousId, feedback: r.feedback ?? "",
      ...(r.model !== "pasted" ? { model: r.model } : {}),
    });
  const copy = async () => {
    await navigator.clipboard.writeText(composed.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-4">
      <Section title="Inputs">
        <StudioInputs state={state} set={set} error={read.error} runs={runs} />
      </Section>
      <Section title={`Parts (${parts.length})`}>
        <PartList parts={parts} overrides={state.overrides} onOverrides={(overrides) => set({ overrides })} entries={entries} />
      </Section>
      <Section title="Composed prompt">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <Button onClick={copy} disabled={!composed.text}>
              <Icon name={copied ? "check" : "copy"} size={14} />
              {copied ? "Copied" : "Copy prompt"}
            </Button>
            <span className="tabular-nums">{composed.text.length.toLocaleString()} chars · ~{Math.round(composed.text.length / 4).toLocaleString()} tokens</span>
            {composed.edited.length > 0 && <span className="text-amber-300">edited: {composed.edited.join(", ")}</span>}
            {composed.off.length > 0 && <span className="text-slate-500">off: {composed.off.join(", ")}</span>}
          </div>
          <textarea readOnly aria-label="Composed prompt" value={composed.text} onFocus={(e) => e.currentTarget.select()} className="h-56 w-full rounded-lg border border-slate-700 bg-slate-950/60 p-3 font-mono text-[11px] text-slate-300" />
          <RunPanel composed={composed} state={state} set={set} answers={read.answers} onRecord={onRecord} onRefresh={refreshRuns} />
        </div>
      </Section>
      <Section title="Result">
        <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
          <div className="min-w-0">
            {open ? (
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                  <span>{new Date(open.at).toLocaleString()} · {open.model} · {open.mode === "next" ? "next week" : "first week"}</span>
                  {open.durationMs > 0 && <span className="tabular-nums">{(open.durationMs / 1000).toFixed(1)} s</span>}
                  {open.costUsd !== undefined && <span className="tabular-nums">${open.costUsd.toFixed(3)}</span>}
                  <Button size="sm" onClick={() => loadInputs(open)}>Load inputs</Button>
                </div>
                {open.error ? (
                  <p role="alert" className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">{open.error}</p>
                ) : (
                  <PlanPreview key={open.id} reply={open.reply ?? ""} onDone={(d) => setDoneById((m) => ({ ...m, [open.id]: d }))} />
                )}
                {open.reply && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-slate-400">Raw reply ({open.reply.length.toLocaleString()} chars)</summary>
                    <pre className="mt-1 max-h-96 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-950/60 p-2 font-mono text-[11px] text-slate-300">{open.reply}</pre>
                  </details>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-500">Run the prompt, or open a past run.</p>
            )}
          </div>
          <HistoryList runs={runs} selectedId={open?.id} onOpen={openRun} />
        </div>
      </Section>
    </div>
  );
}
