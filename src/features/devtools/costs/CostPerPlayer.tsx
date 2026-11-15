"use client";

import { useMemo, useState, type ReactNode } from "react";
import { PRICING } from "@/features/account/pricing";
import { SUBSCRIPTION_MODEL, type Billing, type Plan } from "@/features/account/plans";
import type { DevModel } from "../model/models";
import { atScale, playerYear, type Assumptions, type PlanTokens } from "../model/unitEconomics";
import type { ReuseInfo } from "./PlanCosts";

/**
 * "What one player costs": one paying account's year on every plan of the `plans` table, on one AI model, in one chart.
 * x is the share of each plan's allowance used, so a plan of 8 autoplans and one of 300 sit side by side; y is what's
 * left of the price a year, or the margin. One line per plan. Each plan is a tab with its own sliders (started from its
 * row) and a solo button: with any plan soloed, only soloed plans are drawn. Then the year at N accounts, and a table.
 * Numbers from `model/unitEconomics.ts`. Line colours: the dataviz reference palette's dark steps, in fixed order.
 */

/** One colour per model, fixed: the order models are listed in. */
const COLOUR: Partial<Record<DevModel, string>> = {
  "claude-haiku-5-5": "#3987e5",
  "claude-sonnet-5-5": "#d95926",
  "claude-opus-5-5": "#199e70",
  "claude-fable-5-2": "#c98500",
};
/** One colour per plan, by its place in `sort` order. */
const PLAN_COLOURS = ["#3987e5", "#d95926", "#199e70", "#c98500", "#a35fd6", "#d6457a"];
const planColour = (i: number) => PLAN_COLOURS[i % PLAN_COLOURS.length];

const usd = (x: number) => {
  const sign = x < 0 ? "−" : "";
  const a = Math.abs(x);
  if (a >= 10_000) return `${sign}$${Math.round(a / 1000)}k`;
  return `${sign}$${a < 10 ? a.toFixed(2) : Math.round(a).toLocaleString("en-US")}`;
};
const k = (n: number) => `${Math.round(n / 1000)}k`;

/** The x axis: share of a plan's allowance used, 0 to 150%, in steps of 2.5%. */
const USAGE_MAX = 1.5;
const USAGE_STEP = 0.025;
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
  /** US$ a month, paid monthly */
  month: number;
  /** US$ a year, paid yearly */
  year: number;
  /** autoplans a month */
  allowance: number;
  batch: boolean;
  reuse: number;
}

const paymentsOf = (b: Billing) => (b === "month" ? 12 : 1);
/** US$ a year, paid this way. */
const yearOf = (o: Pick<Offer, "month" | "year">, b: Billing) => (b === "month" ? o.month * 12 : o.year);

/** The plans as offers, in `sort` order; without a database, the one Student offer of `pricing.ts`. Reuse starts at the plan's internal chance, as on Plans. */
function offersFrom(plans: Plan[] | null, reuse: ReuseInfo | null): Offer[] {
  if (!plans || plans.length === 0) {
    return [{ id: "student", name: "Student (pricing.ts)", enabled: true, month: 9, year: PRICING.player.priceNumber, allowance: PRICING.player.plansPerMonth, batch: false, reuse: 0 }];
  }
  return [...plans].sort((a, b) => a.sort - b.sort).map((p) => {
    const pct = reuse?.newPlanPercent[p.id] ?? 100;
    return {
      id: p.id,
      name: p.name,
      enabled: p.enabled,
      month: p.monthCents / 100,
      year: p.yearCents / 100,
      allowance: p.autoplansPerMonth,
      batch: p.batch,
      // with no plan enabled for reuse there is nothing to take, so every autoplan is written
      reuse: reuse && reuse.library.enabled > 0 ? 1 - pct / 100 : 0,
    };
  });
}

interface Running { emailsPerDay: number; emailPer1000: number; hosting: number }
type Fee = { percent: number; fixed: number };
type YMode = "left" | "margin";

const assumptionsOf = (o: Offer, billing: Billing, usage: number, r: Running, fee: Fee): Assumptions => ({
  price: yearOf(o, billing),
  payments: paymentsOf(billing),
  plansPerMonth: o.allowance * usage,
  batch: o.batch,
  reuse: o.reuse,
  ...r,
  feePercent: fee.percent,
  feeFixed: fee.fixed,
});

const pct = (x: number) => `${Math.round(x * 100)}%`;

interface Line { o: Offer; colour: string; ys: number[] }

