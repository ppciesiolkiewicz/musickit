"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { emailName } from "../model";
import type { Billing } from "../plans";
import { useAccount } from "../useAccount";
import { EmailUpdatesBox } from "./EmailUpdates";
import { paidThroughCheckout } from "../billing";
import { AudienceLead, AudienceSwitch, BillingSwitch, EarlyOffer, NoChargeLine, PlanOption, planGrid, planHue, startAudience, type Loaded } from "./PlanPicker";
import { audienceOf, type Audience } from "./planPitch";
import { Card, ErrorLine, FIELD, LABEL, PRIMARY, errorOf, send } from "./parts";
import { VOICE_CARE_ERROR, VoiceCareBox } from "./VoiceCare";

/**
 * /account/setup, where a new account stays until it has chosen a plan (`LoginGuard`): its name and its plan, saved in
 * one step, then on to `next`. A name that is only the email's stand-in (`emailName`) starts empty, to be typed; Google's
 * is filled in to keep or change. No plan is chosen for them; they pick it paid monthly or yearly, and the payment box
 * under it shows what it costs. Nothing is charged during the open beta. The page reloads into `next`, since a Teacher plan
 * changes the role every page reads. A Continue that can't go on brings the first thing to fix into view and focus,
 * since on a phone the name sits a screen above the button. The terms of use box is never ticked for them, and Continue
 * needs it; its link opens /terms in a new tab, so nothing typed here is lost. Another feature can add a box first among the
 * boxes (`boxes`) and fields to the saved body (`extra`): the daily reminder does (`reminders/ui/SetupWithReminder`).
 */
