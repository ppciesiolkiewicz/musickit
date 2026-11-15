"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { Section } from "@/components/ui";
import { catalogue } from "@/features/plan/model/catalogue";
import { MODEL_PLANS, modelPlanSlug } from "@/features/plan/modelPlans";
import { JUDGE_MODEL, isCurrent, type Assessment } from "../model/assess";
import { cellKey, demoReplyChars, latestByCell, personaPrompt, runCost } from "../model/compare";
import type { RunSummary } from "../model/history";
import { DEMO_MODELS, isOllamaModel, ollamaName, type DevModel } from "../model/models";
import { PERSONAS } from "../model/personas";
import { API_PRICES, THINKING_FACTOR, estimateCost, usd } from "../model/pricing";
import { fetchAssessments, fetchRuns } from "../prompt/api";
import AssessmentPanel, { markTone } from "./AssessmentPanel";

const labelOf = (m: DevModel) => API_PRICES[m]?.label ?? (isOllamaModel(m) ? ollamaName(m) : m);

/** The public page of a player's plan from a model (`npm run -s publish-model-plans` copies it there), opened in a new tab. */
const planHref = (persona: string, model: string) => `/demo/models/${modelPlanSlug(persona, model)}`;
/** Whether that page shows this run: published, and not since replaced by a newer run. */
const isPublished = (r: RunSummary) => r.persona !== undefined && MODEL_PLANS[modelPlanSlug(r.persona, r.model)]?.runId === r.id;

/** The parser's warnings on a plan, as a tag. */
function WarningsTag({ n }: { n: number }) {
  return (
    <span className={`mt-1 inline-block rounded-full border px-1.5 py-px tabular-nums ${n ? "border-amber-500/40 bg-amber-500/10 text-amber-300" : "border-slate-700 text-slate-500"}`}>
      {n ? `${n} warning${n === 1 ? "" : "s"}` : "no warnings"}
    </span>
  );
}

/**
 * The plans scripts/compare-models.ts wrote, one per made-up player and model, priced as if sent through the API: before a
 * run, the composed prompt as input and a reply the size of the hand-tuned demo plans (with thinking) as output; after,
 * the run's own tokens. Nothing runs from here; a cell opens its plan's /demo/models page in a new tab, and its "vs" mark opens what the judge model said
 * of it against its own plan for that player (`npm run compare-models -- assess`), in a row under the player.
 */
