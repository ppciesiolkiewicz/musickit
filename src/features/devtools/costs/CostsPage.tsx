"use client";

import Link from "next/link";
import { useState } from "react";
import type { Plan } from "@/features/account/plans";
import { FIXED_COSTS, FIXED_COSTS_CHECKED, fixedTotal } from "../model/fixedCosts";
import { PAYMENT_PROVIDERS, type PlanTokens } from "../model/unitEconomics";
import CostPerPlayer from "./CostPerPlayer";
import OpenRouterModels from "./OpenRouterModels";
import OverTime from "./OverTime";
import PlanCosts, { type ReuseInfo } from "./PlanCosts";

/** /dev/costs: what autoplans cost us. The plans with a year on each, one paying player's year on each AI model, the business over time, and other models on OpenRouter. */
export default function CostsPage({ planTokens, plans, reuse }: { /** one plan's tokens per model, from the published compare-models runs */ planTokens: PlanTokens[]; /** the plans table; null without a database */ plans: Plan[] | null; /** each plan's chance of a new autoplan and the library; null without a database */ reuse: ReuseInfo | null }) {
  const [provider, setProvider] = useState<keyof typeof PAYMENT_PROVIDERS>("stripe");
  const fee = PAYMENT_PROVIDERS[provider];
  const [fixedOn, setFixedOn] = useState<Set<string>>(() => new Set(FIXED_COSTS.filter((c) => c.on).map((c) => c.id)));
  const fixedMonthly = fixedTotal(fixedOn);
  const toggleFixed = (id: string) => setFixedOn((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-100">AI costs</h2>
        <p className="text-sm text-slate-400">What autoplans cost us, from the tokens of the plans on <Link href="/dev/compare-models" className="text-sky-300 hover:underline">Compare AI models</Link>.</p>
        <span className="mt-1 flex gap-4 text-sm"><a href="#plans" className="text-sky-300 hover:underline">Plans ↓</a><a href="#cost" className="text-sky-300 hover:underline">What one player costs ↓</a><a href="#over-time" className="text-sky-300 hover:underline">Over time ↓</a><a href="#openrouter" className="text-sky-300 hover:underline">Other models ↓</a></span>
        <label className="mt-3 flex max-w-xs flex-col gap-1 text-sm text-slate-300">
          Payment, for every section
          <select value={provider} onChange={(e) => setProvider(e.target.value as keyof typeof PAYMENT_PROVIDERS)} className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100">
            {Object.entries(PAYMENT_PROVIDERS).map(([id, v]) => <option key={id} value={id}>{v.label}</option>)}
          </select>
        </label>
        <details className="mt-3 max-w-2xl rounded-lg border border-slate-800 bg-slate-950/40 p-3 text-sm">
          <summary className="cursor-pointer text-slate-300">
            Fixed costs, for every section: <span className="font-mono font-semibold text-slate-50">${fixedMonthly.toFixed(2)}</span> a month (${Math.round(fixedMonthly * 12).toLocaleString("en-US")} a year)
          </summary>
          <ul className="mt-3 flex flex-col gap-2">
            {FIXED_COSTS.map((c) => (
              <li key={c.id}>
                <label className="flex items-start gap-2">
                  <input type="checkbox" checked={fixedOn.has(c.id)} onChange={() => toggleFixed(c.id)} className="mt-1 accent-sky-400" />
                  <span className="flex-1">
                    <span className="flex justify-between gap-2 text-slate-200">{c.label}<span className="font-mono tabular-nums">${c.monthly.toFixed(2)}</span></span>
                    <span className="block text-xs text-slate-500">{c.note}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-slate-500">List prices for one seat or user, checked {FIXED_COSTS_CHECKED}, before tax and before usage past each plan. Change them in model/fixedCosts.ts.</p>
        </details>
      </div>
      <PlanCosts plans={plans} tokens={planTokens} reuse={reuse} fee={fee} />
      <CostPerPlayer models={planTokens} plans={plans} reuse={reuse} fee={fee} fixedMonthly={fixedMonthly} />
      <OverTime plans={plans} tokens={planTokens} reuse={reuse} fee={fee} fixedMonthly={fixedMonthly} />
      <OpenRouterModels tokens={planTokens} fee={fee} />
    </div>
  );
}
