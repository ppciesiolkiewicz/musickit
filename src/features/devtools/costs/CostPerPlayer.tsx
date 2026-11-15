"use client";

import { useMemo, useState, type ReactNode } from "react";
import { PRICING } from "@/features/account/pricing";
import { SUBSCRIPTION_MODEL, type Plan } from "@/features/account/plans";
import type { DevModel } from "../model/models";
import { atScale, playerYear, type Assumptions, type PlanTokens } from "../model/unitEconomics";
import type { ReuseInfo } from "./PlanCosts";

/**
 * "What one player costs": one paying account's year on every plan of the `plans` table and each AI model, to explore.
 * Shared running costs on top, then per plan its sliders (started from the row) beside a chart of what's left of the
 * price as autoplans a month grow, then the year at N accounts on one plan and model.
 * Numbers from `model/unitEconomics.ts`. Line colours: the dataviz reference palette's dark steps, in fixed order.
 */

/** One colour per model, fixed, so a model keeps its colour however many have runs. */
const COLOUR: Partial<Record<DevModel, string>> = {
  "claude-haiku-5-5": "#3987e5",
  "claude-sonnet-5-5": "#d95926",
  "claude-opus-5-5": "#199e70",
  "claude-fable-5-2": "#c98500",
};
const colourOf = (m: DevModel) => COLOUR[m] ?? "#94a3b8";

const usd = (x: number) => {
  const sign = x < 0 ? "−" : "";
  const a = Math.abs(x);
  if (a >= 10_000) return `${sign}$${Math.round(a / 1000)}k`;
  return `${sign}$${a < 10 ? a.toFixed(2) : Math.round(a).toLocaleString("en-US")}`;
};
const k = (n: number) => `${Math.round(n / 1000)}k`;

/** The chart's right end is never below this many autoplans a month. */
const PLANS_MIN = 12;
/** Players on a log slider, 10 to 10,000, rounded to two figures. */
const toPlayers = (v: number) => Number((10 ** v).toPrecision(2));

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