export default function CompareModelsPage() {
  const entries = useMemo(() => catalogue(), []);
  const prompts = useMemo(() => new Map(PERSONAS.map((p) => [p.id, personaPrompt(p, entries)])), [entries]);
  const replyChars = useMemo(() => demoReplyChars(), []);
  const [runs, setRuns] = useState<RunSummary[] | null>(null);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  /** the judged run whose assessment is open under its player's row */
  const [assessed, setAssessed] = useState<string | null>(null);

  useEffect(() => {
    fetchRuns().then(setRuns);
    fetchAssessments().then(setAssessments);
  }, []);
  const byCandidate = useMemo(() => new Map(assessments.map((a) => [a.candidateId, a])), [assessments]);
  const judge = labelOf(JUDGE_MODEL);

  const cells = useMemo(() => latestByCell(runs ?? []), [runs]);
  // the Claude models always; a local model once it has a plan (failed attempts alone don't add a column)
  const models = useMemo<DevModel[]>(() => {
    const local = [...new Set([...cells.values()].filter((r) => r.title).map((r) => r.model).filter(isOllamaModel))].sort();
    return [...DEMO_MODELS, ...local];
  }, [cells]);
  const total = [...cells.values()].reduce((s, r) => s + (runCost(r) ?? 0), 0);

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
          <p>
            <b>vs {judge}</b>: {judge} marked the plan against its own plan for that player, out of 10. Open a mark to read why.
            Write the marks with <code className="text-slate-300">npm run -s compare-models -- assess</code>.
          </p>
          <p>
            A plan opens in a new tab at <code className="text-slate-300">/demo/models/&lt;player&gt;--&lt;model&gt;</code>: public, but not listed on /demo.
            A plan marked <i>not published</i> isn&apos;t there yet: copy it there with <code className="text-slate-300">npm run -s publish-model-plans</code>.
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
              {PERSONAS.map((p) => {
                const reference = cells.get(cellKey(p.id, JUDGE_MODEL));
                const shown = assessed ? byCandidate.get(assessed) : undefined;
                const shownRun = shown?.persona === p.id ? [...cells.values()].find((r) => r.id === shown.candidateId) : undefined;
                return (
                <Fragment key={p.id}>
                <tr className="border-t border-slate-800 align-top">
                  <td className="p-2 text-slate-200">{p.label}</td>
                  <td className="p-2 tabular-nums text-slate-400">~{Math.round(prompts.get(p.id)!.text.length / 4).toLocaleString()} tok</td>
                  {models.map((m) => {
                    const r = cells.get(cellKey(p.id, m));
                    const est = estimateCost(m, prompts.get(p.id)!.text.length, replyChars);
                    const cost = r ? runCost(r) : null;
                    const a = r ? byCandidate.get(r.id) : undefined;
                    const stale = !!a && !isCurrent(a, reference?.title !== undefined ? reference.id : undefined);
                    return (
                      <td key={m} className="p-2">
                        <div className="tabular-nums text-slate-500">{est ? `est. ${usd(est.usd)}` : "no price"}</div>
                        {r?.ok ? (
                          <div className="mt-1">
                            <span className="block tabular-nums text-slate-400">
                              {cost !== null ? `API ${usd(cost)}` : r.usage ? `${((r.usage.output) / 1000).toFixed(1)}k tok out` : "no token counts"} · {(r.durationMs / 1000).toFixed(0)} s
                            </span>
                            {r.title === undefined ? (
                              <span className="block text-rose-300">not a plan</span>
                            ) : isPublished(r) ? (
                              <a href={planHref(p.id, m)} target="_blank" rel="noreferrer" className="block text-sky-300 hover:underline">{r.title} ↗</a>
                            ) : (
                              <span className="block text-slate-300">{r.title} <span className="text-slate-500">(not published)</span></span>
                            )}
                            {r.warnings !== undefined && <WarningsTag n={r.warnings} />}
                          </div>
                        ) : r ? (
                          <div className="mt-1 text-rose-300" title={r.error}>failed</div>
                        ) : (
                          <div className="mt-1 text-slate-600">{runs ? "not written" : "…"}</div>
                        )}
                        {a ? (
                          <button
                            type="button" aria-expanded={assessed === a.candidateId} onClick={() => setAssessed(assessed === a.candidateId ? null : a.candidateId)}
                            className={`mt-1 block rounded border px-1.5 py-0.5 text-left tabular-nums hover:bg-slate-800 ${assessed === a.candidateId ? "border-slate-500 bg-slate-800" : "border-slate-700"} ${a.verdict && !stale ? markTone(a.verdict.score, 10) : "text-slate-400"}`}
                          >
                            vs {judge}{a.verdict ? ` ${a.verdict.score}/10` : ": failed"}{stale && a.verdict ? " (older plan)" : ""}
                          </button>
                        ) : m === JUDGE_MODEL && r?.title !== undefined ? (
                          <div className="mt-1 text-slate-500">the reference</div>
                        ) : null}
                      </td>
                    );
                  })}
                </tr>
                {shown && shownRun && (
                  <tr>
                    <td colSpan={models.length + 2} className="p-2 pt-0">
                      <AssessmentPanel
                        a={shown}
                        heading={`${p.label}: ${shownRun.model !== "pasted" ? labelOf(shownRun.model) : "pasted"} against ${judge}`}
                        stale={!isCurrent(shown, reference?.id) && !!shown.verdict}
                        actions={
                          <>
                            <a href={planHref(p.id, shownRun.model)} target="_blank" rel="noreferrer" className="text-sky-300 hover:underline">Open this plan ↗</a>
                            {reference && <a href={planHref(p.id, JUDGE_MODEL)} target="_blank" rel="noreferrer" className="text-sky-300 hover:underline">Open the reference ↗</a>}
                            <button type="button" onClick={() => setAssessed(null)} className="text-slate-400 hover:underline">Close</button>
                          </>
                        }
                      />
                    </td>
                  </tr>
                )}
                </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}
