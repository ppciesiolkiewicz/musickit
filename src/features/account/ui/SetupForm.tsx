"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { emailName } from "../model";
import type { Billing } from "../plans";
import { useAccount } from "../useAccount";
import { EmailUpdatesBox } from "./EmailUpdates";
import { AudienceLead, AudienceSwitch, BillingSwitch, PaymentBox, PlanOption, planGrid, planHue, startAudience, type Loaded } from "./PlanPicker";
import { audienceOf, type Audience } from "./planPitch";
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
  const [audience, setAudience] = useState<Audience | null>(null);
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
  const shownAudience = audience ?? (plans ? startAudience(plans.plans, plans.current, account) : "individual");
  const shownPlans = plans?.plans.filter((p) => audienceOf(p) === shownAudience) ?? [];
  // a pick on the other side is out of sight, so it doesn't count: Continue asks for a plan on this side
  const chosenPlan = shownPlans.find((p) => p.id === chosen) ?? null;

  const save = async (e: FormEvent) => {
    e.preventDefault();
    const noName = !shown.trim();
    const noPlan = !chosenPlan && !!plans;
    setNameError(noName ? "Please type your name." : null);
    setPlanError(noPlan ? "Please pick a plan." : null);
    setError(null);
    if (noName) return showName();
    if (noPlan) return showPlans();
    if (!chosenPlan) return;
    setBusy(true);
    const r = await send("/api/account/setup", "POST", { name: shown, planId: chosenPlan.id, billing: shownBilling, emailUpdates: shownEmails });
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
          {/* the legend's visible twin */}
          <span aria-hidden className="text-sm font-semibold text-slate-200">Plan</span>
          {/* shown before the plans load too: it is the first thing to know about choosing one */}
          <div className="flex max-w-xl flex-col gap-1.5 rounded-lg border border-sky-400/40 bg-sky-500/10 px-4 py-3 text-sm text-sky-100">
            <p className="flex flex-wrap items-center gap-2 font-semibold">
              Open beta: free while we build it with you
              <span className="rounded-full bg-emerald-400 px-2.5 py-0.5 text-xs font-semibold text-slate-950">It&apos;s free now</span>
            </p>
            <p>Every plan is free while we&apos;re in open beta, and picking one won&apos;t ask you to pay. Choose the one you&apos;d really want: it helps us decide what to build next.</p>
            <p>Something broken or confusing? Tell us with Send feedback in the profile menu. You can change your plan any time on your account page.</p>
          </div>
          {!plans && !error && <p className="text-sm text-slate-500">Loading plans…</p>}
          {plans && (
            <>
              <AudienceSwitch audience={shownAudience} onChange={(a) => { setAudience(a); setPlanError(null); setError(null); }} />
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <AudienceLead audience={shownAudience} />
                <div className="flex shrink-0"><BillingSwitch billing={shownBilling} plans={shownPlans} onChange={(b) => { setBilling(b); setError(null); }} /></div>
              </div>
            </>
          )}
          <ErrorLine id="setup-plan-error">{planError}</ErrorLine>
          {plans && (
            <div className={`${planGrid(shownPlans.length)} rounded-2xl transition ${planError ? "ring-1 ring-rose-400/60 ring-offset-4 ring-offset-slate-900" : ""}`}>
              {shownPlans.map((p) => (
                <PlanOption key={p.id} plan={p} hue={planHue(plans.plans.indexOf(p))} billing={shownBilling} checked={p.id === chosenPlan?.id} trial={plans.current === null} onPick={() => pick(p.id)} />
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
