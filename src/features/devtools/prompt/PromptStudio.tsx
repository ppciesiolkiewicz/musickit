"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Icon from "@/components/Icon";
import { Button, Section } from "@/components/ui";
import { catalogue } from "@/features/plan/model/catalogue";
import { promptParts } from "@/features/plan/model/prompt";
import { DEFAULT_STUDIO, STUDIO_KEY, answersFromText, composePrompt, readStudio, storedPlanFrom, type StudioState } from "../model/compose";
import type { RunRecord, RunSummary } from "../model/history";
import PartList from "./PartList";
import StudioInputs from "./StudioInputs";

const noSubscribe = () => () => {};

const loadStudio = (): StudioState => {
  try {
    return readStudio(JSON.parse(localStorage.getItem(STUDIO_KEY) ?? "null"));
  } catch {
    return readStudio(null);
  }
};

/** The past runs, newest first; [] while loading or when the history can't be read. */
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
  const [prevDone] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (mounted) localStorage.setItem(STUDIO_KEY, JSON.stringify(state));
  }, [mounted, state]);
  useEffect(() => {
    fetchRuns().then(setRuns);
  }, []);
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
  const lastWeek = previousId && previous?.id === previousId ? storedPlanFrom(previous, prevDone, state.feedback, entries) : null;
  const parts = useMemo(() => (!read.error ? promptParts(read.answers, entries, lastWeek ? [lastWeek] : []) : []), [read, entries, lastWeek]);
  const composed = useMemo(() => composePrompt(parts, state.overrides), [parts, state.overrides]);

  if (!mounted) return <p className="text-sm text-slate-500">Loading…</p>;
  const set = (change: Partial<StudioState>) => setState((s) => ({ ...s, ...change }));
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
        </div>
      </Section>
    </div>
  );
}
