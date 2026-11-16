"use client";

import { useEffect, useState } from "react";
import { HUE_TONES, type Hue } from "@/components/ui";
import { can, type Account } from "../model";
import { allowanceLabel, bestSavingLabel, priceCents, pricedWithYou, roleOnPlan, savingLabel, studentsLabel, dollars, type Billing, type Plan } from "../plans";
import { ErrorLine, PRIMARY, errorOf, send } from "./parts";

/** `GET /api/account/plan` (`AccountPlans` in server/auth.ts, which a client file can't import). */
export type Loaded = { plans: Plan[]; current: string | null; billing: Billing; request: { planId: string; at: string } | null };

/**
 * The open beta, said over the plans here and on /account/setup: the app is free while we fix bugs, so a plan is the one
 * a person would want once we charge. Nothing is charged, and there is no payment step.
 */
export const BETA_PLAN_LINE = "Free during the open beta, while we fix bugs. Choose the plan you'd want once we start charging. Nothing is charged now.";

/** What a plan gives, under its name and price: here and on /account/setup. */
export function PlanLines({ plan }: { plan: Plan }) {
  const students = studentsLabel(plan);
  return (
    <ul className="flex flex-col gap-0.5 text-xs leading-relaxed text-slate-400">
      {students && <li>{students}</li>}
      <li>{allowanceLabel(plan)}</li>
      {plan.role === "teacher" && <li>Share plans with your students</li>}
      {pricedWithYou(plan) && <li>We&apos;ll email you to set the price</li>}
      {!plan.enabled && <li>No longer offered. You keep it until you choose another plan.</li>}
    </ul>
  );
}

/**
 * Monthly or Yearly: how every price below is shown and paid. Yearly carries what it saves (`bestSavingLabel`) as a badge
 * that stays on while Monthly is chosen, so the cheaper way is seen before it is picked.
 */