export default function SetupForm({ next, start, boxes, extra, payments = false }: {
  next: string;
  /** payments are on (`STRIPE_ENABLED`): no open-beta box. From the server page, so it is right before the plans load. */
  payments?: boolean;
  /** the side asked for (`?for=teachers`, from "Become a founding partner") */
  start?: Audience | null;
  /** shown first among the boxes, above the email and terms boxes */
  boxes?: ReactNode;
  /** more fields for the setup body, read when Continue is pressed */
  extra?: () => Record<string, unknown>;
}) {
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
  const [terms, setTerms] = useState(false);
  const [termsError, setTermsError] = useState<string | null>(null);
  // the voice-care box (`VoiceCare.tsx`): asked here, not stored
  const [care, setCare] = useState(false);
  const [careError, setCareError] = useState<string | null>(null);
  const careRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const plansRef = useRef<HTMLFieldSetElement>(null);
  const termsRef = useRef<HTMLInputElement>(null);

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
  const shownAudience = audience ?? (plans ? startAudience(plans.plans, plans.current, account, start) : "individual");
  const early = plans?.early[shownAudience] ?? true;
  const shownPlans = plans?.plans.filter((p) => audienceOf(p) === shownAudience) ?? [];
  // a pick on the other side is out of sight, so it doesn't count: Continue asks for a plan on this side
  const chosenPlan = shownPlans.find((p) => p.id === chosen) ?? null;

  const save = async (e: FormEvent) => {
    e.preventDefault();
    const noName = !shown.trim();
    const noPlan = !chosenPlan && !!plans;
    setNameError(noName ? "Please type your name." : null);
    setPlanError(noPlan ? "Please pick a plan." : null);
    setTermsError(terms ? null : "Please agree to the terms of use.");
    setError(null);
    if (noName) return showName();
    if (noPlan) return showPlans();
    setCareError(care ? null : VOICE_CARE_ERROR);
    if (!terms) return showTerms();
    if (!care) return careRef.current?.focus();
    if (!chosenPlan) return;
    setBusy(true);
    const r = await send("/api/account/setup", "POST", { name: shown, planId: chosenPlan.id, billing: shownBilling, emailUpdates: shownEmails, acceptTerms: terms, ...extra?.() });
    // payments on and a paid plan with no subscription: on to Stripe's Checkout, which comes back to `next`
    if (r.ok && (r.body.account as { needsPayment?: boolean } | undefined)?.needsPayment) {
      const paid = await send("/api/account/checkout", "POST", { next });
      if (paid.ok && typeof paid.body.url === "string") return window.location.assign(paid.body.url);
      setBusy(false);
      return setError(errorOf(paid));
    }
    if (r.ok) return window.location.assign(next);
    setBusy(false);
    if (r.body.field === "name") {
      setNameError(errorOf(r));
      showName();
    } else if (r.body.field === "terms") {
      setTermsError(errorOf(r));
      showTerms();
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
  const showTerms = () => {
    termsRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    termsRef.current?.focus({ preventScroll: true });
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
          {!payments && <div className="flex max-w-xl flex-col gap-1.5 rounded-lg border border-sky-400/40 bg-sky-500/10 px-4 py-3 text-sm text-sky-100">
            <p className="flex flex-wrap items-center gap-2 font-semibold">
              Open beta: free while we build it with you
              <span className="rounded-full bg-emerald-400 px-2.5 py-0.5 text-xs font-semibold text-slate-950">It&apos;s free now</span>
            </p>
            <p>Every plan is free while we&apos;re in open beta, and picking one won&apos;t ask you to pay. Choose the one you&apos;d really want: it helps us decide what to build next.</p>
            <p>Sign up now to keep the early price and get a longer free trial when paid plans start.</p>
            <p>Something broken or confusing? Tell us with Send feedback in the profile menu. You can change your plan any time on your account page.</p>
          </div>}
          {!plans && !error && <p className="text-sm text-slate-500">Loading plans…</p>}
          {plans && (
            <>
              <AudienceSwitch audience={shownAudience} onChange={(a) => { setAudience(a); setPlanError(null); setError(null); }} />
              <EarlyOffer audience={shownAudience} open={early} />
              {!payments && !plans?.payments && <NoChargeLine />}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <AudienceLead audience={shownAudience} />
                <div className="flex shrink-0"><BillingSwitch billing={shownBilling} plans={shownPlans} early={early} onChange={(b) => { setBilling(b); setError(null); }} /></div>
              </div>
            </>
          )}
          <ErrorLine id="setup-plan-error">{planError}</ErrorLine>
          {plans && (
            <div className={`${planGrid(shownPlans.length)} rounded-2xl transition ${planError ? "ring-1 ring-rose-400/60 ring-offset-4 ring-offset-slate-900" : ""}`}>
              {shownPlans.map((p) => (
                <PlanOption key={p.id} plan={p} hue={planHue(plans.plans.indexOf(p))} billing={shownBilling} checked={p.id === chosenPlan?.id} trial={plans.current === null} early={early} onPick={() => pick(p.id)} />
              ))}
            </div>
          )}
        </fieldset>

        <div className="flex flex-col gap-4 border-t border-slate-800 pt-5 metal-rule">
          {boxes}
          <EmailUpdatesBox checked={shownEmails} onChange={setEmails} where="account" />
          <div className="flex flex-col gap-1.5">
            <label className="flex items-start gap-3 text-sm">
              <input
                ref={termsRef}
                type="checkbox"
                className="mt-0.5 h-4 w-4 shrink-0 scroll-mt-24 accent-sky-400"
                checked={terms}
                onChange={(e) => { setTerms(e.target.checked); setTermsError(null); }}
                aria-invalid={!!termsError}
                aria-describedby={termsError ? "setup-terms-error" : undefined}
              />
              <span className="text-slate-200">
                I agree to the{" "}
                <Link href="/terms" target="_blank" className="text-sky-300 underline decoration-sky-500/40 underline-offset-4 hover:text-sky-200">terms of use</Link>. The{" "}
                <Link href="/privacy" target="_blank" className="text-sky-300 underline decoration-sky-500/40 underline-offset-4 hover:text-sky-200">privacy policy</Link>{" "}
                says what we keep about you.
              </span>
            </label>
            <ErrorLine id="setup-terms-error">{termsError}</ErrorLine>
          </div>
          <VoiceCareBox id="setup-care" checked={care} onChange={(v) => { setCare(v); setCareError(null); }} error={careError} inputRef={careRef} />
        </div>

        <ErrorLine>{error}</ErrorLine>
        <button type="submit" disabled={busy || !plans} className={`${PRIMARY} sm:w-auto sm:self-end sm:px-12`}>{busy ? "Saving…" : plans?.payments && chosenPlan && paidThroughCheckout(chosenPlan, shownBilling) ? "Continue to payment" : "Continue"}</button>
      </form>
    </Card>
  );
}
