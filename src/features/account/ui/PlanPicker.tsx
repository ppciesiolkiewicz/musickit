"use client";

import { useEffect, useState } from "react";
import { HUE_TONES, type Hue } from "@/components/ui";
import { can, type Account } from "../model";
import { allowanceLabel, bestSavingLabel, priceCents, priceLabel, pricedWithYou, roleOnPlan, savingLabel, studentsLabel, trialLabel, dollars, type Billing, type Plan } from "../plans";
import { ErrorLine, PRIMARY, errorOf, send } from "./parts";
import { AUDIENCES, AUDIENCE_LEAD, audienceOf, pitchOf, type Audience } from "./planPitch";

/** `GET /api/account/plan` (`AccountPlans` in server/auth.ts, which a client file can't import). */
export type Loaded = { plans: Plan[]; current: string | null; billing: Billing; request: { planId: string; at: string } | null };

/** Over the plans here and on /account/setup: the open beta charges nothing, while what people choose shows us who would pay for what. */
export const BETA_PLAN_LINE = "It's free while we're in open beta, so picking a plan won't ask you to pay.";

/** What a plan gives, under its name and price: here and on /account/setup. */
export function PlanLines({ plan, trial: showTrial = true }: { plan: Plan; /** off for someone already on a plan: the trial is for a new account */ trial?: boolean }) {
  const students = studentsLabel(plan);
  const trial = showTrial ? trialLabel(plan) : null;
  const pitch = pitchOf(plan);
  return (
    <div className="flex flex-col gap-2">
      {pitch && (
        <ul className="flex flex-col gap-1 text-sm leading-snug text-slate-200">
          {pitch.points.map((x) => (
            <li key={x} className="flex gap-2"><span aria-hidden className="mt-px text-emerald-300">✓</span><span>{x}</span></li>
          ))}
        </ul>
      )}
      <ul className="flex flex-col gap-0.5 text-xs leading-relaxed text-slate-400">
        {students && <li>{students}</li>}
        <li>{allowanceLabel(plan)}</li>
        {plan.role === "teacher" && !pitch && <li>Share plans with your students</li>}
        {pricedWithYou(plan) && <li>We&apos;ll email you to agree on a price</li>}
        {trial && <li>{trial}</li>}
        {!plan.enabled && <li>We don&apos;t offer this plan any more, but it&apos;s yours until you pick another.</li>}
      </ul>
    </div>
  );
}

/**
 * Individual or Teachers, over the plans: which side's plans show. Each side's line says who it is for, so a person
 * picks themself before they pick a plan.
 */
export function AudienceSwitch({ audience, onChange }: { audience: Audience; onChange: (a: Audience) => void }) {
  return (
    <div role="group" aria-label="Who the plan is for" className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-700 bg-slate-950/60 p-1.5 sm:max-w-xl">
      {AUDIENCES.map((a) => {
        const on = audience === a.id;
        return (
          <button
            key={a.id}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(a.id)}
            className={`no-chrome flex flex-col items-start gap-0.5 rounded-xl px-4 py-2.5 text-left transition ${on ? "bg-slate-100 text-slate-950 shadow-sm" : "text-slate-300 hover:bg-slate-800/70 hover:text-slate-100"}`}
          >
            <span className="text-base font-semibold">{a.label}</span>
            <span className={`text-xs ${on ? "text-slate-700" : "text-slate-500"}`}>{a.line}</span>
          </button>
        );
      })}
    </div>
  );
}

/** What every plan on the shown side gives, said once over its cards. */
export const AudienceLead = ({ audience }: { audience: Audience }) => <p className="max-w-2xl text-sm text-slate-300">{AUDIENCE_LEAD[audience]}</p>;

/** The plan grid for one side: Individual's one plan sits in a narrower column so its card doesn't stretch across the page. */
export const planGrid = (count: number) =>
  count === 1 ? "grid gap-3 sm:max-w-md" : "grid gap-3 sm:grid-cols-[repeat(auto-fit,minmax(13rem,1fr))]";

/** The side to open on: the person's own plan's side, else Teachers for a teacher or owner, else Individual. */
export const startAudience = (plans: Plan[], current: string | null, account: Pick<Account, "role">): Audience => {
  const mine = plans.find((p) => p.id === current);
  if (mine) return audienceOf(mine);
  return account.role === "student" ? "individual" : "teachers";
};

/**
 * Monthly or Yearly: how every price below is shown and paid. Yearly carries what it saves (`bestSavingLabel`) as a badge
 * that stays on while Monthly is chosen, so the cheaper way is seen before it is picked.
 */
export function BillingSwitch({ billing, plans, onChange }: { billing: Billing; plans: Plan[]; onChange: (b: Billing) => void }) {
  // a plan priced with the person has no price to save on
  const saving = bestSavingLabel(plans.filter((p) => !pricedWithYou(p)));
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
export function PlanOption({ plan, billing, checked, mine, trial = true, hue = "sky", onPick }: { plan: Plan; billing: Billing; checked: boolean; /** "Your plan" note */ mine?: string | null; trial?: boolean; hue?: Hue; onPick: () => void }) {
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
          {pitchOf(plan) && <span className="text-xs text-slate-400">{pitchOf(plan)!.forWho}</span>}
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
        <PlanLines plan={plan} trial={trial} />
        {mine && <span className={`text-xs font-medium ${tone.ink}`}>{mine}</span>}
      </span>
    </label>
  );
}

