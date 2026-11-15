"use client";

import { useState } from "react";
import { PRICING } from "@/features/account/pricing";
import { BASELINE_ID, OPENROUTER_CHECKED, estimateOpenRouter } from "../model/openRouter";
import type { PlanTokens } from "../model/unitEconomics";

/**
 * "Other models on OpenRouter": what an autoplan would cost on each model in `model/openRouter.ts`, on Haiku 5.5's
 * measured tokens, and what is left of the Student price. A price comparison only: none has been run on the plan prompt.
 */

const usd = (x: number) => {
  const sign = x < 0 ? "−" : "";
  const a = Math.abs(x);
  return `${sign}$${a < 0.01 ? a.toFixed(4) : a < 10 ? a.toFixed(a < 1 ? 3 : 2) : Math.round(a).toLocaleString("en-US")}`;
};
const k = (n: number) => `${Math.round(n / 1000)}k`;

export default function OpenRouterModels({ tokens, fee: provider }: { tokens: PlanTokens[]; /** the payment provider chosen at the top of the page */ fee: { percent: number; fixed: number } }) {
  const ref = tokens.find((t) => t.model === "claude-haiku-5-5") ?? tokens.find((t) => t.model === "haiku");
  const [plansPerMonth, setPlansPerMonth] = useState<number>(PRICING.player.plansPerMonth);
  const price = PRICING.player.priceNumber;
  const fee = (price * provider.percent) / 100 + provider.fixed;
  const email = (365 * 0.4) / 1000;

  return (
    <section id="openrouter" className="scroll-mt-4 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
      <h2 className="text-base font-semibold text-slate-100">Other models on OpenRouter</h2>
      <p className="mb-4 max-w-3xl text-xs text-slate-400">
        Models to weigh against Haiku 5.5, at OpenRouter&apos;s list prices (checked {OPENROUTER_CHECKED}). None has been run on the plan prompt, so each is costed on Haiku 5.5&apos;s measured tokens{ref ? ` (${k(ref.input)} in, ${k(ref.output)} out a plan)` : ""}: a price comparison, not a quality one. A prompt past a model&apos;s long-prompt line is billed at its dearer price, all of it (in amber when this plan crosses it). Their tokenisers differ, and a reasoning model can write many more output tokens. Left of {usd(price)} takes off the Stripe fee and one email a day. Edit the list in <code className="text-slate-300">src/features/devtools/model/openRouter.ts</code>.
      </p>
      {!ref ? (
        <p className="text-sm text-slate-400">No published Haiku 5.5 runs with token counts yet. Run npm run compare-models, then npm run -s publish-model-plans.</p>
      ) : (
        <>
          <label className="mb-4 flex max-w-sm flex-col gap-1">
            <span className="flex items-baseline justify-between gap-2 text-sm text-slate-300">
              Autoplans a month
              <span className="font-mono text-sm font-semibold tabular-nums text-slate-50">{plansPerMonth}</span>
            </span>
            <input type="range" min={0} max={120} step={1} value={plansPerMonth} onChange={(e) => setPlansPerMonth(Number(e.target.value))} className="w-full accent-sky-400" />
            <span className="text-xs text-slate-500">The Student allowance is {PRICING.player.plansPerMonth}; Teacher plans go to 300.</span>
          </label>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[48rem] text-right text-sm">
              <thead className="text-xs text-slate-400">
                <tr className="border-b border-slate-800">
                  <th className="py-2 text-left font-medium">Model</th>
                  <th className="font-medium">$ per M in / out</th>
                  <th className="font-medium">An autoplan</th>
                  <th className="font-medium">vs Haiku</th>
                  <th className="font-medium">AI a year</th>
                  <th className="font-medium">Left of {usd(price)}</th>
                </tr>
              </thead>
              <tbody>
                {estimateOpenRouter(ref, plansPerMonth).map(({ model: m, perPlan, aiYear, vsBaseline }) => {
                  const left = price - aiYear - fee - email;
                  const base = m.id === BASELINE_ID;
                  return (
                    <tr key={m.id} className={`border-b border-slate-800/60 align-top text-slate-200 ${base ? "bg-sky-500/5" : ""}`}>
                      <td className="py-2 text-left">
                        <span className="font-semibold">{m.label}</span>
                        {base && <span className="ml-2 rounded bg-sky-500/15 px-1.5 py-0.5 text-[11px] text-sky-300">in use</span>}
                        <span className="block text-xs text-slate-400">{m.about}</span>
                        <span className="block font-mono text-xs text-slate-500">{m.id}</span>
                      </td>
                      <td className="py-2 font-mono text-xs text-slate-400">
                        {m.input} / {m.output}
                        {m.long && <span className={`block ${ref.input >= m.long.from ? "text-amber-300" : ""}`}>{m.long.input} / {m.long.output} from {k(m.long.from)}</span>}
                      </td>
                      <td className="py-2">{usd(perPlan)}</td>
                      <td className={`py-2 ${vsBaseline < 1 ? "text-emerald-300" : vsBaseline > 1 ? "text-amber-300" : "text-slate-400"}`}>{vsBaseline.toFixed(vsBaseline < 1 ? 2 : 1)}×</td>
                      <td className="py-2">{usd(aiYear)}</td>
                      <td className={`py-2 font-semibold ${left < 0 ? "text-rose-300" : "text-emerald-300"}`}>{usd(left)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
