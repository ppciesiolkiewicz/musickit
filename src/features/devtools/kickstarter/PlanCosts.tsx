"use client";

import { useState } from "react";
import { SUBSCRIPTION_MODEL, allowanceLabel, modelLabel, priceLabel, studentsLabel, type Plan } from "@/features/account/plans";
import { PAYMENT_PROVIDERS, planYear, type PlanTokens } from "../model/unitEconomics";

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

export default function PlanCosts({ plans, tokens }: { /** null: no database, so no plans table */ plans: Plan[] | null; tokens: PlanTokens[] }) {
  const [usage, setUsage] = useState(1);
  const [provider, setProvider] = useState<keyof typeof PAYMENT_PROVIDERS>("stripe");
  const fee = PAYMENT_PROVIDERS[provider];

  return (
    <section id="plans" className="scroll-mt-4 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
      <h2 className="text-base font-semibold text-slate-100">Plans</h2>
      <p className="mb-4 max-w-3xl text-xs text-slate-400">
        The plans in the database, what a year on each costs us and what is left. Every plan uses one model, {modelLabel(SUBSCRIPTION_MODEL)} (<code className="text-slate-300">SUBSCRIPTION_MODEL</code>), and an autoplan is costed on it from the median tokens of the published runs; AI notes spend the same allowance and are costed as autoplans. Change a plan in the <code className="text-slate-300">plans</code> table. Only enabled plans can be chosen on /account.
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
            <label className="flex flex-col gap-1 text-sm text-slate-300">
              Payment
              <select value={provider} onChange={(e) => setProvider(e.target.value as keyof typeof PAYMENT_PROVIDERS)} className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100">
                {Object.entries(PAYMENT_PROVIDERS).map(([id, v]) => <option key={id} value={id}>{v.label}</option>)}
              </select>
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
                  <th className="font-medium">An autoplan</th>
                  <th className="font-medium">AI a year</th>
                  <th className="font-medium">Payment</th>
                  <th className="font-medium">Left a year</th>
                  <th className="font-medium">Margin</th>
                </tr>
              </thead>
              <tbody>
                {[...plans].sort((a, b) => a.sort - b.sort).map((p) => {
                  const y = planYear(p, SUBSCRIPTION_MODEL, tokens, usage, fee);
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
          <p className="mt-2 text-xs text-slate-500">Each year also has one email a day ($0.15). Hosting and fixed costs are under What one player costs. Allowances aren&apos;t enforced yet: the app doesn&apos;t call the AI from the server.</p>
        </>
      )}
    </section>
  );
}