/** Every drawn plan's line over the share of its allowance used, with a crosshair readout. Click sets the allowance used. */
function PlansChart({ lines, mode, billing, usage, active, onPick }: { lines: Line[]; mode: YMode; billing: Billing; usage: number; /** the open tab, drawn thicker */ active: string; onPick: (usage: number) => void }) {
  const W = 640, H = 300, L = 56, R = 16, T = 16, B = 34;
  const xs = Array.from({ length: Math.round(USAGE_MAX / USAGE_STEP) + 1 }, (_, i) => i * USAGE_STEP);
  const all = lines.flatMap((l) => l.ys);
  const top = mode === "margin" ? 1 : Math.max(...lines.map((l) => yearOf(l.o, billing)), 1);
  const yMax = Math.max(top, ...all), yMin = Math.min(-top, ...all);
  const lo = Math.max(yMin, mode === "margin" ? -1 : -top);
  const fmt = mode === "margin" ? pct : usd;
  const x = (v: number) => L + (v / USAGE_MAX) * (W - L - R);
  const y = (v: number) => T + ((yMax - Math.max(lo, v)) / (yMax - lo)) * (H - T - B);
  const step = niceStep((yMax - lo) / 5);
  const ticks: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= yMax + 1e-9; v += step) ticks.push(v);
  const [hover, setHover] = useState<number | null>(null);
  const hx = hover ?? usage;
  const hi = Math.min(xs.length - 1, Math.round(hx / USAGE_STEP));

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full touch-none select-none"
        role="img"
        aria-label={`${mode === "margin" ? "Margin" : "What is left of the price a year"}, by share of the allowance used, for each plan`}
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const v = (((e.clientX - r.left) / r.width) * W - L) / (W - L - R) * USAGE_MAX;
          setHover(Math.min(USAGE_MAX, Math.max(0, Math.round(v / USAGE_STEP) * USAGE_STEP)));
        }}
        onPointerLeave={() => setHover(null)}
        onClick={() => hover !== null && onPick(hover)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke={Math.abs(t) < 1e-9 ? "#94a3b8" : "#1e293b"} strokeWidth={Math.abs(t) < 1e-9 ? 1.5 : 1} strokeDasharray={Math.abs(t) < 1e-9 ? undefined : "2 4"} />
            <text x={L - 8} y={y(t) + 4} textAnchor="end" className="fill-slate-500 text-[11px]">{fmt(t)}</text>
          </g>
        ))}
        <text x={W - R} y={y(0) - 6} textAnchor="end" className="fill-slate-400 text-[11px]">break-even</text>
        {[0, 0.25, 0.5, 0.75, 1, 1.25, 1.5].map((t) => <text key={t} x={x(t)} y={H - 14} textAnchor="middle" className="fill-slate-500 text-[11px]">{pct(t)}</text>)}
        <text x={(L + W - R) / 2} y={H - 1} textAnchor="middle" className="fill-slate-500 text-[11px]">share of the allowance used</text>
        <line x1={x(1)} x2={x(1)} y1={T} y2={H - B} stroke="#475569" strokeDasharray="4 4" />
        <text x={x(1) + 4} y={T + 10} className="fill-slate-500 text-[11px]">full allowance</text>
        {[...lines].sort((a, b) => Number(a.o.id === active) - Number(b.o.id === active)).map(({ o, colour, ys }) => {
          const { points, cut } = clipped(xs, ys, lo);
          const w = o.id === active ? 3 : 1.75;
          return (
            <g key={o.id}>
              <polyline fill="none" stroke={colour} strokeWidth={w} strokeLinejoin="round" points={points.map(([px, py]) => `${x(px)},${y(py)}`).join(" ")} />
              {cut !== null && <path d={`M${x(cut) - 5},${y(lo) - 6} L${x(cut)},${y(lo)} L${x(cut) + 5},${y(lo) - 6}`} fill="none" stroke={colour} strokeWidth={w} strokeLinecap="round" />}
            </g>
          );
        })}
        <line x1={x(hx)} x2={x(hx)} y1={T} y2={H - B} stroke="#e2e8f0" strokeOpacity={0.5} />
        {lines.map(({ o, colour, ys }) => ys[hi] >= lo && <circle key={o.id} cx={x(hx)} cy={y(ys[hi])} r={4.5} fill={colour} stroke="#0f172a" strokeWidth={2} />)}
      </svg>
      <div aria-live="polite" className="mt-2 flex flex-wrap items-baseline gap-x-5 gap-y-1 rounded-md bg-slate-900/60 px-3 py-2 text-xs">
        <span className="text-slate-400">At {pct(hx)} of the allowance{hover === null ? "" : " (click to set)"}:</span>
        {lines.map(({ o, colour, ys }) => (
          <span key={o.id} className="flex items-center gap-1.5">
            <span className="h-0.5 w-3 rounded" style={{ background: colour }} />
            <span className={`font-mono font-semibold tabular-nums ${ys[hi] < 0 ? "text-rose-300" : "text-slate-50"}`}>{fmt(ys[hi])}</span>
            <span className="text-slate-400">{o.name} ({Number((o.allowance * hx).toFixed(1))} autoplans)</span>
          </span>
        ))}
        {lines.length === 0 && <span className="text-slate-500">No plan drawn.</span>}
        {yMin < lo && <span className="text-slate-500">A line ending in an arrow goes on below {fmt(lo)}.</span>}
      </div>
    </div>
  );
}

