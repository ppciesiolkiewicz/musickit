"use client";

import Link from "next/link";
import { useState } from "react";
import type { Plan } from "@/features/account/plans";
import { PAYMENT_PROVIDERS, type PlanTokens } from "../model/unitEconomics";
import CostPerPlayer from "./CostPerPlayer";
import OpenRouterModels from "./OpenRouterModels";
import PlanCosts, { type ReuseInfo } from "./PlanCosts";

/** /dev/costs: what autoplans cost us. The plans with a year on each, one paying player's year on each AI model, and other models on OpenRouter. */
export default function CostsPage({ planTokens, plans, reuse }: { /** one plan's tokens per model, from the published compare-models runs */ planTokens: PlanTokens[]; /** the plans table; null without a database */ plans: Plan[] | null; /** each plan's chance of a new autoplan and the library; null without a database */ reuse: ReuseInfo | null }) {
  const [provider, setProvider] = useState<keyof typeof PAYMENT_PROVIDERS>("stripe");
  const fee = PAYMENT_PROVIDERS[provider];
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-100">AI costs</h2>
        <p className="text-sm text-slate-400">What autoplans cost us, from the tokens of the plans on <Link href="/dev/compare-models" className="text-sky-300 hover:underline">Compare AI models</Link>.</p>
        <span className="mt-1 flex gap-4 text-sm"><a href="#plans" className="text-sky-300 hover:underline">Plans ↓</a><a href="#cost" className="text-sky-300 hover:underline">What one player costs ↓</a><a href="#openrouter" className="text-sky-300 hover:underline">Other models ↓</a></span>
        <label className="mt-3 flex max-w-xs flex-col gap-1 text-sm text-slate-300">
          Payment, for every section
          <select value={provider} onChange={(e) => setProvider(e.target.value as keyof typeof PAYMENT_PROVIDERS)} className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100">
            {Object.entries(PAYMENT_PROVIDERS).map(([id, v]) => <option key={id} value={id}>{v.label}</option>)}
          </select>
        </label>
      </div>
      <PlanCosts plans={plans} tokens={planTokens} reuse={reuse} fee={fee} />
      <CostPerPlayer models={planTokens} plans={plans} reuse={reuse} fee={fee} />
      <OpenRouterModels tokens={planTokens} fee={fee} />
    </div>
  );
}
