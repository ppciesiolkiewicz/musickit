"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Section } from "@/components/ui";
import { DEMO_PLANS, demoPlan } from "@/features/plan/demos";
import { catalogue } from "@/features/plan/model/catalogue";
import { promptParts } from "@/features/plan/model/prompt";
import { composePrompt } from "../model/compose";
import { newRunId, type RunRecord } from "../model/history";
import { DEMO_MODELS, type DevModel } from "../model/models";
import { PERSONAS, type Persona } from "../model/personas";
import { API_PRICES, THINKING_FACTOR, estimateCost, usd } from "../model/pricing";
import { fetchRun, post } from "../prompt/api";
import PlanPreview from "../prompt/PlanPreview";
import { useMounted } from "../prompt/storage";

const SAVED_KEY = "musickit.dev.moreDemos";
const FABLE: DevModel = "claude-fable-5-2";
/** At most this many runs at once; the rest wait. */
const PARALLEL = 3;

type Cell = { state: "queued" | "running" } | { state: "done"; run: RunRecord } | { state: "failed"; error: string };
const key = (persona: string, model: DevModel) => `${persona}|${model}`;

function loadSaved(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(SAVED_KEY) ?? "{}") as Record<string, string>;
  } catch {
    return {};
  }
}

/**
 * Temporary: write a plan for each made-up player with each model, and see what each costs. The estimate is the composed
 * prompt as input and a reply the size of the hand-tuned demo plans (with thinking) as output, at API prices; a finished
 * run shows the cost the claude CLI reports. Runs go through /api/dev/run and land in the prompt history too.
 */
