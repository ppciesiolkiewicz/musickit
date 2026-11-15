"use client";

import { useMemo, useState, type ReactNode } from "react";
import { PRICING } from "@/features/account/pricing";
import type { DevModel } from "../model/models";
import { PAYMENT_PROVIDERS, atScale, playerYear, type Assumptions, type PlanTokens } from "../model/unitEconomics";

/**
 * "What one player costs": one paying player's year on each AI model against the price, to explore. Sliders on the left,
 * a card per model, a chart of what's left of the price as autoplans a month grow, then the year at N players.
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

const PLANS_MAX = 12;
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
function MarginChart({ models, a, onPick }: { models: PlanTokens[]; a: Assumptions; onPick: (plans: number) => void }) {
  const W = 640, H = 280, L = 52, R = 16, T = 16, B = 34;
  const xs = Array.from({ length: PLANS_MAX * 2 + 1 }, (_, i) => i / 2);
  const series = models.map((m) => ({ m, ys: xs.map((x) => playerYear(m, { ...a, plansPerMonth: x }).left) }));
  const all = series.flatMap((s) => s.ys);
  const yMax = Math.max(a.price, ...all), yMin = Math.min(-a.price, ...all);
  const lo = Math.max(yMin, -a.price * 3);
  const x = (v: number) => L + (v / PLANS_MAX) * (W - L - R);
  const y = (v: number) => T + ((yMax - Math.max(lo, v)) / (yMax - lo)) * (H - T - B);
  const step = niceStep((yMax - lo) / 5);
  const ticks: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= yMax; v += step) ticks.push(v);
  const [hover, setHover] = useState<number | null>(null);
  const hx = hover ?? a.plansPerMonth;
  const hi = Math.round(hx * 2);

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full touch-none select-none"
        role="img"
        aria-label="What is left of the price per player, by autoplans a month, for each model"
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const v = (((e.clientX - r.left) / r.width) * W - L) / (W - L - R) * PLANS_MAX;
          setHover(Math.min(PLANS_MAX, Math.max(0, Math.round(v * 2) / 2)));
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
        {[0, 2, 4, 6, 8, 10, 12].map((t) => <text key={t} x={x(t)} y={H - 14} textAnchor="middle" className="fill-slate-500 text-[11px]">{t}</text>)}
        <text x={(L + W - R) / 2} y={H - 1} textAnchor="middle" className="fill-slate-500 text-[11px]">autoplans a month</text>
        <line x1={x(PRICING.player.plansPerMonth)} x2={x(PRICING.player.plansPerMonth)} y1={T} y2={H - B} stroke="#475569" strokeDasharray="4 4" />
        <text x={x(PRICING.player.plansPerMonth) + 4} y={T + 10} className="fill-slate-500 text-[11px]">allowance</text>
        <line x1={x(4.33)} x2={x(4.33)} y1={T} y2={H - B} stroke="#334155" strokeDasharray="4 4" />
        <text x={x(4.33) + 4} y={T + 10} className="fill-slate-600 text-[11px]">weekly</text>
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
        <span className="text-slate-400">At {hx} autoplans a month{hover === null ? "" : " (click to set)"}:</span>
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

export default function CostPerPlayer({ models: given }: { models: PlanTokens[] }) {
  const models = useMemo(() => [...given].sort(byOrder), [given]);
  const [provider, setProvider] = useState<keyof typeof PAYMENT_PROVIDERS>("stripe");
  const [a, setA] = useState<Omit<Assumptions, "feePercent" | "feeFixed">>({
    price: PRICING.player.priceNumber,
    plansPerMonth: PRICING.player.plansPerMonth,
    aiShare: 1,
    batch: false,
    reuse: 0,
    emailsPerDay: 1,
    emailPer1000: 0.4,
    hosting: 0,
  });
  const [playersLog, setPlayersLog] = useState(3);
  const [fixedMonthly, setFixedMonthly] = useState(60);
  const [focus, setFocus] = useState<DevModel | null>(models[0]?.model ?? null);
  const [table, setTable] = useState(false);
  const set = <K extends keyof typeof a>(key: K) => (v: (typeof a)[K]) => setA((s) => ({ ...s, [key]: v }));
  const p = PAYMENT_PROVIDERS[provider];
  const full: Assumptions = useMemo(() => ({ ...a, feePercent: p.percent, feeFixed: p.fixed }), [a, p]);
  const years = models.map((m) => ({ m, y: playerYear(m, full) }));
  const players = toPlayers(playersLog);
  const focused = years.find((r) => r.m.model === focus) ?? years[0];
  const scale = focused ? atScale(focused.y, a.price, players, fixedMonthly) : null;

  return (
    <section id="cost" className="scroll-mt-4 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
      <h2 className="text-base font-semibold text-slate-100">What one player costs</h2>
      <p className="mb-4 max-w-3xl text-xs text-slate-400">
        One paying player&apos;s year on each AI model, if attunr writes their autoplans. A plan&apos;s tokens are the median of the published runs on Compare AI models (every input token, cached or not), at API list prices. Move the sliders; click the chart to set the autoplans a month.
      </p>

      {models.length === 0 ? (
        <p className="text-sm text-slate-400">No published runs with token counts yet. Run npm run compare-models, then npm run -s publish-model-plans.</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <div className="flex flex-col gap-3">
            <Group title="The offer">
              <Slider label="Price a year" value={a.price} shown={usd(a.price)} min={5} max={100} step={1} onChange={set("price")} hint={`Today's price: ${PRICING.player.price}.`} />
              <Slider label="Autoplans a month" value={a.plansPerMonth} shown={String(a.plansPerMonth)} min={0} max={PLANS_MAX} step={0.5} onChange={set("plansPerMonth")} hint={`A weekly plan is about 4.3. The allowance is ${PRICING.player.plansPerMonth}.`} />
              <Slider label="Players on attunr's AI" value={a.aiShare} shown={`${Math.round(a.aiShare * 100)}%`} min={0} max={1} step={0.05} onChange={set("aiShare")} hint="The rest paste the prompt into their own AI, for free." />
              <Slider label="Plans reused" value={a.reuse} shown={`${Math.round(a.reuse * 100)}%`} min={0} max={1} step={0.05} onChange={set("reuse")} hint="Autoplans served from the plans already written, for a player with the same answers: no AI." />
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input type="checkbox" checked={a.batch} onChange={(e) => set("batch")(e.target.checked)} className="accent-sky-400" />
                Batch API: half price, plan arrives minutes later
              </label>
            </Group>
            <Group title="Running costs">
              <Slider label="Emails a day" value={a.emailsPerDay} shown={String(a.emailsPerDay)} min={0} max={3} step={1} onChange={set("emailsPerDay")} />
              <Slider label="Email cost per 1,000" value={a.emailPer1000} shown={`$${a.emailPer1000.toFixed(2)}`} min={0} max={2} step={0.05} onChange={set("emailPer1000")} hint="Resend Pro is about $0.40. Check their page." />
              <Slider label="Hosting a player a year" value={a.hosting} shown={usd(a.hosting)} min={0} max={5} step={0.25} onChange={set("hosting")} />
              <label className="flex flex-col gap-1 text-sm text-slate-300">
                Payment
                <select value={provider} onChange={(e) => setProvider(e.target.value as keyof typeof PAYMENT_PROVIDERS)} className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100">
                  {Object.entries(PAYMENT_PROVIDERS).map(([id, v]) => <option key={id} value={id}>{v.label}</option>)}
                </select>
              </label>
            </Group>
          </div>

          <div className="flex min-w-0 flex-col gap-4">
            <ul className="grid grid-cols-2 gap-2 xl:grid-cols-4">
              {years.map(({ m, y }) => {
                const on = focused?.m.model === m.model;
                return (
                  <li key={m.model}>
                    <button
                      type="button"
                      aria-pressed={on}
                      onClick={() => setFocus(m.model)}
                      className={`flex h-full w-full flex-col gap-1 rounded-lg border bg-slate-950/50 p-3 text-left transition hover:border-slate-500 focus-visible:outline-2 focus-visible:outline-sky-400 ${on ? "border-slate-400" : "border-slate-800"}`}
                    >
                      <span className="flex items-center gap-2 text-sm text-slate-200">
                        <span className="h-0.5 w-4 rounded" style={{ background: colourOf(m.model) }} />
                        {m.label}
                      </span>
                      <span className={`font-mono text-xl font-semibold tabular-nums sm:text-2xl ${y.left < 0 ? "text-rose-300" : "text-slate-50"}`}>{usd(y.left)}</span>
                      <span className="text-xs text-slate-400">left of {usd(a.price)} a player a year</span>
                      <span className="mt-1 text-xs text-slate-500">{usd(y.perPlan)} a plan · costs {usd(y.total)} a year</span>
                      <span className="text-xs text-slate-500">Breaks even at {Number.isFinite(y.breakEvenPlansPerMonth) ? `${y.breakEvenPlansPerMonth.toFixed(1)} plans a month` : "any number of plans"}</span>
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
              <h3 className="text-sm font-semibold text-slate-200">Left of the price, by autoplans a month</h3>
              <div className="mt-1 mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                {models.map((m) => <span key={m.model} className="flex items-center gap-1.5"><span className="h-0.5 w-3 rounded" style={{ background: colourOf(m.model) }} />{m.label}</span>)}
              </div>
              <MarginChart models={models} a={full} onPick={set("plansPerMonth")} />
            </div>

            {focused && scale && (
              <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-sm font-semibold text-slate-200">A year at {players.toLocaleString("en-US")} players on {focused.m.label}</h3>
                  <span className="text-xs text-slate-500">Pick a model above to change it.</span>
                </div>
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <Slider label="Paying players" value={playersLog} shown={players.toLocaleString("en-US")} min={1} max={4} step={0.05} onChange={setPlayersLog} />
                  <Slider label="Fixed costs a month" value={fixedMonthly} shown={usd(fixedMonthly)} min={0} max={500} step={5} onChange={setFixedMonthly} hint="Hosting plan, database, email plan: what doesn't grow with players." />
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    ["Revenue", scale.revenue, false],
                    ["Per-player costs", -scale.variable, false],
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
                    ? "Each player costs more than they pay, so more players only lose more."
                    : `${scale.playersToCoverFixed.toLocaleString("en-US")} players pay the fixed costs.`}
                </p>
              </div>
            )}

            <div>
              <button type="button" onClick={() => setTable((t) => !t)} aria-expanded={table} className="text-xs text-slate-400 underline decoration-slate-700 underline-offset-2 hover:text-slate-200">
                {table ? "Hide the table" : "Show as a table"}
              </button>
              {table && (
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full min-w-[40rem] text-right text-sm">
                    <thead className="text-xs text-slate-400">
                      <tr className="border-b border-slate-800">
                        <th className="py-2 text-left font-medium">Model</th>
                        <th className="font-medium">Tokens a plan</th>
                        <th className="font-medium">A plan</th>
                        <th className="font-medium">AI a year</th>
                        <th className="font-medium">Emails</th>
                        <th className="font-medium">Payment</th>
                        <th className="font-medium">Hosting</th>
                        <th className="font-medium">Total</th>
                        <th className="font-medium">Left</th>
                      </tr>
                    </thead>
                    <tbody>
                      {years.map(({ m, y }) => (
                        <tr key={m.model} className="border-b border-slate-800/60 text-slate-200">
                          <td className="py-2 text-left">{m.label} <span className="text-xs text-slate-500">({m.runs} runs)</span></td>
                          <td className="font-mono text-xs text-slate-400">{k(m.input)} in, {k(m.output)} out</td>
                          <td>{usd(y.perPlan)}</td>
                          <td>{usd(y.ai)}</td>
                          <td>{usd(y.email)}</td>
                          <td>{usd(y.fee)}</td>
                          <td>{usd(y.hosting)}</td>
                          <td className="font-semibold">{usd(y.total)}</td>
                          <td className={y.left < 0 ? "font-semibold text-rose-300" : "font-semibold text-emerald-300"}>{usd(y.left)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="mt-2 text-xs text-slate-500">Haiku 5.5 is billed at its higher rate when the prompt is over 100k tokens.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
