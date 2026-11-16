"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { emailName } from "../model";
import type { Billing } from "../plans";
import { useAccount } from "../useAccount";
import { EmailUpdatesBox } from "./EmailUpdates";
import { BillingSwitch, PaymentBox, PlanOption, planHue, type Loaded } from "./PlanPicker";
import { Card, ErrorLine, FIELD, LABEL, PRIMARY, errorOf, send } from "./parts";

/**
 * /account/setup, where a new account stays until it has chosen a plan (`LoginGuard`): its name and its plan, saved in
 * one step, then on to `next`. A name that is only the email's stand-in (`emailName`) starts empty, to be typed; Google's
 * is filled in to keep or change. No plan is chosen for them; they pick it paid monthly or yearly, and the payment box
 * under it shows what it costs. Nothing is charged during the open beta. The page reloads into `next`, since a Teacher plan
 * changes the role every page reads. A Continue that can't go on brings the first thing to fix into view and focus,
 * since on a phone the name sits a screen above the button.
 */
export default function SetupForm({ next }: { next: string }) {
  const { account, loaded: accountLoaded } = useAccount();
  const [name, setName] = useState<string | null>(null);
  const [plans, setPlans] = useState<Loaded | null>(null);
  const [planId, setPlanId] = useState<string | null>(null);
  const [billing, setBilling] = useState<Billing | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);
  const [emails, setEmails] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const plansRef = useRef<HTMLFieldSetElement>(null);

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
  // unticked for a new account; their own earlier yes when they come back
  const shownEmails = emails ?? account.emailUpdates;
  const chosenPlan = plans?.plans.find((p) => p.id === chosen) ?? null;

  const save = async (e: FormEvent) => {
    e.preventDefault();
    const noName = !shown.trim();
    const noPlan = !chosen && !!plans;
    setNameError(noName ? "Type your name." : null);
    setPlanError(noPlan ? "Choose a plan." : null);
    setError(null);
    if (noName) return showName();
    if (noPlan) return showPlans();
    if (!chosen) return;
    setBusy(true);
    const r = await send("/api/account/setup", "POST", { name: shown, planId: chosen, billing: shownBilling, emailUpdates: shownEmails });
    if (r.ok) return window.location.assign(next);
    setBusy(false);
    if (r.body.field === "name") {
      setNameError(errorOf(r));
      showName();
    } else setError(errorOf(r));
  };

  // the field itself takes focus (a phone keyboard opens on it); the plans are a group, so they are scrolled to and the
  // first card focused without a jump of its own
  const showName = () => {
    nameRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    nameRef.current?.focus({ preventScroll: true });
  };
  const showPlans = () => {
    plansRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    plansRef.current?.querySelector<HTMLInputElement>("input[type=radio]")?.focus({ preventScroll: true });
  };
  const pick = (id: string) => { setPlanId(id); setPlanError(null); setError(null); };

  return (
    <Card wide>
      <form noValidate onSubmit={(e) => void save(e)} className="flex flex-col gap-5">
        <div className="flex w-full flex-col sm:max-w-sm [&>p]:mt-1.5">
          <label htmlFor="setup-name" className={LABEL}>Your name</label>
          <input
            id="setup-name"
            ref={nameRef}
            className={`${FIELD} scroll-mt-24`}
            value={shown}
            onChange={(e) => { setName(e.target.value); setNameError(null); }}
            placeholder={askName ? "First name, or what students call you" : undefined}
            autoComplete="name"
            autoFocus={askName}
            maxLength={80}
            aria-invalid={!!nameError}
            aria-describedby={nameError ? "setup-name-error" : undefined}
          />
          <ErrorLine id="setup-name-error">{nameError}</ErrorLine>
        </div>

        <fieldset
          ref={plansRef}
          aria-invalid={!!planError}
          aria-describedby={planError ? "setup-plan-error" : undefined}
          className="flex scroll-mt-24 flex-col gap-3 border-t border-slate-800 pt-5 metal-rule"
        >
          <legend className="sr-only">Plan</legend>
          {/* the legend's visible twin: a <legend> can't sit in a flex row beside the switch */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col gap-2">
              <span aria-hidden className="text-sm font-semibold text-slate-200">Plan</span>
              {/* shown before the plans load too: it is the first thing to know about choosing one */}
              <div className="flex max-w-xl flex-col gap-1.5 rounded-lg border border-sky-400/40 bg-sky-500/10 px-4 py-3 text-sm text-sky-100">
                <p className="font-semibold">Open beta: free while we build it with you</p>
                <p>Every plan is free during the open beta, and choosing one doesn&apos;t ask for payment. Pick the one you&apos;d want: it tells us what to build next.</p>
                <p>When something breaks or doesn&apos;t make sense, tell us with Send feedback in the profile menu. You can change your plan later on your account page.</p>
              </div>
            </div>
            {plans && <div className="flex shrink-0"><BillingSwitch billing={shownBilling} plans={plans.plans} onChange={(b) => { setBilling(b); setError(null); }} /></div>}
          </div>
          {!plans && !error && <p className="text-sm text-slate-500">Loading plans…</p>}
          <ErrorLine id="setup-plan-error">{planError}</ErrorLine>
          {plans && (
            <div className={`grid gap-3 rounded-2xl transition sm:grid-cols-[repeat(auto-fit,minmax(12rem,1fr))] ${planError ? "ring-1 ring-rose-400/60 ring-offset-4 ring-offset-slate-900" : ""}`}>
              {plans.plans.map((p, i) => (
                <PlanOption key={p.id} plan={p} hue={planHue(i)} billing={shownBilling} checked={p.id === chosen} trial={plans.current === null} onPick={() => pick(p.id)} />
              ))}
            </div>
          )}
        </fieldset>

        {chosenPlan && plans && <PaymentBox plan={chosenPlan} hue={planHue(plans.plans.indexOf(chosenPlan))} billing={shownBilling} trial={plans.current === null} />}

        <div className="border-t border-slate-800 pt-5 metal-rule">
          <EmailUpdatesBox checked={shownEmails} onChange={setEmails} where="account" />
        </div>

        <ErrorLine>{error}</ErrorLine>
        <button type="submit" disabled={busy || !plans} className={`${PRIMARY} sm:w-auto sm:self-end sm:px-12`}>{busy ? "Saving…" : "Continue"}</button>
      </form>
    </Card>
  );
}
