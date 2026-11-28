"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { ROLE_LABEL } from "../model";
import { useAccount, useAccountStore } from "../useAccount";
import EmailUpdates from "./EmailUpdates";
import ContactForm from "@/components/landing/ContactForm";
import { FEEDBACK_HREF } from "@/features/messages/ui/FeedbackPage";
import PlanPicker from "./PlanPicker";
import type { Audience } from "./planPitch";
import { Card, ErrorLine, FIELD, LABEL, LINK, PRIMARY, SECONDARY, errorOf, send } from "./parts";

/** After anything that changes who is signed in, every page reads its data again. */
const go = (path: string) => window.location.assign(path);

/**
 * /account: the open-beta line, who is logged in, their name, the emails about what we fix and add, and offers, their plan, feedback and, under
 * everything, Log out and Delete account (/terms and /privacy promise it on this page): a message to us through the contact form
 * (source `delete-account`), not a button that deletes (user, 2026-11-28). We delete the account on /admin/admin/users, after
 * cancelling any subscription in Stripe, which deleting doesn't do. Logged out, it points to Log in.
 */
export default function AccountPanel({ start, payments = false }: { /** the plans' side asked for in the address (`?for=teachers`) */ start?: Audience | null; /** payments are on (`STRIPE_ENABLED`): no open-beta line */ payments?: boolean }) {
  const { account, loaded } = useAccount();
  const store = useAccountStore();
  const [name, setName] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);

  // the feedback form moved to its own page; old links to /account#feedback land there
  useEffect(() => {
    if (window.location.hash === "#feedback") window.location.replace(FEEDBACK_HREF);
  }, []);

  if (!loaded) return <Card><p className="text-sm text-slate-500">Loading…</p></Card>;

  if (!account) {
    return (
      <Card>
        <p className="text-sm text-slate-300">You are not logged in. Every tool works without an account, and what you do is kept in this browser.</p>
        <Link href="/login" className={PRIMARY}>Log in</Link>
      </Card>
    );
  }

  const shown = name ?? account.name;

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setSaved(false);
    const r = await send("/api/account", "PATCH", { name: shown });
    setBusy(false);
    if (!r.ok) return setError(errorOf(r));
    setError(null);
    setSaved(true);
  };

  return (
    <div className="flex w-full flex-col gap-5">
      {!payments && <p className="rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sm text-sky-100">
        <span className="font-semibold">Open beta.</span> attunr is free while we fix bugs. If something breaks or doesn&apos;t make sense, please tell us.{" "}
        <a href={FEEDBACK_HREF} className={LINK}>Send feedback</a>
      </p>}

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <div className="flex flex-col gap-5">
          <Card fill>
            <section aria-labelledby="profile-heading" className="flex flex-col gap-4">
              <h2 id="profile-heading" className="text-sm font-semibold text-slate-200">Profile</h2>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                <dt className="text-slate-500">Email</dt>
                <dd className="truncate text-slate-100" title={account.email}>{account.email}</dd>
                <dt className="text-slate-500">Role</dt>
                <dd className="text-slate-100">{ROLE_LABEL[account.role]}</dd>
              </dl>

              <form noValidate onSubmit={(e) => void save(e)} className="flex flex-col gap-2">
                <label>
                  <span className={LABEL}>First name or nickname</span>
                  <input className={FIELD} value={shown} onChange={(e) => { setName(e.target.value); setSaved(false); }} autoComplete="given-name" maxLength={80} />
                </label>
                <button type="submit" disabled={busy || shown.trim() === account.name} className={SECONDARY}>Save name</button>
                {saved && <p role="status" className="text-xs text-emerald-300">Name saved.</p>}
              </form>

              <EmailUpdates account={account} />

              <p className="text-xs text-slate-500">Your plans, progress, notes and videos are kept in your account.</p>
              <ErrorLine>{error}</ErrorLine>

            </section>
          </Card>

        </div>

        <Card fill>
          <PlanPicker account={account} start={start} />
        </Card>
      </div>

      <div className="flex flex-col items-start gap-3 border-t border-slate-800 pt-5">
        <button type="button" disabled={busy} className={`${SECONDARY} !w-auto`} onClick={() => void store.signOut().then(() => go("/"))}>Log out</button>

        {asking ? (
          <div className="flex w-full max-w-xl flex-col gap-3 rounded-xl border border-slate-700 bg-slate-900/40 p-4">
            <p className="text-sm text-slate-200">To delete the account for {account.email}, send us the message below. We remove your account, plans, notes and videos, and email you when it is done. It can&apos;t be undone.</p>
            {account.subscribed && <p className="text-sm text-slate-200">Deleting your account doesn&apos;t cancel your plan. To cancel it first, press Manage billing above: it opens Stripe, where you manage your subscription.</p>}
            <ContactForm source="delete-account" initialEmail={account.email} initialMessage={`Please delete my account (${account.email}).`} done="We'll email you when your account is deleted." />
            <button type="button" className={`${SECONDARY} !w-auto self-start`} onClick={() => setAsking(false)}>Keep account</button>
          </div>
        ) : (
          <button type="button" className="self-start text-xs text-slate-500 underline-offset-2 hover:text-rose-300 hover:underline" onClick={() => setAsking(true)}>Delete account</button>
        )}
      </div>
    </div>
  );
}
