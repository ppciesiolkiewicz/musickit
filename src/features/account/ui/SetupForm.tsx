"use client";

import { useEffect, useState, type FormEvent } from "react";
import { priceLabel } from "../plans";
import { useAccount } from "../useAccount";
import { PlanLines, type Loaded } from "./PlanPicker";
import { Card, ErrorLine, FIELD, LABEL, PRIMARY, errorOf, send } from "./parts";

/**
 * /account/setup, the first page of a new account: its name and its plan, saved in one step, then on to `next`.
 * `askName`: the name came from the email, so the field starts empty; Google's name is filled in to keep or change.
 * Any plan can be chosen with no payment during the beta. The page reloads into `next`, since a Teacher plan changes the
 * role every page reads.
 */
export default function SetupForm({ next, askName }: { next: string; askName: boolean }) {
  const { account, loaded: accountLoaded } = useAccount();
  const [name, setName] = useState<string | null>(null);
  const [plans, setPlans] = useState<Loaded | null>(null);
  const [planId, setPlanId] = useState<string | null>(null);
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

  const shown = name ?? (askName ? "" : account.name);
  const chosen = planId ?? plans?.current ?? null;

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!shown.trim()) return setNameError("Type your name.");
    if (!chosen) return;
    setBusy(true);
    setError(null);
    const r = await send("/api/account/setup", "POST", { name: shown, planId: chosen });
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
          {plans?.plans.map((p) => {
            const on = p.id === chosen;
            return (
              <label
                key={p.id}
                className={`flex cursor-pointer gap-3 rounded-xl border p-3 transition ${on ? "border-sky-400/60 bg-sky-400/5" : "border-slate-800 bg-slate-950/40 hover:border-slate-600"}`}
              >
                <input type="radio" name="plan" value={p.id} checked={on} onChange={() => setPlanId(p.id)} className="mt-1 accent-sky-400" />
                <span className="flex flex-1 flex-col gap-1">
                  <span className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-sm font-semibold text-slate-100">{p.name}</span>
                    <span className="text-sm text-slate-300">{priceLabel(p)}</span>
                  </span>
                  <PlanLines plan={p} />
                </span>
              </label>
            );
          })}
        </fieldset>

        <ErrorLine>{error}</ErrorLine>
        <button type="submit" disabled={busy || !plans} className={PRIMARY}>{busy ? "Saving…" : "Continue"}</button>
      </form>
    </Card>
  );
}
