"use client";

import { useEffect, useState, type FormEvent } from "react";
import { emailName } from "../model";
import type { Billing } from "../plans";
import { useAccount } from "../useAccount";
import { BillingSwitch, PaymentBox, PlanOption, type Loaded } from "./PlanPicker";
import { Card, ErrorLine, FIELD, LABEL, PRIMARY, errorOf, send } from "./parts";

/**
 * /account/setup, where a new account stays until it has chosen a plan (`LoginGuard`): its name and its plan, saved in
 * one step, then on to `next`. A name that is only the email's stand-in (`emailName`) starts empty, to be typed; Google's
 * is filled in to keep or change. No plan is chosen for them; they pick it paid monthly or yearly, and the payment box
 * under it shows what it costs. Nothing is charged during the beta. The page reloads into `next`, since a Teacher plan
 * changes the role every page reads.
 */
export default function SetupForm({ next }: { next: string }) {
  const { account, loaded: accountLoaded } = useAccount();
  const [name, setName] = useState<string | null>(null);
  const [plans, setPlans] = useState<Loaded | null>(null);
  const [planId, setPlanId] = useState<string | null>(null);
  const [billing, setBilling] = useState<Billing | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    void send("/api/account/plan", "GET").then((r) => {
      if (!live) return;
      if (r.ok) setPlans(r.body as unknown as Loaded);
      else setError(errorOf(r));
    });
    return () => void (live = false);
  }, []);

  if (!accountLoaded || !account) return <Card><p className="text-sm text-slate-500">Loading…</p></Card>;

  const askName = account.name === emailName(account.email);
  const shown = name ?? (askName ? "" : account.name);
  const chosen = planId ?? plans?.current ?? null;
  const shownBilling = billing ?? plans?.billing ?? "year";
  const chosenPlan = plans?.plans.find((p) => p.id === chosen) ?? null;

  const save = async (e: FormEvent) => {
    e.preventDefault();
    const noName = !shown.trim();
    setNameError(noName ? "Type your name." : null);
    setError(chosen || !plans ? null : "Choose a plan.");
    if (noName || !chosen) return;
    setBusy(true);
    setError(null);
    const r = await send("/api/account/setup", "POST", { name: shown, planId: chosen, billing: shownBilling });
    if (r.ok) return window.location.assign(next);
    setBusy(false);
    if (r.body.field === "name") setNameError(errorOf(r));
    else setError(errorOf(r));
  };

  return (
    <Card>
      <form noValidate onSubmit={(e) => void save(e)} className="flex flex-col gap-4">
        <label>
          <span className={LABEL}>Your name</span>
          <input
            className={FIELD}
            value={shown}
            onChange={(e) => { setName(e.target.value); setNameError(null); }}
            placeholder={askName ? "First name, or what students call you" : undefined}
            autoComplete="name"
            autoFocus={askName}
            maxLength={80}
            aria-invalid={!!nameError}
          />
        </label>
        <ErrorLine>{nameError}</ErrorLine>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-semibold text-slate-200">Plan</legend>
          <p className="text-xs text-slate-500">Free while in beta: choosing a plan doesn&apos;t ask for payment. You can change it later on your account page.</p>
          {!plans && !error && <p className="text-sm text-slate-500">Loading plans…</p>}
          {plans && <BillingSwitch billing={shownBilling} onChange={(b) => { setBilling(b); setError(null); }} />}
          {plans?.plans.map((p) => (
            <PlanOption key={p.id} plan={p} billing={shownBilling} checked={p.id === chosen} trial={plans.current === null} onPick={() => { setPlanId(p.id); setError(null); }} />
          ))}
        </fieldset>

        {chosenPlan && <PaymentBox plan={chosenPlan} billing={shownBilling} trial={plans?.current === null} />}

        <ErrorLine>{error}</ErrorLine>
        <button type="submit" disabled={busy || !plans} className={PRIMARY}>{busy ? "Saving…" : "Continue"}</button>
      </form>
    </Card>
  );
}
