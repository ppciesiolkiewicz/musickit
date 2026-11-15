"use client";

import { useState } from "react";
import { SUBSCRIPTION_MODEL, allowanceLabel, modelLabel, priceLabel, studentsLabel, type Plan } from "@/features/account/plans";
import { planYear, type PlanTokens } from "../model/unitEconomics";

/**
 * "Plans": every row of the plans table with what it costs us a year at a share of its allowance, every plan on the one
 * `SUBSCRIPTION_MODEL`, from the same measured tokens as "What one player costs". Change a plan in the database (the
 * `plans` table); this only reads it.
 */

const usd = (x: number) => {
  const sign = x < 0 ? "−" : "";
  const a = Math.abs(x);
  return `${sign}$${a < 10 ? a.toFixed(2) : Math.round(a).toLocaleString("en-US")}`;
};

/** What /dev/costs reads beside the plans: each plan's internal chance of a new autoplan, and the library it reuses from. */
export interface ReuseInfo {
  /** `plans.new_plan_percent` by plan id: 0 always reuses, 100 always writes */
  newPlanPercent: Record<string, number>;
  /** rows in `practice_plans`, and those enabled for reuse */
  library: { total: number; enabled: number };
}

export default function PlanCosts({ plans, tokens, reuse, fee }: { /** null: no database, so no plans table */ plans: Plan[] | null; tokens: PlanTokens[]; reuse: ReuseInfo | null; /** the payment provider chosen at the top of the page */ fee: { percent: number; fixed: number } }) {
  const [usage, setUsage] = useState(1);

  return (
    <section id="plans" className="scroll-mt-4 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
      <h2 className="text-base font-semibold text-slate-100">Plans</h2>
      <p className="mb-4 max-w-3xl text-xs text-slate-400">
        The plans in the database, what a year on each costs us and what is left. Every plan uses one model, {modelLabel(SUBSCRIPTION_MODEL)} (<code className="text-slate-300">SUBSCRIPTION_MODEL</code>), and an autoplan is costed on it from the median tokens of the published runs; AI notes spend the same allowance and are costed as autoplans. Change a plan in the <code className="text-slate-300">plans</code> table. Only enabled plans can be chosen on /account. <span className="text-slate-300">Written new</span> is <code className="text-slate-300">new_plan_percent</code>, internal and never shown to players: the chance an autoplan is written by the AI; the rest are taken from <code className="text-slate-300">practice_plans</code> at no AI cost.
      </p>
      {!plans ? (
        <p className="text-sm text-slate-400">No database, so no plans. Set DATABASE_URL and run npm run db:migrate.</p>
      ) : (
        <>
          <div className="mb-4 grid max-w-2xl gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="flex items-baseline justify-between gap-2 text-sm text-slate-300">
                Allowance used
                <span className="font-mono text-sm font-semibold tabular-nums text-slate-50">{Math.round(usage * 100)}%</span>
              </span>
              <input type="range" min={0} max={1} step={0.05} value={usage} onChange={(e) => setUsage(Number(e.target.value))} className="w-full accent-sky-400" />
              <span className="text-xs text-slate-500">100% is the worst case: every autoplan of the allowance, every month.</span>
            </label>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[56rem] text-right text-sm">
              <thead className="text-xs text-slate-400">
                <tr className="border-b border-slate-800">
                  <th className="py-2 text-left font-medium">Plan</th>
                  <th className="text-left font-medium">Gets</th>
                  <th className="text-left font-medium">Delivery</th>
                  <th className="font-medium">Price</th>
                  <th className="font-medium">Written new</th>
                  <th className="font-medium">An autoplan</th>
                  <th className="font-medium">AI a year</th>
                  <th className="font-medium">Payment</th>
                  <th className="font-medium">Left a year</th>
                  <th className="font-medium">Margin</th>
                </tr>
              </thead>
              <tbody>
                {[...plans].sort((a, b) => a.sort - b.sort).map((p) => {
                  const pct = reuse?.newPlanPercent[p.id] ?? 100;
                  // with no plan enabled for reuse there is nothing to take, so every autoplan is written
                  const reused = reuse && reuse.library.enabled > 0 ? 1 - pct / 100 : 0;
                  const y = planYear(p, SUBSCRIPTION_MODEL, tokens, usage, fee, 1, 0.4, reused);
                  const students = studentsLabel(p);
                  return (
                    <tr key={p.id} className="border-b border-slate-800/60 align-top text-slate-200">
                      <td className="py-2 text-left">
                        <span className="font-semibold">{p.name}</span>
                        <span className={`ml-2 rounded px-1.5 py-0.5 text-[11px] ${p.enabled ? "bg-emerald-500/15 text-emerald-300" : "bg-slate-700/50 text-slate-400"}`}>{p.enabled ? "enabled" : "off"}</span>
                        <span className="block font-mono text-xs text-slate-500">{p.id} · gives {p.role}</span>
                      </td>
                      <td className="py-2 text-left text-xs text-slate-400">
                        {students && <span className="block">{students}</span>}
                        <span className="block">{allowanceLabel(p)}</span>
                      </td>
                      <td className="py-2 text-left text-xs text-slate-400">
                        {p.batch ? "Batch: half price, minutes later" : "At once"}
                      </td>
                      <td className="py-2">{priceLabel(p)}{p.period === "month" && <span className="block text-xs text-slate-500">{usd(y.revenue)} a year</span>}</td>
                      <td className="py-2">{pct}%</td>
                      <td className="py-2">{y.perPlan === null ? <span className="text-xs text-amber-300">no runs</span> : usd(y.perPlan)}</td>
                      <td className="py-2">{usd(y.ai)}</td>
                      <td className="py-2">{usd(y.fee)}</td>
                      <td className={`py-2 font-semibold ${y.left < 0 ? "text-rose-300" : "text-emerald-300"}`}>{usd(y.left)}</td>
                      <td className={`py-2 ${y.margin < 0 ? "text-rose-300" : "text-slate-200"}`}>{Math.round(y.margin * 100)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-slate-500">Library: {reuse ? `${reuse.library.enabled} of ${reuse.library.total} plans in practice_plans enabled for reuse` : "not read"}{reuse && reuse.library.enabled === 0 ? ", so every autoplan is costed as written new (npm run -s db:seed-plans)" : ""}. Each year also has one email a day ($0.15). Hosting and fixed costs are under What one player costs. Allowances aren&apos;t enforced yet: the app doesn&apos;t call the AI from the server.</p>
        </>
      )}
    </section>
  );
}