function Toggle<T extends string>({ value, options, onChange, label }: { value: T; options: [T, string][]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="group" aria-label={label} className="inline-flex rounded-md border border-slate-700 p-0.5">
      {options.map(([v, text]) => (
        <button key={v} type="button" aria-pressed={value === v} onClick={() => onChange(v)} className={`rounded px-2 py-1 text-xs ${value === v ? "bg-slate-700 text-slate-50" : "text-slate-400 hover:text-slate-200"}`}>{text}</button>
      ))}
    </div>
  );
}

export default function CostPerPlayer({ models: given, plans, reuse, fee }: { models: PlanTokens[]; /** null: no database, so the Student offer of `pricing.ts` */ plans: Plan[] | null; reuse: ReuseInfo | null; fee: Fee }) {
  const models = useMemo(() => [...given].sort(byOrder), [given]);
  const originals = useMemo(() => offersFrom(plans, reuse), [plans, reuse]);
  const [offers, setOffers] = useState<Offer[]>(originals);
  const [running, setRunning] = useState<Running>({ emailsPerDay: 1, emailPer1000: 0.4, hosting: 0 });
  const [modelId, setModelId] = useState<DevModel | null>(models.find((m) => m.model === SUBSCRIPTION_MODEL)?.model ?? models[0]?.model ?? null);
  const [usage, setUsage] = useState(1);
  const [mode, setMode] = useState<YMode>("left");
  const [billing, setBilling] = useState<Billing>("year");
  const [tab, setTab] = useState(originals[0]?.id ?? "");
  const [solo, setSolo] = useState<Set<string>>(new Set());
  const [playersLog, setPlayersLog] = useState(3);
  const [fixedMonthly, setFixedMonthly] = useState(60);
  const [table, setTable] = useState(false);
  const setRun = <K extends keyof Running>(key: K) => (v: number) => setRunning((s) => ({ ...s, [key]: v }));
  const model = models.find((m) => m.model === modelId) ?? models[0];
  const colourById = new Map(offers.map((o, i) => [o.id, planColour(i)]));
  const drawn = offers.filter((o) => solo.size === 0 || solo.has(o.id));
  const lines: Line[] = model
    ? drawn.map((o) => ({
        o,
        colour: colourById.get(o.id)!,
        ys: Array.from({ length: Math.round(USAGE_MAX / USAGE_STEP) + 1 }, (_, i) => {
          const a = assumptionsOf(o, billing, i * USAGE_STEP, running, fee);
          const left = playerYear(model, a).left;
          return mode === "margin" ? (a.price > 0 ? left / a.price : 0) : left;
        }),
      }))
    : [];
  const i = Math.max(0, offers.findIndex((o) => o.id === tab));
  const offer = offers[i];
  const original = originals[i];
  const set = <K extends keyof Offer>(key: K) => (v: Offer[K]) => setOffers((all) => all.map((o) => (o.id === offer.id ? { ...o, [key]: v } : o)));
  const toggleSolo = (id: string) => setSolo((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const players = toPlayers(playersLog);
  const focusA = offer ? assumptionsOf(offer, billing, usage, running, fee) : null;
  const focusY = model && focusA ? playerYear(model, focusA) : null;
  const scale = focusY && focusA ? atScale(focusY, focusA.price, players, fixedMonthly) : null;
  const changed = offer && original && (["month", "year", "allowance", "batch", "reuse"] as const).some((key) => offer[key] !== original[key]);
  const select = "rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-100";

  return (
    <section id="cost" className="scroll-mt-4 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
      <h2 className="text-base font-semibold text-slate-100">What one player costs</h2>
      <p className="mb-4 max-w-3xl text-xs text-slate-400">
        One paying account&apos;s year on every plan, with attunr&apos;s AI writing every autoplan, on the model you pick. A plan&apos;s tokens are the median of the published runs on Compare AI models (every input token, cached or not), at API list prices. Each plan is a tab, started from its row in the database; nothing is saved. S solos a plan on the chart. Click the chart to set the allowance used.
      </p>

      {models.length === 0 || !model || !offer ? (
        <p className="text-sm text-slate-400">No published runs with token counts yet. Run npm run compare-models, then npm run -s publish-model-plans.</p>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
            <div className="flex flex-col gap-3">
              <Group title="Chart">
                <label className="flex flex-col gap-1 text-sm text-slate-300">
                  Model
                  <select value={model.model} onChange={(e) => setModelId(e.target.value as DevModel)} className={select}>
                    {models.map((m) => <option key={m.model} value={m.model}>{m.label}{m.model === SUBSCRIPTION_MODEL ? " (every plan's model)" : ""}</option>)}
                  </select>
                </label>
                <Slider label="Allowance used" value={usage} shown={pct(usage)} min={0} max={USAGE_MAX} step={USAGE_STEP} onChange={setUsage} hint="100% is every autoplan of the allowance, every month." />
                <span className="flex flex-col gap-1 text-sm text-slate-300">
                  Paid
                  <Toggle label="Paid" value={billing} onChange={setBilling} options={[["month", "Monthly"], ["year", "Yearly"]]} />
                </span>
                <span className="flex flex-col gap-1 text-sm text-slate-300">
                  Show
                  <Toggle label="Show" value={mode} onChange={setMode} options={[["left", "Left a year"], ["margin", "Margin"]]} />
                </span>
              </Group>
              <Group title="Running costs, every plan">
                <Slider label="Emails a day" value={running.emailsPerDay} shown={String(running.emailsPerDay)} min={0} max={3} step={1} onChange={setRun("emailsPerDay")} />
                <Slider label="Email cost per 1,000" value={running.emailPer1000} shown={`$${running.emailPer1000.toFixed(2)}`} min={0} max={2} step={0.05} onChange={setRun("emailPer1000")} hint="Resend Pro is about $0.40. Check their page." />
                <Slider label="Hosting an account a year" value={running.hosting} shown={usd(running.hosting)} min={0} max={5} step={0.25} onChange={setRun("hosting")} />
              </Group>
            </div>

            <div className="flex min-w-0 flex-col gap-3">
              <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                <PlansChart lines={lines} mode={mode} billing={billing} usage={usage} active={offer.id} onPick={setUsage} />
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-950/40">
                <div role="tablist" aria-label="Plans" className="flex flex-wrap gap-1 border-b border-slate-800 p-1.5">
                  {offers.map((o) => {
                    const on = o.id === offer.id;
                    const soloed = solo.has(o.id);
                    const hidden = solo.size > 0 && !soloed;
                    return (
                      <div key={o.id} className={`flex items-center rounded-md ${on ? "bg-slate-800" : "hover:bg-slate-900"}`}>
                        <button type="button" role="tab" aria-selected={on} onClick={() => setTab(o.id)} className={`flex items-center gap-2 px-2.5 py-1.5 text-sm ${on ? "text-slate-50" : hidden ? "text-slate-500" : "text-slate-300"}`}>
                          <span className="h-0.5 w-3 rounded" style={{ background: colourById.get(o.id), opacity: hidden ? 0.3 : 1 }} />
                          {o.name}
                          {!o.enabled && <span className="rounded bg-slate-700/50 px-1 text-[10px] text-slate-400">off</span>}
                        </button>
                        <button type="button" aria-pressed={soloed} aria-label={`Solo ${o.name}`} title={`Solo ${o.name}`} onClick={() => toggleSolo(o.id)} className={`mr-1 h-6 w-6 rounded text-[11px] font-bold ${soloed ? "bg-amber-400 text-slate-950" : "border border-slate-700 text-slate-400 hover:text-slate-100"}`}>S</button>
                      </div>
                    );
                  })}
                  {solo.size > 0 && <button type="button" onClick={() => setSolo(new Set())} className="ml-auto px-2 text-xs text-sky-300 hover:underline">Show all</button>}
                </div>

                <div role="tabpanel" className="p-3">
                  <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs text-slate-500">
                    <span>In the database: {usd(original.month)} a month or {usd(original.year)} a year, {original.allowance} autoplans a month{original.batch ? ", Batch" : ""}, {pct(original.reuse)} reused</span>
                    {changed && <button type="button" onClick={() => setOffers((all) => all.map((o) => (o.id === original.id ? original : o)))} className="text-sky-300 hover:underline">Reset</button>}
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    <Slider label="Price a month" value={offer.month} shown={usd(offer.month)} min={1} max={Math.max(150, Math.ceil(original.month * 2))} step={1} onChange={set("month")} hint={`${usd(offer.month * 12)} a year paid monthly.`} />
                    <Slider label="Price a year" value={offer.year} shown={usd(offer.year)} min={1} max={Math.max(100, Math.ceil(original.year * 2))} step={1} onChange={set("year")} hint={offer.month > 0 ? `${Math.round((1 - offer.year / (offer.month * 12)) * 100)}% less than monthly.` : undefined} />
                    <Slider label="Allowance, autoplans a month" value={offer.allowance} shown={String(offer.allowance)} min={1} max={Math.max(24, original.allowance * 2)} step={1} onChange={set("allowance")} hint={`At ${pct(usage)}: ${Number((offer.allowance * usage).toFixed(1))} autoplans a month.`} />
                    <Slider label="Plans reused" value={offer.reuse} shown={pct(offer.reuse)} min={0} max={1} step={0.05} onChange={set("reuse")} hint="Autoplans taken from the library: no AI but the decide call." />
                    <label className="flex items-center gap-2 self-start pt-6 text-sm text-slate-300">
                      <input type="checkbox" checked={offer.batch} onChange={(e) => set("batch")(e.target.checked)} className="accent-sky-400" />
                      Batch API: half price, minutes later
                    </label>
                  </div>
                  {focusY && (
                    <p className="mt-3 text-xs text-slate-400">
                      On {model.label} at {pct(usage)}, paid {billing === "month" ? "monthly" : "yearly"}: costs {usd(focusY.total)} a year (AI {usd(focusY.ai)}, payment {usd(focusY.fee)}), {usd(focusY.left)} left, margin {pct(focusA!.price > 0 ? focusY.left / focusA!.price : 0)}. Breaks even at {Number.isFinite(focusY.breakEvenPlansPerMonth) ? `${pct(focusY.breakEvenPlansPerMonth / offer.allowance)} of the allowance` : "any use"}.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {scale && (
            <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
              <h3 className="text-sm font-semibold text-slate-200">A year at {players.toLocaleString("en-US")} accounts on {offer.name}, {model.label}, {pct(usage)} of the allowance</h3>
              <p className="mt-1 text-xs text-slate-500">Pick another plan with the tabs above.</p>
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
              {table ? "Hide the table" : "Show as a table: every plan on every model"}
            </button>
            {table && (
              <div className="mt-2 overflow-x-auto">
                <table className="min-w-[56rem] w-full text-right text-sm tabular-nums [&_td]:px-3 [&_td]:py-1.5 [&_th]:px-3 [&_th]:py-2 [&_th]:align-bottom [&_th]:whitespace-nowrap [&_td:first-child]:pl-0 [&_th:first-child]:pl-0 [&_td:last-child]:pr-0 [&_th:last-child]:pr-0">
                  <thead className="text-xs text-slate-400">
                    <tr className="border-b border-slate-800">
                      <th className="text-left font-medium">Plan</th>
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
                      const a = assumptionsOf(o, billing, usage, running, fee);
                      return models.map((m, j) => {
                        const y = playerYear(m, a);
                        return (
                          <tr key={`${o.id}-${m.model}`} className={`text-slate-200 ${j === models.length - 1 ? "border-b border-slate-700" : "border-b border-slate-800/40"}`}>
                            <td className="text-left">{j === 0 ? o.name : ""}</td>
                            <td className="text-left">{m.label} <span className="text-xs text-slate-500">({m.runs} runs)</span></td>
                            <td className="font-mono text-xs text-slate-400">{k(m.input)} in, {k(m.output)} out</td>
                            <td>{usd(y.perPlan)}</td>
                            <td>{usd(y.ai)}</td>
                            <td>{usd(y.email)}</td>
                            <td>{usd(y.fee)}</td>
                            <td>{usd(y.hosting)}</td>
                            <td className="font-semibold">{usd(y.total)}</td>
                            <td className={y.left < 0 ? "font-semibold text-rose-300" : "font-semibold text-emerald-300"}>{usd(y.left)}</td>
                            <td className="text-xs text-slate-400">{Number.isFinite(y.breakEvenPlansPerMonth) ? pct(y.breakEvenPlansPerMonth / o.allowance) : "never"}</td>
                          </tr>
                        );
                      });
                    })}
                  </tbody>
                </table>
                <p className="mt-2 text-xs text-slate-500">At {pct(usage)} of each allowance, paid {billing === "month" ? "monthly" : "yearly"}. Break-even is the share of the allowance at which the year costs the price. Haiku 5.5 is billed at its higher rate when the prompt is over 100k tokens.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
