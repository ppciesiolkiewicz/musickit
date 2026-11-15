"use client";

import { useMemo, useState, type ReactNode } from "react";
import { SUBSCRIPTION_MODEL, modelLabel, type Plan } from "@/features/account/plans";
import { lifetimeValue, project, startShares, type GrowthInputs, type GrowthMonth, type GrowthPlan } from "../model/growth";
import { playerYear, type PlanTokens } from "../model/unitEconomics";
import { reusedShare, type ReuseInfo } from "./PlanCosts";

/**
 * "Over time": what the business is worth month by month, from `model/growth.ts`. Trials start and grow, a share pays,
 * monthly payers leave at the churn and yearly payers renew or not, each plan's account costing us its AI (on
 * `SUBSCRIPTION_MODEL`, at a share of its allowance and its reuse), emails and hosting. A chart of money a month, profit
 * to date or accounts, the numbers at the end, a value at a multiple of yearly revenue, and each plan's lifetime value.
 */

const SERIES = { cash: "#3987e5", costs: "#d95926", mrr: "#199e70", cumulative: "#c98500", monthly: "#3987e5", yearly: "#199e70" };

const usd = (x: number) => {
  const sign = x < 0 ? "−" : "";
  const a = Math.abs(x);
  if (a >= 1e6) return `${sign}$${(a / 1e6).toFixed(a >= 1e7 ? 0 : 1)}M`;
  if (a >= 10_000) return `${sign}$${Math.round(a / 1000)}k`;
  return `${sign}$${Math.round(a).toLocaleString("en-US")}`;
};
const count = (x: number) => (x >= 10_000 ? `${Math.round(x / 1000)}k` : Math.round(x).toLocaleString("en-US"));
const pct = (x: number) => `${Math.round(x * 100)}%`;

function Slider({ label, value, shown, min, max, step, onChange, hint }: { label: string; value: number; shown: string; min: number; max: number; step: number; onChange: (n: number) => void; hint?: string }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="flex items-baseline justify-between gap-2 text-sm text-slate-300">
        {label}
        <span className="font-mono text-sm font-semibold tabular-nums text-slate-50">{shown}</span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-sky-400" />
      {hint && <span className="text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-4 rounded-lg border border-slate-800 bg-slate-950/40 p-3">
      <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</legend>
      {children}
    </fieldset>
  );
}

function niceStep(raw: number): number {
  const p = 10 ** Math.floor(Math.log10(Math.max(raw, 1e-9)));
  const n = raw / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}

type View = "money" | "cumulative" | "accounts";
const VIEWS: [View, string][] = [["money", "Money a month"], ["cumulative", "Profit to date"], ["accounts", "Accounts"]];

const seriesOf = (view: View): { key: keyof GrowthMonth; label: string; colour: string; fmt: (x: number) => string }[] =>
  view === "money"
    ? [
        { key: "cashIn", label: "Payments taken", colour: SERIES.cash, fmt: usd },
        { key: "mrr", label: "Monthly recurring revenue", colour: SERIES.mrr, fmt: usd },
        { key: "costs", label: "Costs", colour: SERIES.costs, fmt: usd },
      ]
    : view === "cumulative"
      ? [{ key: "cumulative", label: "Profit to date", colour: SERIES.cumulative, fmt: usd }]
      : [
          { key: "monthly", label: "Paying monthly", colour: SERIES.monthly, fmt: count },
          { key: "yearly", label: "Paying yearly", colour: SERIES.yearly, fmt: count },
        ];