export default function MoreDemosPage() {
  const mounted = useMounted();
  const entries = useMemo(() => catalogue(), []);
  const prompts = useMemo(
    () => new Map(PERSONAS.map((p) => [p.id, composePrompt(promptParts(p.answers, entries, []), {})])),
    [entries],
  );
  // a reply the size of the demo plans
  const replyChars = useMemo(() => {
    const sizes = Object.keys(DEMO_PLANS).map((s) => JSON.stringify(demoPlan(s)?.config ?? {}).length);
    return Math.round(sizes.reduce((a, b) => a + b, 0) / Math.max(1, sizes.length));
  }, []);
  const [models, setModels] = useState<DevModel[]>(DEMO_MODELS.filter((m) => m !== FABLE));
  const [cells, setCells] = useState<Record<string, Cell>>({});
  const [open, setOpen] = useState<string | null>(null);

  // finished runs from earlier visits, by cell
  useEffect(() => {
    if (!mounted) return;
    for (const [k, id] of Object.entries(loadSaved())) {
      fetchRun(id).then((run) => run && setCells((c) => (c[k] ? c : { ...c, [k]: run.error ? { state: "failed", error: run.error } : { state: "done", run } })));
    }
  }, [mounted]);

  const run = async (persona: Persona, model: DevModel) => {
    const k = key(persona.id, model);
    const composed = prompts.get(persona.id)!;
    setCells((c) => ({ ...c, [k]: { state: "running" } }));
    try {
      const rec = await post("/api/dev/run", {
        prompt: composed.text, mode: "first", answers: persona.answers, overrides: {}, parts: composed.parts, model, id: newRunId(new Date()),
      });
      try {
        localStorage.setItem(SAVED_KEY, JSON.stringify({ ...loadSaved(), [k]: rec.id }));
      } catch {}
      setCells((c) => ({ ...c, [k]: rec.error ? { state: "failed", error: rec.error } : { state: "done", run: rec } }));
    } catch (e) {
      setCells((c) => ({ ...c, [k]: { state: "failed", error: (e as Error).message } }));
    }
  };

  const runAll = async () => {
    const queue = PERSONAS.flatMap((p) => models.map((m) => [p, m] as const)).filter(([p, m]) => {
      const s = cells[key(p.id, m)]?.state;
      return s !== "running" && s !== "queued" && s !== "done";
    });
    setCells((c) => ({ ...c, ...Object.fromEntries(queue.map(([p, m]) => [key(p.id, m), { state: "queued" } as Cell])) }));
    const work = async () => {
      for (let next = queue.shift(); next; next = queue.shift()) await run(...next);
    };
    await Promise.all(Array.from({ length: PARALLEL }, work));
  };

  if (!mounted) return <p className="text-sm text-slate-500">Loading…</p>;

  const estimateOf = (persona: string, model: DevModel) => estimateCost(model, prompts.get(persona)!.text.length, replyChars);
  const pending = PERSONAS.flatMap((p) => models.map((m) => key(p.id, m))).filter((k) => cells[k]?.state !== "done");
  const pendingUsd = pending.reduce((sum, k) => {
    const [p, m] = k.split("|") as [string, DevModel];
    return sum + (estimateOf(p, m)?.usd ?? 0);
  }, 0);
  const spent = Object.values(cells).reduce((s, c) => s + (c.state === "done" ? c.run.costUsd ?? 0 : 0), 0);
  const opened = open ? cells[open] : undefined;

  return (
    <div className="flex flex-col gap-4">
      <Section title="More demos (temporary)">
        <div className="flex flex-col gap-3 text-sm text-slate-300">
          <p className="text-slate-400">
            One plan per player and model, run with the local claude CLI. <b>Est.</b> is at API prices: the prompt as input,
            and as output a reply the size of the demo plans (~{Math.round(replyChars / 4).toLocaleString()} tokens) × {THINKING_FACTOR} for thinking.
            <b> Cost</b> is what the CLI reports for the finished run.
          </p>
          <div className="flex flex-wrap items-center gap-3 text-xs">
            {DEMO_MODELS.map((m) => (
              <label key={m} className="flex items-center gap-1">
                <input type="checkbox" checked={models.includes(m)} onChange={(e) => setModels((list) => (e.target.checked ? DEMO_MODELS.filter((x) => x === m || list.includes(x)) : list.filter((x) => x !== m)))} />
                {API_PRICES[m]?.label} <span className="text-slate-500">(${API_PRICES[m]?.input}/${API_PRICES[m]?.output} per M)</span>
                {m === FABLE && <span className="text-amber-300">expensive</span>}
              </label>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <Button onClick={runAll} disabled={!pending.length}>Run all ticked ({pending.length}) · est. {usd(pendingUsd)}</Button>
            <span className="tabular-nums text-slate-400">Spent so far: {usd(spent)}</span>
          </div>
        </div>
      </Section>
      <Section title="Players × models">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-slate-400">
                <th className="p-2">Player</th>
                <th className="p-2">Prompt</th>
                {DEMO_MODELS.map((m) => <th key={m} className="p-2">{API_PRICES[m]?.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {PERSONAS.map((p) => (
                <tr key={p.id} className="border-t border-slate-800 align-top">
                  <td className="p-2 text-slate-200">{p.label}</td>
                  <td className="p-2 tabular-nums text-slate-400">~{Math.round(prompts.get(p.id)!.text.length / 4).toLocaleString()} tok</td>
                  {DEMO_MODELS.map((m) => {
                    const k = key(p.id, m);
                    const c = cells[k];
                    const est = estimateOf(p.id, m);
                    return (
                      <td key={m} className={`p-2 ${open === k ? "bg-slate-800/60" : ""}`}>
                        <div className="tabular-nums text-slate-400">est. {est ? usd(est.usd) : "?"}</div>
                        {c?.state === "done" ? (
                          <button type="button" onClick={() => setOpen(k)} className="mt-1 block text-left text-sky-300 hover:underline">
                            <span className="tabular-nums">{c.run.costUsd !== undefined ? usd(c.run.costUsd) : "no cost"} · {(c.run.durationMs / 1000).toFixed(0)} s</span>
                            <span className="block text-slate-300">{c.run.title ?? "not a plan"}{c.run.warnings ? ` · ${c.run.warnings} warnings` : ""}</span>
                          </button>
                        ) : c?.state === "failed" ? (
                          <div className="mt-1 text-rose-300" title={c.error}>failed <Button size="sm" onClick={() => run(p, m)}>Retry</Button></div>
                        ) : c ? (
                          <div className="mt-1 text-sky-300">{c.state}…</div>
                        ) : (
                          <Button size="sm" className="mt-1" onClick={() => run(p, m)}>Run</Button>
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
      <Section title="Plan">
        {opened?.state === "done" ? (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-slate-400">{open?.replace("|", " · ")} · {opened.run.id}</p>
            <PlanPreview key={opened.run.id} reply={opened.run.reply ?? ""} />
          </div>
        ) : (
          <p className="text-sm text-slate-500">Open a finished run from the table.</p>
        )}
      </Section>
    </div>
  );
}