/** What's left of the price per player (y) as autoplans a month (x) grow, one line per model, with a crosshair readout. */
function MarginChart({ models, a, xMax, allowance, onPick }: { models: PlanTokens[]; a: Assumptions; /** right end of the x axis */ xMax: number; /** the plan's allowance, marked */ allowance: number; onPick: (plans: number) => void }) {
  const W = 640, H = 280, L = 52, R = 16, T = 16, B = 34;
  const dx = xStep(xMax);
  const xs = Array.from({ length: Math.round(xMax / dx) + 1 }, (_, i) => i * dx);
  const series = models.map((m) => ({ m, ys: xs.map((x) => playerYear(m, { ...a, plansPerMonth: x }).left) }));
  const all = series.flatMap((s) => s.ys);
  const yMax = Math.max(a.price, ...all), yMin = Math.min(-a.price, ...all);
  const lo = Math.max(yMin, -a.price * 3);
  const x = (v: number) => L + (v / xMax) * (W - L - R);
  const y = (v: number) => T + ((yMax - Math.max(lo, v)) / (yMax - lo)) * (H - T - B);
  const step = niceStep((yMax - lo) / 5);
  const ticks: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= yMax; v += step) ticks.push(v);
  const [hover, setHover] = useState<number | null>(null);
  const hx = hover ?? a.plansPerMonth;
  const hi = Math.min(xs.length - 1, Math.round(hx / dx));
  const xTick = niceStep(xMax / 6);
  const xTicks = Array.from({ length: Math.floor(xMax / xTick) + 1 }, (_, i) => i * xTick);

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full touch-none select-none"
        role="img"
        aria-label="What is left of the price a year, by autoplans a month, for each model"
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const v = (((e.clientX - r.left) / r.width) * W - L) / (W - L - R) * xMax;
          setHover(Math.min(xMax, Math.max(0, Math.round(v / dx) * dx)));
        }}
        onPointerLeave={() => setHover(null)}
        onClick={() => hover !== null && onPick(hover)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke={t === 0 ? "#94a3b8" : "#1e293b"} strokeWidth={t === 0 ? 1.5 : 1} strokeDasharray={t === 0 ? undefined : "2 4"} />
            <text x={L - 8} y={y(t) + 4} textAnchor="end" className="fill-slate-500 text-[11px]">{usd(t)}</text>
          </g>
        ))}
        <text x={W - R} y={y(0) - 6} textAnchor="end" className="fill-slate-400 text-[11px]">break-even</text>
        {xTicks.map((t) => <text key={t} x={x(t)} y={H - 14} textAnchor="middle" className="fill-slate-500 text-[11px]">{t}</text>)}
        <text x={(L + W - R) / 2} y={H - 1} textAnchor="middle" className="fill-slate-500 text-[11px]">autoplans a month</text>
        <line x1={x(allowance)} x2={x(allowance)} y1={T} y2={H - B} stroke="#475569" strokeDasharray="4 4" />
        <text x={x(allowance) + 4} y={T + 10} className="fill-slate-500 text-[11px]">allowance</text>
        {xMax <= 24 && (
          <>
            <line x1={x(4.33)} x2={x(4.33)} y1={T} y2={H - B} stroke="#334155" strokeDasharray="4 4" />
            <text x={x(4.33) + 4} y={T + 24} className="fill-slate-600 text-[11px]">weekly</text>
          </>
        )}
        {series.map(({ m, ys }) => {
          const { points, cut } = clipped(xs, ys, lo);
          return (
            <g key={m.model}>
              <polyline fill="none" stroke={colourOf(m.model)} strokeWidth={2} strokeLinejoin="round" points={points.map(([px, py]) => `${x(px)},${y(py)}`).join(" ")} />
              {cut !== null && <path d={`M${x(cut) - 5},${y(lo) - 6} L${x(cut)},${y(lo)} L${x(cut) + 5},${y(lo) - 6}`} fill="none" stroke={colourOf(m.model)} strokeWidth={2} strokeLinecap="round" />}
            </g>
          );
        })}
        <line x1={x(hx)} x2={x(hx)} y1={T} y2={H - B} stroke="#e2e8f0" strokeOpacity={0.5} />
        {series.map(({ m, ys }) => ys[hi] >= lo && <circle key={m.model} cx={x(hx)} cy={y(ys[hi])} r={4.5} fill={colourOf(m.model)} stroke="#0f172a" strokeWidth={2} />)}
      </svg>
      <div aria-live="polite" className="mt-2 flex flex-wrap items-baseline gap-x-5 gap-y-1 rounded-md bg-slate-900/60 px-3 py-2 text-xs">
        <span className="text-slate-400">At {Number(hx.toFixed(1))} autoplans a month{hover === null ? "" : " (click to set)"}:</span>
        {series.map(({ m, ys }) => (
          <span key={m.model} className="flex items-center gap-1.5">
            <span className="h-0.5 w-3 rounded" style={{ background: colourOf(m.model) }} />
            <span className={`font-mono font-semibold tabular-nums ${ys[hi] < 0 ? "text-rose-300" : "text-slate-50"}`}>{usd(ys[hi])}</span>
            <span className="text-slate-400">{m.label}</span>
          </span>
        ))}
        {yMin < lo && <span className="text-slate-500">A line ending in an arrow goes on below {usd(lo)}.</span>}
      </div>
    </div>
  );
}

/** A line's points down to the chart's floor, and the x where it went through it (null when it never does). */
function clipped(xs: number[], ys: number[], floor: number): { points: [number, number][]; cut: number | null } {
  const points: [number, number][] = [];
  for (let i = 0; i < xs.length; i++) {
    if (ys[i] >= floor) { points.push([xs[i], ys[i]]); continue; }
    if (i === 0) return { points, cut: xs[0] };
    const t = (ys[i - 1] - floor) / (ys[i - 1] - ys[i]);
    const cut = xs[i - 1] + t * (xs[i] - xs[i - 1]);
    points.push([cut, floor]);
    return { points, cut };
  }
  return { points, cut: null };
}

function niceStep(raw: number): number {
  const p = 10 ** Math.floor(Math.log10(Math.max(raw, 1e-9)));
  const n = raw / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}

/** Cheapest model first: the order of COLOUR, then any other. */
const ORDER = Object.keys(COLOUR);
const byOrder = (a: PlanTokens, b: PlanTokens) => (ORDER.indexOf(a.model) + 1 || 99) - (ORDER.indexOf(b.model) + 1 || 99);

/** One plan as this section explores it: the database row's numbers, changed by the sliders. */
interface Offer {
  id: string;
  name: string;
  enabled: boolean;
  period: "month" | "year";
  /** US$ a period */
  amount: number;
  /** the plan's allowance in the database, marked on the chart */
  allowance: number;
  plansPerMonth: number;
  batch: boolean;
  reuse: number;
}