function GrowthChart({ months, view }: { months: GrowthMonth[]; view: View }) {
  const W = 640, H = 280, L = 56, R = 16, T = 16, B = 34;
  const series = seriesOf(view);
  const values = series.flatMap((s) => months.map((m) => m[s.key] as number));
  const yMax = Math.max(0, ...values), yMin = Math.min(0, ...values);
  const span = yMax - yMin || 1;
  const n = months.length;
  const x = (i: number) => L + (n > 1 ? i / (n - 1) : 0) * (W - L - R);
  const y = (v: number) => T + ((yMax - v) / span) * (H - T - B);
  const step = niceStep(span / 5);
  const ticks: number[] = [];
  for (let v = Math.ceil(yMin / step) * step; v <= yMax + 1e-9; v += step) ticks.push(v);
  const xStep = niceStep(n / 8);
  const [hover, setHover] = useState<number | null>(null);
  const hi = hover ?? n - 1;
  const fmt = series[0].fmt;

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full touch-none select-none"
        role="img"
        aria-label={`${VIEWS.find((v) => v[0] === view)?.[1]}, month by month`}
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const i = Math.round(((((e.clientX - r.left) / r.width) * W - L) / (W - L - R)) * (n - 1));
          setHover(Math.min(n - 1, Math.max(0, i)));
        }}
        onPointerLeave={() => setHover(null)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke={Math.abs(t) < 1e-9 ? "#94a3b8" : "#1e293b"} strokeWidth={Math.abs(t) < 1e-9 ? 1.5 : 1} strokeDasharray={Math.abs(t) < 1e-9 ? undefined : "2 4"} />
            <text x={L - 8} y={y(t) + 4} textAnchor="end" className="fill-slate-500 text-[11px]">{fmt(t)}</text>
          </g>
        ))}
        {months.map((m, i) => (m.month === 1 || m.month % xStep === 0) && <text key={m.month} x={x(i)} y={H - 14} textAnchor="middle" className="fill-slate-500 text-[11px]">{m.month}</text>)}
        <text x={(L + W - R) / 2} y={H - 1} textAnchor="middle" className="fill-slate-500 text-[11px]">month</text>
        {series.map((s) => (
          <polyline key={s.key} fill="none" stroke={s.colour} strokeWidth={2} strokeLinejoin="round" points={months.map((m, i) => `${x(i)},${y(m[s.key] as number)}`).join(" ")} />
        ))}
        <line x1={x(hi)} x2={x(hi)} y1={T} y2={H - B} stroke="#e2e8f0" strokeOpacity={0.5} />
        {series.map((s) => <circle key={s.key} cx={x(hi)} cy={y(months[hi][s.key] as number)} r={4.5} fill={s.colour} stroke="#0f172a" strokeWidth={2} />)}
      </svg>
      <div aria-live="polite" className="mt-2 flex flex-wrap items-baseline gap-x-5 gap-y-1 rounded-md bg-slate-900/60 px-3 py-2 text-xs">
        <span className="text-slate-400">Month {months[hi].month}:</span>
        {series.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5">
            <span className="h-0.5 w-3 rounded" style={{ background: s.colour }} />
            <span className={`font-mono font-semibold tabular-nums ${(months[hi][s.key] as number) < 0 ? "text-rose-300" : "text-slate-50"}`}>{s.fmt(months[hi][s.key] as number)}</span>
            <span className="text-slate-400">{s.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export default function OverTime({ plans, tokens, reuse, fee }: { plans: Plan[] | null; tokens: PlanTokens[]; reuse: ReuseInfo | null; fee: { percent: number; fixed: number } }) {
  const sorted = useMemo(() => [...(plans ?? [])].filter((p) => p.enabled).sort((a, b) => a.sort - b.sort), [plans]);
  const model = tokens.find((t) => t.model === SUBSCRIPTION_MODEL) ?? null;
  const [shares, setShares] = useState<number[]>(() => startShares(sorted.length));
  const [g, setG] = useState<Omit<GrowthInputs, "fee">>({ months: 36, trialsStart: 100, growth: 0.08, conversion: 0.25, yearlyShare: 0.5, monthlyChurn: 0.06, yearlyRenewal: 0.6, fixedMonthly: 60 });
  const [usage, setUsage] = useState(0.6);
  const [multiple, setMultiple] = useState(4);
  const [view, setView] = useState<View>("money");
  const set = <K extends keyof typeof g>(key: K) => (v: number) => setG((s) => ({ ...s, [key]: v }));

  const growthPlans: GrowthPlan[] = sorted.map((p, i) => {
    const reused = reusedShare(reuse, p.id);
    const y = model
      ? playerYear(model, { price: 0, plansPerMonth: p.autoplansPerMonth * usage, batch: p.batch, reuse: reused, emailsPerDay: 1, emailPer1000: 0.4, feePercent: 0, feeFixed: 0, hosting: 0 })
      : null;
    return { id: p.id, month: p.monthCents / 100, year: p.yearCents / 100, trialDays: p.trialDays, share: shares[i] ?? 0, costPerMonth: y ? (y.ai + y.email) / 12 : 0 };
  });
  const inputs: GrowthInputs = { ...g, fee };
  const months = project(growthPlans, inputs);
  const last = months[months.length - 1];
  const arr = last ? last.mrr * 12 : 0;
  const payback = months.find((m) => m.cumulative > 0 && months.slice(m.month - 1).every((n) => n.cumulative > 0));
  const shareTotal = shares.reduce((s, x) => s + x, 0) || 1;

  return (
    <section id="over-time" className="scroll-mt-4 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
      <h2 className="text-base font-semibold text-slate-100">Over time</h2>
      <p className="mb-4 max-w-3xl text-xs text-slate-400">
        What the business is worth month by month, from the enabled plans in the database with their monthly and yearly prices and free trial. Trials start and grow each month; a share pays, on a mix of plans, monthly or yearly. Monthly payers leave at the churn; yearly payers pay again or not at each year&apos;s end. Each account costs its AI on {modelLabel(SUBSCRIPTION_MODEL)} at the allowance used and its plan&apos;s reuse, plus a daily email; a trial that doesn&apos;t pay costs the same for its days. A projection from these sliders, not a forecast.
      </p>
      {!sorted.length ? (
        <p className="text-sm text-slate-400">No database, so no plans. Set DATABASE_URL and run npm run db:migrate.</p>
      ) : !last ? null : (
        <div className="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <div className="flex flex-col gap-3">
            <Group title="People">
              <Slider label="Trials in month 1" value={g.trialsStart} shown={count(g.trialsStart)} min={10} max={2000} step={10} onChange={set("trialsStart")} />
              <Slider label="Trials grow, a month" value={g.growth} shown={pct(g.growth)} min={0} max={0.3} step={0.01} onChange={set("growth")} />
              <Slider label="Trials that pay" value={g.conversion} shown={pct(g.conversion)} min={0.01} max={0.8} step={0.01} onChange={set("conversion")} />
              <Slider label="Payers who pay yearly" value={g.yearlyShare} shown={pct(g.yearlyShare)} min={0} max={1} step={0.05} onChange={set("yearlyShare")} />
              <Slider label="Monthly payers who leave, a month" value={g.monthlyChurn} shown={pct(g.monthlyChurn)} min={0} max={0.25} step={0.01} onChange={set("monthlyChurn")} />
              <Slider label="Yearly payers who renew" value={g.yearlyRenewal} shown={pct(g.yearlyRenewal)} min={0} max={1} step={0.05} onChange={set("yearlyRenewal")} />
            </Group>
            <Group title="Plan mix of new payers">
              {sorted.map((p, i) => (
                <Slider key={p.id} label={p.name} value={shares[i] ?? 0} shown={pct((shares[i] ?? 0) / shareTotal)} min={0} max={100} step={1} onChange={(v) => setShares((s) => s.map((x, j) => (j === i ? v : x)))} />
              ))}
            </Group>
            <Group title="Costs and value">
              <Slider label="Allowance used" value={usage} shown={pct(usage)} min={0} max={1} step={0.05} onChange={setUsage} />
              <Slider label="Fixed costs a month" value={g.fixedMonthly} shown={usd(g.fixedMonthly)} min={0} max={2000} step={10} onChange={set("fixedMonthly")} />
              <Slider label="Value, times yearly revenue" value={multiple} shown={`${multiple}×`} min={1} max={10} step={0.5} onChange={setMultiple} hint="What a buyer might pay for each dollar of recurring revenue a year. Small subscription businesses often sell at 2× to 6×." />
              <Slider label="Months" value={g.months} shown={String(g.months)} min={12} max={60} step={6} onChange={set("months")} />
            </Group>
          </div>

          <div className="flex min-w-0 flex-col gap-4">
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
              {[
                ["Paying accounts", count(last.monthly + last.yearly), false],
                ["Monthly revenue", usd(last.mrr), false],
                ["Yearly revenue", usd(arr), false],
                ["Value", usd(arr * multiple), true],
                ["Profit to date", usd(last.cumulative), last.cumulative < 0],
                ["In profit to date from", payback ? `month ${payback.month}` : "not yet", !payback],
              ].map(([label, v, flag]) => (
                <div key={label as string} className="rounded-lg border border-slate-800 bg-slate-950/40 p-2">
                  <dt className="text-xs text-slate-400">{label as string}</dt>
                  <dd className={`font-mono text-lg font-semibold tabular-nums ${label === "Value" ? "text-emerald-300" : flag ? "text-rose-300" : "text-slate-50"}`}>{v as string}</dd>
                </div>
              ))}
            </dl>
            <p className="-mt-2 text-xs text-slate-500">At the end of month {last.month}. Value is yearly revenue × {multiple}.</p>

            <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
              <div role="group" aria-label="Chart" className="mb-2 inline-flex rounded-md border border-slate-700 p-0.5">
                {VIEWS.map(([v, text]) => (
                  <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)} className={`rounded px-2 py-1 text-xs ${view === v ? "bg-slate-700 text-slate-50" : "text-slate-400 hover:text-slate-200"}`}>{text}</button>
                ))}
              </div>
              <GrowthChart months={months} view={view} />
            </div>

            <div className="overflow-x-auto">
              <h3 className="mb-1 text-sm font-semibold text-slate-200">What one paying account brings over its life</h3>
              <table className="w-full min-w-[36rem] text-right text-sm tabular-nums [&_td]:px-3 [&_td]:py-1.5 [&_th]:px-3 [&_th]:py-2 [&_th]:whitespace-nowrap [&_td:first-child]:pl-0 [&_th:first-child]:pl-0">
                <thead className="text-xs text-slate-400">
                  <tr className="border-b border-slate-800">
                    <th className="text-left font-medium">Plan</th>
                    <th className="font-medium">Costs us a month</th>
                    <th className="font-medium">Paying monthly</th>
                    <th className="font-medium">Paying yearly</th>
                  </tr>
                </thead>
                <tbody>
                  {growthPlans.map((p, i) => {
                    const v = lifetimeValue(p, inputs);
                    const cell = (x: number) => <td className={x < 0 ? "text-rose-300" : "text-slate-200"}>{Number.isFinite(x) ? usd(x) : "no end"}</td>;
                    return (
                      <tr key={p.id} className="border-b border-slate-800/60">
                        <td className="text-left text-slate-200">{sorted[i].name}</td>
                        <td className="text-slate-400">${p.costPerMonth.toFixed(2)}</td>
                        {cell(v.monthly)}
                        {cell(v.yearly)}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="mt-2 text-xs text-slate-500">After its AI, emails and payment fees, before fixed costs. Monthly: a month&apos;s margin over the share who leave each month. Yearly: a year&apos;s margin over the share who don&apos;t renew.{!model ? ` No published runs on ${modelLabel(SUBSCRIPTION_MODEL)}, so the AI is costed at nothing.` : ""}</p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
