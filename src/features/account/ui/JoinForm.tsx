"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { loginHref } from "@/lib/publicPaths";
import { studentsLabel } from "../plans";
import { EmailUpdatesBox } from "./EmailUpdates";
import { Card, ErrorLine, FIELD, LABEL, PRIMARY, SECONDARY, errorOf, send, type Posted } from "./parts";

type View = {
  state: "open" | "yours" | "used" | "not-found";
  plan: { name: string; students: number | null } | null;
  needsSetup: boolean;
  taught: boolean;
};

/** Where a teacher goes once they joined. */
const AFTER_JOIN = "/students";

const NOTICES = {
  used: { title: "This invite was already used", text: "Another account joined with this link. Ask us for a new one." },
  "not-found": { title: "This invite link doesn't work", text: "The link may be wrong or cut short. Check it, or ask us for a new one." },
  taught: { title: "This account can't join as a teacher", text: "It belongs to a teacher's class. Log out, then open the link again and log in with another email." },
} as const;

/**
 * A teacher invite, opened by a signed-in person (`/join/<token>`, made on /admin/invites): says what the plan gives and
 * joins with Join as a teacher (`POST /api/join/<token>`), then loads /students afresh, since the role changed. A new
 * account (no plan yet) gives its name and agrees to the terms here, as on /account/setup, which it skips. A used or
 * unknown link, or a student of a teacher, gets a notice instead.
 */
export default function JoinForm({ token }: { token: string }) {
  const api = `/api/join/${encodeURIComponent(token)}`;
  const [view, setView] = useState<View | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [terms, setTerms] = useState(false);
  const [termsError, setTermsError] = useState<string | null>(null);
  const [emails, setEmails] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const termsRef = useRef<HTMLInputElement>(null);

  const show = useCallback((r: Posted) => {
    if (r.status === 401) return window.location.replace(loginHref(window.location.pathname));
    if (!r.ok) return setLoadError(errorOf(r));
    setLoadError(null);
    setView(r.body as unknown as View);
  }, []);
  const load = () => send(api, "GET").then(show);

  useEffect(() => {
    let live = true;
    void send(api, "GET").then((r) => live && show(r));
    return () => void (live = false);
  }, [api, show]);

  const join = async (e: FormEvent) => {
    e.preventDefault();
    if (!view) return;
    setError(null);
    if (view.needsSetup) {
      const nameMissing = !name.trim();
      setNameError(nameMissing ? "Please type your name." : null);
      setTermsError(terms ? null : "Please agree to the terms of use.");
      if (nameMissing) return nameRef.current?.focus();
      if (!terms) return termsRef.current?.focus();
    }
    setBusy(true);
    const r = await send(api, "POST", view.needsSetup ? { name, acceptTerms: terms, emailUpdates: emails } : {});
    // a full page load: the role changed, and every useAccount() reads it once per page
    if (r.ok) return window.location.replace(AFTER_JOIN);
    setBusy(false);
    if (r.body.field === "name") setNameError(errorOf(r));
    else if (r.body.field === "terms") setTermsError(errorOf(r));
    else if (r.status === 404 || r.status === 410) void load();
    else setError(errorOf(r));
  };

  if (loadError) {
    return (
      <Card className="mx-auto">
        <ErrorLine>{loadError}</ErrorLine>
        <button type="button" onClick={() => void load()} className={SECONDARY}>Try again</button>
      </Card>
    );
  }
  if (!view) return <p role="status" className="text-center text-sm text-slate-400">Opening the invite…</p>;

  const notice = view.state === "used" || view.state === "not-found" ? NOTICES[view.state] : view.state === "open" && view.taught ? NOTICES.taught : null;
  if (notice) {
    return (
      <Card className="mx-auto">
        <div role="alert" className="flex flex-col gap-2">
          <h2 className="text-lg text-slate-100">{notice.title}</h2>
          <p className="text-sm leading-relaxed text-slate-400">{notice.text}</p>
        </div>
      </Card>
    );
  }
  if (view.state === "yours" && !view.needsSetup) {
    return (
      <Card className="mx-auto">
        <h2 className="text-lg text-slate-100">You joined with this invite</h2>
        <p className="text-sm leading-relaxed text-slate-400">Your account is on the {view.plan?.name} plan.</p>
        <Link href={AFTER_JOIN} className={PRIMARY}>Open Students</Link>
      </Card>
    );
  }

  const students = view.plan ? studentsLabel(view.plan) : null;
  return (
    <Card className="mx-auto">
      <form noValidate onSubmit={(e) => void join(e)} className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <h2 className="text-lg text-slate-100">Try attunr as a teacher</h2>
          <p className="text-sm leading-relaxed text-slate-300">
            This invite puts your account on the {view.plan?.name} plan, free.{students ? ` ${students}.` : ""} Add your students on the Students page, and
            attunr makes each one an account and a plan for their first week.
          </p>
          {!view.needsSetup && <p className="text-sm leading-relaxed text-slate-400">Joining moves your account from the plan it is on now.</p>}
        </div>

        {view.needsSetup && (
          <>
            <div className="flex flex-col">
              <label htmlFor="join-name" className={LABEL}>Your name</label>
              <input
                id="join-name"
                ref={nameRef}
                className={FIELD}
                value={name}
                onChange={(e) => { setName(e.target.value); setNameError(null); }}
                placeholder="First name, or what students call you"
                autoComplete="name"
                autoFocus
                maxLength={80}
                aria-invalid={!!nameError}
                aria-describedby={nameError ? "join-name-error" : undefined}
              />
              <div className="mt-1.5"><ErrorLine id="join-name-error">{nameError}</ErrorLine></div>
            </div>
            <div className="flex flex-col gap-4 border-t border-slate-800 pt-5 metal-rule">
              <EmailUpdatesBox checked={emails} onChange={setEmails} where="account" />
              <div className="flex flex-col gap-1.5">
                <label className="flex items-start gap-3 text-sm">
                  <input
                    ref={termsRef}
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 shrink-0 accent-sky-400"
                    checked={terms}
                    onChange={(e) => { setTerms(e.target.checked); setTermsError(null); }}
                    aria-invalid={!!termsError}
                    aria-describedby={termsError ? "join-terms-error" : undefined}
                  />
                  <span className="text-slate-200">
                    I agree to the{" "}
                    <Link href="/terms" target="_blank" className="text-sky-300 underline decoration-sky-500/40 underline-offset-4 hover:text-sky-200">terms of use</Link>
                  </span>
                </label>
                <ErrorLine id="join-terms-error">{termsError}</ErrorLine>
              </div>
            </div>
          </>
        )}

        <ErrorLine>{error}</ErrorLine>
        <button type="submit" disabled={busy} className={PRIMARY}>{busy ? "Joining…" : "Join as a teacher"}</button>
      </form>
    </Card>
  );
}
