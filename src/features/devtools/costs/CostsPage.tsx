"use client";

import Link from "next/link";
import type { Plan } from "@/features/account/plans";
import type { PlanTokens } from "../model/unitEconomics";
import CostPerPlayer from "./CostPerPlayer";
import OpenRouterModels from "./OpenRouterModels";
import PlanCosts, { type ReuseInfo } from "./PlanCosts";

/** /dev/costs: what autoplans cost us. The plans with a year on each, one paying player's year on each AI model, and other models on OpenRouter. */
export default function CostsPage({ planTokens, plans, reuse }: { /** one plan's tokens per model, from the published compare-models runs */ planTokens: PlanTokens[]; /** the plans table; null without a database */ plans: Plan[] | null; /** each plan's chance of a new autoplan and the library; null without a database */ reuse: ReuseInfo | null }) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-100">AI costs</h2>
        <p className="text-sm text-slate-400">What autoplans cost us, from the tokens of the plans on <Link href="/dev/compare-models" className="text-sky-300 hover:underline">Compare AI models</Link>.</p>
        <span className="mt-1 flex gap-4 text-sm"><a href="#plans" className="text-sky-300 hover:underline">Plans ↓</a><a href="#cost" className="text-sky-300 hover:underline">What one player costs ↓</a><a href="#openrouter" className="text-sky-300 hover:underline">Other models ↓</a></span>
      </div>
      <PlanCosts plans={plans} tokens={planTokens} reuse={reuse} />
      <CostPerPlayer models={planTokens} />
      <OpenRouterModels tokens={planTokens} />
    </div>
  );
}