export function BillingSwitch({ billing, plans, onChange }: { billing: Billing; plans: Plan[]; onChange: (b: Billing) => void }) {
  const saving = bestSavingLabel(plans);
  return (
    <div role="group" aria-label="Billing" className="inline-flex self-start rounded-xl border border-slate-700 bg-slate-950/60 p-1">
      {(["month", "year"] as const).map((b) => {
        const on = billing === b;
        return (
          <button
            key={b}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(b)}
            className={`no-chrome inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${on ? "bg-sky-400 text-slate-950 shadow-sm shadow-sky-500/30" : "text-slate-400 hover:bg-slate-800/70 hover:text-slate-100"}`}
          >
            {b === "month" ? "Monthly" : "Yearly"}
            {b === "year" && saving && (
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${on ? "bg-slate-950/20 text-slate-950" : "bg-emerald-500/20 text-emerald-300"}`}>{saving}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Each plan's colour, by its place in the list, so a plan looks the same here and on /account. Rose and red are left out:
 * on these screens they mean an error.
 */
const PLAN_HUES: Hue[] = ["sky", "amber", "violet", "emerald", "teal", "pink"];
export const planHue = (i: number): Hue => PLAN_HUES[i % PLAN_HUES.length];

/**
 * One plan to pick, as a radio card in its own colour: its name, its price paid this way under it, what it gives. The same
 * card in setup's row of plans and in /account's column.
 */
export function PlanOption({ plan, billing, checked, mine, hue = "sky", onPick }: { plan: Plan; billing: Billing; checked: boolean; /** "Your plan" note */ mine?: string | null; hue?: Hue; onPick: () => void }) {
  const custom = pricedWithYou(plan);
  const saving = billing === "year" && !custom ? savingLabel(plan) : null;
  const tone = HUE_TONES[hue];
  return (
    <label className={`relative flex h-full cursor-pointer gap-3 overflow-hidden rounded-xl border p-4 pt-5 transition ${checked ? tone.on : tone.off}`}>
      <span aria-hidden className={`absolute inset-x-0 top-0 h-1 ${tone.fill} ${checked ? "" : "opacity-70"}`} />
      <input type="radio" name="plan" value={plan.id} checked={checked} onChange={onPick} className={`mt-[3px] size-4 shrink-0 self-start accent-current ${tone.ink}`} />
      <span className="flex flex-1 flex-col gap-2">
        <span className="flex flex-col gap-0.5">
          <span className={`text-base font-semibold ${checked ? "text-slate-50" : tone.ink}`}>{plan.name}</span>
          {custom ? (
            <span className="py-1 text-sm font-semibold text-slate-50">Price set with you</span>
          ) : (
            <span className="flex flex-wrap items-baseline gap-x-1.5">
              <span className="text-lg font-semibold text-slate-50">{dollars(priceCents(plan, billing))}</span>
              <span className="text-xs text-slate-400">a {billing}</span>
            </span>
          )}
        </span>
        {saving && <span className="self-start rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-300">{saving}</span>}
        <PlanLines plan={plan} />
        {mine && <span className={`text-xs font-medium ${tone.ink}`}>{mine}</span>}
      </span>
    </label>
  );
}

/**
 * The Plan part of /account: the plan the person would want once we charge (the open beta charges nothing), and how
 * they'd pay. Picking a plan or the other billing shows Choose …, which moves them at once and reloads the page, since a
 * Teacher plan changes the role every page reads. Leaving a Teacher plan for Student says first that it takes away
 * sharing plans; a Teacher plan with fewer students says its limit. Both say the students keep the plans already shared:
 * an invite claimed is a copy in the student's own plans (`claimInvite`). On a plan priced with them (Teacher Unlimited)
 * it says when they asked and that we'll email them.
 */
export default function PlanPicker({ account }: { account: Account }) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [billing, setBilling] = useState<Billing | null>(null);

  useEffect(() => {
    let live = true;
    void send("/api/account/plan", "GET").then((r) => {
      if (!live) return;
      if (r.ok) setLoaded(r.body as unknown as Loaded);
      else setError(errorOf(r));
    });
    return () => void (live = false);
  }, []);

  const shownBilling = billing ?? loaded?.billing ?? "year";
  const chosenId = picked ?? loaded?.current ?? null;
  const chosen = loaded?.plans.find((p) => p.id === chosenId) ?? null;
  const changes = !!chosen && (chosen.id !== loaded?.current || shownBilling !== loaded?.billing);
  const losesSharing = !!chosen && can(account, "sharePlan") && !can({ ...account, role: roleOnPlan(account.role, chosen) }, "sharePlan");
  const samePlan = chosen?.id === loaded?.current;
  // a Teacher plan that takes fewer students than the one they're on (null: any number)
  const currentPlan = loaded?.plans.find((p) => p.id === loaded.current) ?? null;
  const cap = (p: Plan) => p.students ?? Infinity;
  const fewerStudents = !!chosen && !!currentPlan && !losesSharing && chosen.role === "teacher" && cap(chosen) < cap(currentPlan);
  const KEEP = "Students you've already shared plans with keep those plans.";
  // their request for the plan priced with them, while they are on it
  const request = currentPlan && pricedWithYou(currentPlan) && loaded?.request?.planId === currentPlan.id
    ? { name: currentPlan.name, on: new Date(loaded.request.at).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" }) }
    : null;

  const move = async () => {
    if (!chosen) return;
    setBusy(true);
    setError(null);
    const r = await send("/api/account/plan", "POST", { planId: chosen.id, billing: shownBilling });
    if (r.ok) return window.location.reload();
    setBusy(false);
    setError(errorOf(r));
  };

  return (
    <section aria-labelledby="plan-heading" className="flex flex-col gap-2">
      <h2 id="plan-heading" className="text-sm font-semibold text-slate-200">Plan</h2>
      <p className="text-xs text-slate-500">{BETA_PLAN_LINE}</p>
      {!loaded && !error && <p className="text-sm text-slate-500">Loading plans…</p>}
      {loaded && (
        <>
          <BillingSwitch billing={shownBilling} plans={loaded.plans} onChange={(b) => { setBilling(b); setError(null); }} />
          <div role="radiogroup" aria-labelledby="plan-heading" className="flex flex-col gap-2">
            {loaded.plans.map((p, i) => (
              <PlanOption
                key={p.id}
                plan={p}
                hue={planHue(i)}
                billing={shownBilling}
                checked={p.id === chosenId}
                mine={p.id === loaded.current ? `Your plan, ${loaded.billing === "month" ? "monthly" : "yearly"}` : null}
                onPick={() => { setPicked(p.id); setError(null); }}
              />
            ))}
          </div>
          {request && <p role="status" className="text-xs text-slate-400">You chose {request.name} on {request.on}. We&apos;ll email you at {account.email} to set the price.</p>}
          {changes && chosen && (
            <div className="flex flex-col gap-2">
              {losesSharing && <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-2 text-xs text-amber-100">On {chosen.name} you won&apos;t be able to share plans with your students. {KEEP}</p>}
              {fewerStudents && <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-2 text-xs text-amber-100">{chosen.name} takes up to {chosen.students} students. {KEEP}</p>}
              <button type="button" disabled={busy} className={PRIMARY} onClick={() => void move()}>
                {busy ? "Saving…" : samePlan ? `Choose ${shownBilling === "month" ? "monthly" : "yearly"}` : `Choose ${chosen.name}`}
              </button>
            </div>
          )}
        </>
      )}
      <ErrorLine>{error}</ErrorLine>
    </section>
  );
}