const paymentsOf = (o: Pick<Offer, "period">) => (o.period === "month" ? 12 : 1);

/** The plans as offers, in `sort` order; without a database, the one Student offer of `pricing.ts`. Reuse starts at the plan's internal chance, as on Plans. */
function offersFrom(plans: Plan[] | null, reuse: ReuseInfo | null): Offer[] {
  if (!plans || plans.length === 0) {
    return [{ id: "student", name: "Student (pricing.ts)", enabled: true, period: "year", amount: PRICING.player.priceNumber, allowance: PRICING.player.plansPerMonth, plansPerMonth: PRICING.player.plansPerMonth, batch: false, reuse: 0 }];
  }
  return [...plans].sort((a, b) => a.sort - b.sort).map((p) => {
    const pct = reuse?.newPlanPercent[p.id] ?? 100;
    return {
      id: p.id,
      name: p.name,
      enabled: p.enabled,
      period: p.period,
      amount: p.priceCents / 100,
      allowance: p.autoplansPerMonth,
      plansPerMonth: p.autoplansPerMonth,
      batch: p.batch,
      // with no plan enabled for reuse there is nothing to take, so every autoplan is written
      reuse: reuse && reuse.library.enabled > 0 ? 1 - pct / 100 : 0,
    };
  });
}

/** The chart's and the slider's right end: half as much again as the allowance, at least 12, rounded up to a tick. */
function xMaxOf(allowance: number): number {
  const raw = Math.max(PLANS_MIN, allowance * 1.5);
  const t = niceStep(raw / 6);
  return Math.ceil(raw / t) * t;
}

/** Points along the x axis: halves up to 24, then about 60 steps. */
const xStep = (xMax: number) => (xMax <= 24 ? 0.5 : niceStep(xMax / 60));

interface Running { emailsPerDay: number; emailPer1000: number; hosting: number }

const assumptionsOf = (o: Offer, r: Running, fee: Fee): Assumptions => ({
  price: o.amount * paymentsOf(o),
  payments: paymentsOf(o),
  plansPerMonth: o.plansPerMonth,
  batch: o.batch,
  reuse: o.reuse,
  ...r,
  feePercent: fee.percent,
  feeFixed: fee.fixed,
});

function PlanBlock({ offer, original, models, running, fee, onChange }: { offer: Offer; original: Offer; models: PlanTokens[]; running: Running; fee: Fee; onChange: (o: Offer) => void }) {
  const a = assumptionsOf(offer, running, fee);
  const xMax = xMaxOf(offer.allowance);
  const per = offer.period === "month" ? "a month" : "a year";
  const set = <K extends keyof Offer>(key: K) => (v: Offer[K]) => onChange({ ...offer, [key]: v });
  const changed = (["amount", "plansPerMonth", "batch", "reuse"] as const).some((key) => offer[key] !== original[key]);
  return (
    <article className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
      <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h3 className="text-sm font-semibold text-slate-100">{offer.name}</h3>
        {!offer.enabled && <span className="rounded bg-slate-700/50 px-1.5 py-0.5 text-[11px] text-slate-400">off</span>}
        <span className="text-xs text-slate-500">
          In the database: {usd(original.amount)} {per}, {original.allowance} autoplans a month{original.batch ? ", Batch" : ""}
          {original.period === "month" ? ` (${usd(original.amount * 12)} a year)` : ""}
        </span>
        {changed && (
          <button type="button" onClick={() => onChange(original)} className="text-xs text-sky-300 hover:underline">Reset</button>
        )}
      </div>
      <div className="grid gap-4 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <Slider label={`Price ${per}`} value={offer.amount} shown={usd(offer.amount)} min={1} max={Math.max(offer.period === "month" ? 150 : 100, Math.ceil(original.amount * 2))} step={1} onChange={set("amount")} hint={offer.period === "month" ? `${usd(a.price)} a year, twelve payments.` : undefined} />
          <Slider label="Autoplans a month" value={offer.plansPerMonth} shown={String(offer.plansPerMonth)} min={0} max={xMax} step={xStep(xMax)} onChange={set("plansPerMonth")} hint={`The allowance is ${offer.allowance}.${xMax <= 24 ? " A weekly plan is about 4.3." : ""}`} />
          <Slider label="Plans reused" value={offer.reuse} shown={`${Math.round(offer.reuse * 100)}%`} min={0} max={1} step={0.05} onChange={set("reuse")} hint="Autoplans taken from the library: no AI but the decide call." />
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" checked={offer.batch} onChange={(e) => set("batch")(e.target.checked)} className="accent-sky-400" />
            Batch API: half price, minutes later
          </label>
        </div>
        <MarginChart models={models} a={a} xMax={xMax} allowance={offer.allowance} onPick={set("plansPerMonth")} />
      </div>
    </article>
  );
}

