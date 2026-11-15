"use client";

import { useEffect, useState } from "react";
import { can, type Account } from "../model";
import { allowanceLabel, priceCents, priceLabel, roleOnPlan, savingLabel, studentsLabel, trialLabel, dollars, type Billing, type Plan } from "../plans";
import { ErrorLine, PRIMARY, errorOf, send } from "./parts";

export type Loaded = { plans: Plan[]; current: string | null; billing: Billing };

/** What a plan gives, under its name and price: here and on /account/setup. */
export function PlanLines({ plan, trial: showTrial = true }: { plan: Plan; /** off for someone already on a plan: the trial is for a new account */ trial?: boolean }) {
  const students = studentsLabel(plan);
  const trial = showTrial ? trialLabel(plan) : null;
  return (
    <ul className="text-xs text-slate-400">
      {students && <li>{students}</li>}
      <li>{allowanceLabel(plan)}</li>
      {plan.role === "teacher" && <li>Share plans with your students</li>}
      {trial && <li>{trial}</li>}
      {!plan.enabled && <li>No longer offered. You keep it until you choose another plan.</li>}
    </ul>
  );
}

/** Monthly or Yearly: how every price below is shown and paid. */
export function BillingSwitch({ billing, onChange }: { billing: Billing; onChange: (b: Billing) => void }) {
  return (
    <div role="group" aria-label="Billing" className="inline-flex self-start rounded-lg border border-slate-700 p-0.5">
      {(["month", "year"] as const).map((b) => (
        <button
          key={b}
          type="button"
          aria-pressed={billing === b}
          onClick={() => onChange(b)}
          className={`rounded-md px-3 py-1.5 text-sm transition ${billing === b ? "bg-sky-400/15 font-semibold text-sky-200" : "text-slate-400 hover:text-slate-200"}`}
        >
          {b === "month" ? "Monthly" : "Yearly"}
        </button>
      ))}
    </div>
  );
}

/** One plan to pick, as a radio card: its name, its price paid this way, what it gives. */
export function PlanOption({ plan, billing, checked, mine, trial = true, onPick }: { plan: Plan; billing: Billing; checked: boolean; /** "Your plan" note */ mine?: string | null; trial?: boolean; onPick: () => void }) {
  const saving = billing === "year" ? savingLabel(plan) : null;
  return (
    <label className={`flex cursor-pointer gap-3 rounded-xl border p-3 transition ${checked ? "border-sky-400/60 bg-sky-400/5" : "border-slate-800 bg-slate-950/40 hover:border-slate-600"}`}>
      <input type="radio" name="plan" value={plan.id} checked={checked} onChange={onPick} className="mt-1 accent-sky-400" />
      <span className="flex flex-1 flex-col gap-1">
        <span className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-sm font-semibold text-slate-100">{plan.name}</span>
          <span className="text-sm text-slate-300">
            {priceLabel(plan, billing)}
            {saving && <span className="ml-2 rounded bg-emerald-500/15 px-1.5 py-0.5 text-[11px] text-emerald-300">{saving}</span>}
          </span>
        </span>
        <PlanLines plan={plan} trial={trial} />
        {mine && <span className="text-xs font-medium text-sky-300">{mine}</span>}
      </span>
    </label>
  );
}

/**
 * What the chosen plan costs and when, above where the card details will go. A placeholder: nothing is charged during
 * the beta, and there is no payment provider yet.
 */
export function PaymentBox({ plan, billing, trial }: { plan: Plan; billing: Billing; /** a new account's first plan starts with the free trial; a change doesn't */ trial: boolean }) {
  const price = priceLabel(plan, billing);
  const days = plan.trialDays === 1 ? "1 day" : `${plan.trialDays} days`;
  return (
    <section aria-labelledby="payment-heading" className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-950/40 p-3">
      <h3 id="payment-heading" className="text-sm font-semibold text-slate-200">Payment</h3>
      <p className="text-sm text-slate-300">
        {plan.name}, {price}.{" "}
        {trial && plan.trialDays > 0 ? `${days} free, then ${dollars(priceCents(plan, billing))} every ${billing}.` : `${dollars(priceCents(plan, billing))} every ${billing}.`}
      </p>
      <div className="flex min-h-24 items-center justify-center rounded-lg border border-dashed border-slate-700 px-3 py-4 text-center text-xs text-slate-500">
        Card details will go here. Free while in beta: nothing is charged.
      </div>
    </section>
  );
}

/**
 * The Plan part of /account: the plans the person can choose, the one they are on and how they pay. Picking a plan or the
 * other billing shows what it costs and the payment box; Move to … moves them at once, with no payment during the beta,
 * and reloads the page, since a Teacher plan changes the role every page reads. Leaving a Teacher plan for Student says
 * first that it takes away sharing plans.
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
      <p className="text-xs text-slate-500">Free while in beta: choosing a plan doesn&apos;t ask for payment.</p>
      {!loaded && !error && <p className="text-sm text-slate-500">Loading plans…</p>}
      {loaded && (
        <>
          <BillingSwitch billing={shownBilling} onChange={(b) => { setBilling(b); setError(null); }} />
          <div role="radiogroup" aria-labelledby="plan-heading" className="flex flex-col gap-2">
            {loaded.plans.map((p) => (
              <PlanOption
                key={p.id}
                plan={p}
                billing={shownBilling}
                checked={p.id === chosenId}
                mine={p.id === loaded.current ? `Your plan, paid ${loaded.billing === "month" ? "monthly" : "yearly"}` : null}
                trial={loaded.current === null}
                onPick={() => { setPicked(p.id); setError(null); }}
              />
            ))}
          </div>
          {changes && chosen && (
            <div className="flex flex-col gap-2">
              <PaymentBox plan={chosen} billing={shownBilling} trial={loaded?.current === null} />
              {losesSharing && <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-2 text-xs text-amber-100">On {chosen.name} you won&apos;t be able to share plans with your students.</p>}
              <button type="button" disabled={busy} className={PRIMARY} onClick={() => void move()}>
                {busy ? "Saving…" : samePlan ? `Pay ${shownBilling === "month" ? "monthly" : "yearly"}` : `Move to ${chosen.name}`}
              </button>
            </div>
          )}
        </>
      )}
      <ErrorLine>{error}</ErrorLine>
    </section>
  );
}
