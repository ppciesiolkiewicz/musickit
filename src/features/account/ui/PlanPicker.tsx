"use client";

import { useEffect, useState } from "react";
import { can, type Account } from "../model";
import { allowanceLabel, priceLabel, roleOnPlan, studentsLabel, type Plan } from "../plans";
import { ErrorLine, SECONDARY, errorOf, send } from "./parts";

export type Loaded = { plans: Plan[]; current: string | null };

/** What a plan gives, under its name and price: here and on /account/setup. */
export function PlanLines({ plan }: { plan: Plan }) {
  const students = studentsLabel(plan);
  return (
    <ul className="text-xs text-slate-400">
      {students && <li>{students}</li>}
      <li>{allowanceLabel(plan)}</li>
      {plan.role === "teacher" && <li>Share plans with your students</li>}
      {!plan.enabled && <li>No longer offered. You keep it until you choose another plan.</li>}
    </ul>
  );
}

/**
 * The Plan part of /account: the plans the person can choose and the one they are on. Choosing one moves them at once,
 * with no payment during the beta, and reloads the page, since a Teacher plan changes the role every page reads.
 * Leaving a Teacher plan for Student asks first: it takes away Share plan.
 */
export default function PlanPicker({ account }: { account: Account }) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [asking, setAsking] = useState<Plan | null>(null);

  useEffect(() => {
    let live = true;
    void send("/api/account/plan", "GET").then((r) => {
      if (!live) return;
      if (r.ok) setLoaded(r.body as unknown as Loaded);
      else setError(errorOf(r));
    });
    return () => void (live = false);
  }, []);

  const choose = async (plan: Plan) => {
    setBusy(true);
    const r = await send("/api/account/plan", "POST", { planId: plan.id });
    if (r.ok) return window.location.reload();
    setBusy(false);
    setAsking(null);
    setError(errorOf(r));
  };

  const losesSharing = (plan: Plan) => can(account, "sharePlan") && !can({ ...account, role: roleOnPlan(account.role, plan) }, "sharePlan");

  return (
    <section aria-labelledby="plan-heading" className="flex flex-col gap-2">
      <h2 id="plan-heading" className="text-sm font-semibold text-slate-200">Plan</h2>
      <p className="text-xs text-slate-500">Free while in beta: choosing a plan doesn&apos;t ask for payment.</p>
      {!loaded && !error && <p className="text-sm text-slate-500">Loading plans…</p>}
      {loaded && (
        <ul className="flex flex-col gap-2">
          {loaded.plans.map((p) => {
            const on = p.id === loaded.current;
            return (
              <li key={p.id} className={`flex flex-col gap-1 rounded-xl border p-3 ${on ? "border-sky-400/60 bg-sky-400/5" : "border-slate-800 bg-slate-950/40"}`}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-sm font-semibold text-slate-100">{p.name}</span>
                  <span className="text-sm text-slate-300">{priceLabel(p)}</span>
                </div>
                <PlanLines plan={p} />
                {on ? (
                  <p className="mt-1 text-xs font-medium text-sky-300">Your plan</p>
                ) : asking?.id === p.id ? (
                  <div className="mt-1 flex flex-col gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-2">
                    <p className="text-xs text-amber-100">Move to {p.name}? You won&apos;t be able to share plans with your students.</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" disabled={busy} className={SECONDARY} onClick={() => setAsking(null)}>Keep my plan</button>
                      <button type="button" disabled={busy} className={SECONDARY} onClick={() => void choose(p)}>Move to {p.name}</button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={busy}
                    className={`${SECONDARY} mt-1 py-2!`}
                    onClick={() => (losesSharing(p) ? setAsking(p) : void choose(p))}
                  >
                    Choose {p.name}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <ErrorLine>{error}</ErrorLine>
    </section>
  );
}
