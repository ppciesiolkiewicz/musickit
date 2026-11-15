"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Section } from "@/components/ui";
import { catalogue } from "@/features/plan/model/catalogue";
import { cellKey, demoReplyChars, latestByCell, personaPrompt, runCost } from "../model/compare";
import type { RunRecord, RunSummary } from "../model/history";
import { DEMO_MODELS, isOllamaModel, ollamaName, type DevModel } from "../model/models";
import { PERSONAS } from "../model/personas";
import { API_PRICES, THINKING_FACTOR, estimateCost, usd } from "../model/pricing";
import { fetchRun, fetchRuns } from "../prompt/api";
import PlanPreview from "../prompt/PlanPreview";

const labelOf = (m: DevModel) => API_PRICES[m]?.label ?? (isOllamaModel(m) ? ollamaName(m) : m);

/**
 * The plans scripts/compare-models.ts wrote, one per made-up player and model, priced as if sent through the API: before a
 * run, the composed prompt as input and a reply the size of the hand-tuned demo plans (with thinking) as output; after,
 * the run's own tokens. Nothing runs from here; a cell opens its plan.
 */
export default function CompareModelsPage() {
  const entries = useMemo(() => catalogue(), []);
  const prompts = useMemo(() => new Map(PERSONAS.map((p) => [p.id, personaPrompt(p, entries)])), [entries]);
  const replyChars = useMemo(() => demoReplyChars(), []);
  const [runs, setRuns] = useState<RunSummary[] | null>(null);
  const [open, setOpen] = useState<RunRecord | null>(null);
  const [opening, setOpening] = useState<string | null>(null);
  const planRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchRuns().then(setRuns);
  }, []);

  const cells = useMemo(() => latestByCell(runs ?? []), [runs]);
  // the Claude models always; a local model once it has a plan (failed attempts alone don't add a column)
  const models = useMemo<DevModel[]>(() => {
    const local = [...new Set([...cells.values()].filter((r) => r.title).map((r) => r.model).filter(isOllamaModel))].sort();
    return [...DEMO_MODELS, ...local];
  }, [cells]);
  const total = [...cells.values()].reduce((s, r) => s + (runCost(r) ?? 0), 0);
  // the plan shows under the table, out of view: scroll to it once it is there
  const show = async (id: string) => {
    setOpening(id);
    const run = await fetchRun(id);
    setOpening(null);
    setOpen(run);
  };
  useEffect(() => {
    if (open) planRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [open]);

  return (
    <div className="flex flex-col gap-4">
      <Section title="Compare AI models for autoplan">
        <div className="flex flex-col gap-2 text-sm text-slate-400">
          <p>
            One first-week plan per player and model, written with the local claude CLI on your subscription (or the local
            Ollama), and priced as if sent through the API. <b>Est.</b>: the prompt as input, and as output a reply the size of
            the demo plans (~{Math.round(replyChars / 4).toLocaleString()} tokens) × {THINKING_FACTOR} for thinking. Under it, the
            tokens the run used, at API prices with no caching. A local model is priced at what OpenRouter charges for the same open model.
          </p>
          <p className="tabular-nums">{runs ? `Plans shown, at API prices: ${usd(total)}` : "Loading the plans…"}</p>
        </div>
      </Section>
      <Section title="Players × models">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-slate-400">
                <th className="p-2">Player</th>
                <th className="p-2">Prompt</th>
                {models.map((m) => (
                  <th key={m} className="p-2">
                    {labelOf(m)}
                    {API_PRICES[m] && <span className="block font-normal text-slate-500">${API_PRICES[m]!.input}/${API_PRICES[m]!.output} per M</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERSONAS.map((p) => (
                <tr key={p.id} className="border-t border-slate-800 align-top">
                  <td className="p-2 text-slate-200">{p.label}</td>
                  <td className="p-2 tabular-nums text-slate-400">~{Math.round(prompts.get(p.id)!.text.length / 4).toLocaleString()} tok</td>
                  {models.map((m) => {
                    const r = cells.get(cellKey(p.id, m));
                    const est = estimateCost(m, prompts.get(p.id)!.text.length, replyChars);
                    const cost = r ? runCost(r) : null;
                    return (
                      <td key={m} className={`p-2 ${open?.id === r?.id && r ? "bg-slate-800/60" : ""}`}>
                        <div className="tabular-nums text-slate-500">{est ? `est. ${usd(est.usd)}` : "no price"}</div>
                        {r?.ok ? (
                          <button type="button" onClick={() => show(r.id)} className="mt-1 block text-left text-sky-300 hover:underline">
                            <span className="tabular-nums">
                              {cost !== null ? `API ${usd(cost)}` : r.usage ? `${((r.usage.output) / 1000).toFixed(1)}k tok out` : "no token counts"} · {(r.durationMs / 1000).toFixed(0)} s
                            </span>
                            <span className="block text-slate-300">{r.title ?? "not a plan"}{r.warnings ? ` · ${r.warnings} warnings` : ""}</span>
                          </button>
                        ) : r ? (
                          <button type="button" onClick={() => show(r.id)} className="mt-1 block text-left text-rose-300 hover:underline" title={r.error}>failed</button>
                        ) : (
                          <div className="mt-1 text-slate-600">{runs ? "not written" : "…"}</div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
      <div ref={planRef} className="scroll-mt-4">
      <Section title="Plan">
        {open ? (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-slate-400">
              {PERSONAS.find((p) => p.id === open.persona)?.label ?? open.persona} · {open.model !== "pasted" ? labelOf(open.model) : "pasted"} · {open.id}
            </p>
            {open.error ? (
              <p role="alert" className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">{open.error}</p>
            ) : (
              <PlanPreview key={open.id} reply={open.reply ?? ""} />
            )}
            {open.reply && (
              <details className="text-xs">
                <summary className="cursor-pointer text-slate-400">Raw reply ({open.reply.length.toLocaleString()} chars)</summary>
                <pre className="mt-1 max-h-96 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-950/60 p-2 font-mono text-[11px] text-slate-300">{open.reply}</pre>
              </details>
            )}
          </div>
        ) : (
          <p className="text-sm text-slate-500">{opening ? "Opening the plan…" : "Open a plan from the table."}</p>
        )}
      </Section>
      </div>
    </div>
  );
}