type Fee = { percent: number; fixed: number };

export default function CostPerPlayer({ models: given, plans, reuse, fee }: { models: PlanTokens[]; /** null: no database, so the Student offer of `pricing.ts` */ plans: Plan[] | null; reuse: ReuseInfo | null; fee: Fee }) {
  const models = useMemo(() => [...given].sort(byOrder), [given]);
  const originals = useMemo(() => offersFrom(plans, reuse), [plans, reuse]);
  const [offers, setOffers] = useState<Offer[]>(originals);
  const [running, setRunning] = useState<Running>({ emailsPerDay: 1, emailPer1000: 0.4, hosting: 0 });
  const [playersLog, setPlayersLog] = useState(3);
  const [fixedMonthly, setFixedMonthly] = useState(60);
  const [focusPlan, setFocusPlan] = useState(originals[0]?.id ?? "");
  const [focusModel, setFocusModel] = useState<DevModel | null>(models.find((m) => m.model === SUBSCRIPTION_MODEL)?.model ?? models[0]?.model ?? null);
  const [table, setTable] = useState(false);
  const setRun = <K extends keyof Running>(key: K) => (v: number) => setRunning((s) => ({ ...s, [key]: v }));
  const players = toPlayers(playersLog);
  const offer = offers.find((o) => o.id === focusPlan) ?? offers[0];
  const model = models.find((m) => m.model === focusModel) ?? models[0];
  const focusA = offer ? assumptionsOf(offer, running, fee) : null;
  const focusY = model && focusA ? playerYear(model, focusA) : null;
  const scale = focusY && focusA ? atScale(focusY, focusA.price, players, fixedMonthly) : null;
  const select = "rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-100";

  return (
    <section id="cost" className="scroll-mt-4 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
      <h2 className="text-base font-semibold text-slate-100">What one player costs</h2>
      <p className="mb-4 max-w-3xl text-xs text-slate-400">
        One paying account&apos;s year on each plan and each AI model, with attunr&apos;s AI writing every autoplan. A plan&apos;s tokens are the median of the published runs on Compare AI models (every input token, cached or not), at API list prices. Each plan starts from its row in the database; move its sliders to try other numbers (nothing is saved). Click a chart to set the autoplans a month.
      </p>

      {models.length === 0 ? (
        <p className="text-sm text-slate-400">No published runs with token counts yet. Run npm run compare-models, then npm run -s publish-model-plans.</p>
      ) : (
        <div className="flex flex-col gap-4">
          <Group title="Running costs, every plan">
            <div className="grid gap-4 sm:grid-cols-3">
              <Slider label="Emails a day" value={running.emailsPerDay} shown={String(running.emailsPerDay)} min={0} max={3} step={1} onChange={setRun("emailsPerDay")} />
              <Slider label="Email cost per 1,000" value={running.emailPer1000} shown={`$${running.emailPer1000.toFixed(2)}`} min={0} max={2} step={0.05} onChange={setRun("emailPer1000")} hint="Resend Pro is about $0.40. Check their page." />
              <Slider label="Hosting an account a year" value={running.hosting} shown={usd(running.hosting)} min={0} max={5} step={0.25} onChange={setRun("hosting")} />
            </div>
          </Group>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
            {models.map((m) => <span key={m.model} className="flex items-center gap-1.5"><span className="h-0.5 w-3 rounded" style={{ background: colourOf(m.model) }} />{m.label}{m.model === SUBSCRIPTION_MODEL ? " (every plan's model)" : ""}</span>)}
          </div>

          {offers.map((o, i) => (
            <PlanBlock key={o.id} offer={o} original={originals[i]} models={models} running={running} fee={fee} onChange={(next) => setOffers((all) => all.map((x) => (x.id === next.id ? next : x)))} />
          ))}

          {offer && model && focusY && scale && (
            <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
              <h3 className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-200">
                A year at {players.toLocaleString("en-US")} accounts on
                <select aria-label="Plan" value={offer.id} onChange={(e) => setFocusPlan(e.target.value)} className={select}>
                  {offers.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
                with
                <select aria-label="Model" value={model.model} onChange={(e) => setFocusModel(e.target.value as DevModel)} className={select}>
                  {models.map((m) => <option key={m.model} value={m.model}>{m.label}</option>)}
                </select>
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                One account: {usd(focusY.left)} left a year; breaks even at {Number.isFinite(focusY.breakEvenPlansPerMonth) ? `${focusY.breakEvenPlansPerMonth.toFixed(1)} autoplans a month` : "any number of autoplans"}.
              </p>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <Slider label="Paying accounts" value={playersLog} shown={players.toLocaleString("en-US")} min={1} max={4} step={0.05} onChange={setPlayersLog} />
                <Slider label="Fixed costs a month" value={fixedMonthly} shown={usd(fixedMonthly)} min={0} max={500} step={5} onChange={setFixedMonthly} hint="Hosting plan, database, email plan: what doesn't grow with accounts." />
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  ["Revenue", scale.revenue, false],
                  ["Per-account costs", -scale.variable, false],
                  ["Fixed costs", -scale.fixed, false],
                  ["Profit", scale.profit, true],
                ].map(([label, v, strong]) => (
                  <div key={label as string}>
                    <dt className="text-xs text-slate-400">{label as string}</dt>
                    <dd className={`font-mono tabular-nums ${strong ? "text-xl font-semibold" : "text-base"} ${(v as number) < 0 ? "text-rose-300" : "text-slate-50"}`}>{usd(v as number)}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-3 text-xs text-slate-400">
                {scale.playersToCoverFixed === null
                  ? "Each account costs more than it pays, so more accounts only lose more."
                  : `${scale.playersToCoverFixed.toLocaleString("en-US")} accounts pay the fixed costs.`}
              </p>
            </div>
          )}

          <div>
            <button type="button" onClick={() => setTable((t) => !t)} aria-expanded={table} className="text-xs text-slate-400 underline decoration-slate-700 underline-offset-2 hover:text-slate-200">
              {table ? "Hide the table" : "Show as a table"}
            </button>
            {table && (
              <div className="mt-2 overflow-x-auto">
                <table className="w-full min-w-[48rem] text-right text-sm">
                  <thead className="text-xs text-slate-400">
                    <tr className="border-b border-slate-800">
                      <th className="py-2 text-left font-medium">Plan</th>
                      <th className="text-left font-medium">Model</th>
                      <th className="font-medium">Tokens a plan</th>
                      <th className="font-medium">A plan</th>
                      <th className="font-medium">AI a year</th>
                      <th className="font-medium">Emails</th>
                      <th className="font-medium">Payment</th>
                      <th className="font-medium">Hosting</th>
                      <th className="font-medium">Total</th>
                      <th className="font-medium">Left</th>
                      <th className="font-medium">Break-even</th>
                    </tr>
                  </thead>
                  <tbody>
                    {offers.flatMap((o) => {
                      const a = assumptionsOf(o, running, fee);
                      return models.map((m, j) => {
                        const y = playerYear(m, a);
                        return (
                          <tr key={`${o.id}-${m.model}`} className={`text-slate-200 ${j === models.length - 1 ? "border-b border-slate-700" : "border-b border-slate-800/40"}`}>
                            <td className="py-1.5 text-left">{j === 0 ? o.name : ""}</td>
                            <td className="text-left">{m.label} <span className="text-xs text-slate-500">({m.runs} runs)</span></td>
                            <td className="font-mono text-xs text-slate-400">{k(m.input)} in, {k(m.output)} out</td>
                            <td>{usd(y.perPlan)}</td>
                            <td>{usd(y.ai)}</td>
                            <td>{usd(y.email)}</td>
                            <td>{usd(y.fee)}</td>
                            <td>{usd(y.hosting)}</td>
                            <td className="font-semibold">{usd(y.total)}</td>
                            <td className={y.left < 0 ? "font-semibold text-rose-300" : "font-semibold text-emerald-300"}>{usd(y.left)}</td>
                            <td className="text-xs text-slate-400">{Number.isFinite(y.breakEvenPlansPerMonth) ? `${y.breakEvenPlansPerMonth.toFixed(1)} a month` : "never"}</td>
                          </tr>
                        );
                      });
                    })}
                  </tbody>
                </table>
                <p className="mt-2 text-xs text-slate-500">Haiku 5.5 is billed at its higher rate when the prompt is over 100k tokens.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