/**
 * What the chosen plan costs and when, above where the card details will go. A placeholder: nothing is charged during
 * the beta, and there is no payment provider yet.
 */
export function PaymentBox({ plan, billing, trial, hue = "sky" }: { plan: Plan; billing: Billing; /** the chosen plan's colour, for its dot */ hue?: Hue; /** a new account's first plan starts with the free trial; a change doesn't */ trial: boolean }) {
  const price = priceLabel(plan, billing);
  const days = plan.trialDays === 1 ? "1 day" : `${plan.trialDays} days`;
  return (
    <section aria-labelledby="payment-heading" className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-950/40 p-3">
      <h3 id="payment-heading" className="text-sm font-semibold text-slate-200">Payment</h3>
      <p className="text-sm text-slate-300">
        <span aria-hidden className={`mr-2 inline-block size-2 rounded-full align-middle ${HUE_TONES[hue].fill}`} />
        {pricedWithYou(plan)
          ? `${plan.name}, price set with you. We'll email you to agree on a price.`
          : <>{plan.name}, {price}.{" "}{trial && plan.trialDays > 0 ? `${days} free, then ${dollars(priceCents(plan, billing))} every ${billing}.` : `${dollars(priceCents(plan, billing))} every ${billing}.`}</>}
      </p>
      <div className="flex min-h-24 items-center justify-center rounded-lg border border-dashed border-slate-700 px-3 py-4 text-center text-xs text-slate-500">
        Your card details will go here. During the open beta we won&apos;t charge you anything.
      </div>
    </section>
  );
}

/**
 * The Plan part of /account: the plans the person can choose, the one they are on and how they pay. Picking a plan or the
 * other billing shows what it costs and the payment box; Move to … moves them at once, with no payment during the beta,
 * and reloads the page, since a Teacher plan changes the role every page reads. Leaving a Teacher plan for Student says
 * first that it takes away sharing plans; a Teacher plan with fewer students says its limit. Both say the students keep
 * the plans already shared: an invite claimed is a copy in the student's own plans (`claimInvite`).
 */
export default function PlanPicker({ account }: { account: Account }) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [billing, setBilling] = useState<Billing | null>(null);
  const [audience, setAudience] = useState<Audience | null>(null);

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
  const shownAudience = audience ?? (loaded ? startAudience(loaded.plans, loaded.current, account) : "individual");
  const shownPlans = loaded?.plans.filter((p) => audienceOf(p) === shownAudience) ?? [];
  const chosenId = picked ?? loaded?.current ?? null;
  // only a plan on the side shown: the other side's pick (or their own plan) is out of sight, so nothing to pay for
  const chosen = shownPlans.find((p) => p.id === chosenId) ?? null;
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
    <section aria-labelledby="plan-heading" className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 id="plan-heading" className="text-sm font-semibold text-slate-200">Plan</h2>
        <p className="text-xs text-slate-500">{BETA_PLAN_LINE}</p>
      </div>
      {!loaded && !error && <p className="text-sm text-slate-500">Loading plans…</p>}
      {loaded && (
        <>
          <AudienceSwitch audience={shownAudience} onChange={(a) => { setAudience(a); setError(null); }} />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <AudienceLead audience={shownAudience} />
            <div className="flex shrink-0"><BillingSwitch billing={shownBilling} plans={shownPlans} onChange={(b) => { setBilling(b); setError(null); }} /></div>
          </div>
          <div role="radiogroup" aria-labelledby="plan-heading" className={planGrid(shownPlans.length)}>
            {shownPlans.map((p) => (
              <PlanOption
                key={p.id}
                plan={p}
                hue={planHue(loaded.plans.indexOf(p))}
                billing={shownBilling}
                checked={p.id === chosenId}
                mine={p.id === loaded.current ? `Your plan, paid ${loaded.billing === "month" ? "monthly" : "yearly"}` : null}
                trial={loaded.current === null}
                onPick={() => { setPicked(p.id); setError(null); }}
              />
            ))}
          </div>
          {request && <p role="status" className="text-xs text-slate-400">You chose {request.name} on {request.on}. We&apos;ll email you at {account.email} to agree on a price.</p>}
          {changes && chosen && (
            <div className="flex flex-col gap-2">
              <PaymentBox plan={chosen} hue={planHue(loaded.plans.indexOf(chosen))} billing={shownBilling} trial={loaded?.current === null} />
              {losesSharing && <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-2 text-xs text-amber-100">On {chosen.name} you won&apos;t be able to share plans with your students. {KEEP}</p>}
              {fewerStudents && <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-2 text-xs text-amber-100">{chosen.name} takes up to {chosen.students} students. {KEEP}</p>}
              <button type="button" disabled={busy} className={`${PRIMARY} sm:w-auto sm:self-start sm:px-8`} onClick={() => void move()}>
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
