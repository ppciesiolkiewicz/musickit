"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import { confetti } from "@/components/confetti";
import { studentsLabel } from "../plans";
import { joinHref } from "../loginGuard";
import { useAccount } from "../useAccount";
import { EmailUpdatesBox } from "./EmailUpdates";
import LinkForm from "./LinkForm";
import { Card, ErrorLine, FIELD, LABEL, PRIMARY, SECONDARY, errorOf, send, type Posted } from "./parts";

type View = {
  state: "open" | "yours" | "used" | "not-found";
  plan: { name: string; students: number | null } | null;
  /** Who we made the invite for (its note on /admin/invites), if we said. */
  name: string | null;
  /** false for a visitor who isn't logged in: the page logs them in itself */
  signedIn: boolean;
  needsSetup: boolean;
  taught: boolean;
};

/** Where a teacher goes once they joined. */
const AFTER_JOIN = "/students";

/** How long "You're in" and its confetti stay before /students opens. */
const CELEBRATE_MS = 1600;

const NOTICES = {
  used: { title: "This invite has already been used", text: "Someone already joined with this link. Send us a message and we'll get you a fresh one." },
  "not-found": { title: "Hmm, this invite link doesn't work", text: "It may be mistyped or cut short. Check the link, or send us a message and we'll get you a new one." },
  taught: { title: "This account can't join as a teacher", text: "It belongs to a teacher's class. Log out, then open the link again and log in with another email." },
} as const;

/**
 * A teacher invite (`/join/<token>`, made on /admin/invites). A visitor who isn't logged in sees the invite and logs in
 * on the page (the /login form, `LinkForm`), coming back here. A signed-in person sees what the plan gives and
 * joins with Join as a teacher (`POST /api/join/<token>`), then loads /students afresh, since the role changed. A new
 * account (no plan yet) gives its name and agrees to the terms here, as on /account/setup, which it skips. A used or
 * unknown link, or a student of a teacher, gets a notice instead. Warmer and more excited than the rest of the app on
 * purpose (user, 2026-11-19): confetti when a usable invite opens and again on joining, with "You're in!" shown for
 * `CELEBRATE_MS` before /students opens.
 */
export default function JoinForm({ token, google }: { token: string; google: boolean }) {
  const api = `/api/join/${encodeURIComponent(token)}`;
  const [view, setView] = useState<View | null>(null);
  const { account, loaded } = useAccount();
  const [loadError, setLoadError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [terms, setTerms] = useState(false);
  const [termsError, setTermsError] = useState<string | null>(null);
  const [emails, setEmails] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [joined, setJoined] = useState(false);
  const cheered = useRef(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const termsRef = useRef<HTMLInputElement>(null);

  const show = useCallback((r: Posted) => {
    if (!r.ok) return setLoadError(errorOf(r));
    setLoadError(null);
    const v = r.body as unknown as View;
    setView(v);
    // a new account starts with the name we wrote on the invite; it can change it
    if (v.needsSetup && v.name) setName((typed) => typed || v.name || "");
  }, []);
  const load = () => send(api, "GET").then(show);

  useEffect(() => {
    let live = true;
    void send(api, "GET").then((r) => live && show(r));
    return () => void (live = false);
  }, [api, show]);

  // one burst when an invite that can be used opens: it's good news
  const inviting = view?.state === "open" && !view.taught;
  useEffect(() => {
    if (!inviting || cheered.current) return;
    cheered.current = true;
    confetti({ count: 90, origin: { x: 0.5, y: 0.25 } });
  }, [inviting]);

  const join = async (e: FormEvent) => {
    e.preventDefault();
    if (!view) return; // the button waits for the invite to be read
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
    // logged out in another tab: the page shows the log-in instead
    if (r.status === 401) return window.location.reload();
    // a full page load: the role changed, and every useAccount() reads it once per page
    if (r.ok) {
      setJoined(true);
      confetti({ count: 180, origin: { x: 0.5, y: 0.45 } });
      window.setTimeout(() => window.location.replace(AFTER_JOIN), CELEBRATE_MS);
      return;
    }
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
  // Before the invite is read the page shows it as usable: almost every link is. Only the plan line and the button wait;
  // a used or unknown link swaps to its notice when the answer comes.
  const notice = !view ? null : view.state === "used" || view.state === "not-found" ? NOTICES[view.state] : view.state === "open" && view.taught ? NOTICES.taught : null;
  if (notice) {
    return (
      <Card className="mx-auto">
        <div role="alert" className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-slate-100">{notice.title}</h2>
          <p className="text-sm leading-relaxed text-slate-400">{notice.text}</p>
        </div>
        {notice !== NOTICES.taught && <Link href="/feedback" className={SECONDARY}>Send us a message</Link>}
      </Card>
    );
  }
  if (view?.state === "yours" && !view.needsSetup) {
    return (
      <Card className="mx-auto">
        <Badge icon="check" />
        <div className="flex flex-col gap-1.5 text-center">
          <h2 className="text-xl font-semibold text-slate-100">You&apos;re already in</h2>
          <p className="text-sm leading-relaxed text-slate-400">Your account is on the {view.plan?.name} plan. Your students are waiting.</p>
        </div>
        <Link href={AFTER_JOIN} className={PRIMARY}>Open Students<Icon name="chevron-right" size={16} /></Link>
      </Card>
    );
  }

  if (joined) {
    return (
      <Card className="mx-auto">
        <div role="status" className="flex flex-col items-center gap-4 py-4 text-center">
          <Badge icon="sparkles" />
          <h2 className="text-2xl font-semibold text-slate-100">You&apos;re in!</h2>
          <p className="text-sm leading-relaxed text-slate-300">Welcome to attunr. Taking you to your students…</p>
        </div>
      </Card>
    );
  }

  // the session read usually answers first (the nav asked already), so the right form shows from the start
  const signedOut = view ? !view.signedIn : loaded && !account;
  const needsSetup = view?.needsSetup ?? account?.needsSetup ?? false;
  // greeted by the name we wrote on the invite; a new account's stored name is only its email's first part, so it is
  // greeted by the name it types (which starts as the invite's)
  const greetName = (needsSetup ? name : view?.name ?? (signedOut ? "" : account?.name) ?? "").trim();
  const hello = greetName ? `Hello, ${greetName}` : "Hello there";
  const students = view?.plan ? studentsLabel(view.plan) : null;
  const perks = [
    { icon: "graduation-cap" as const, text: view ? (students ? `${students}, on the ${view.plan?.name} plan` : null) : undefined },
    { icon: "sparkles" as const, text: "Every student you add gets an account and a plan for their first week" },
    { icon: "check" as const, text: "Free for a year with this invite. No card needed" },
  ].filter((p) => p.text !== null);
  const invite = (
    <>
      <div className="flex flex-col items-center gap-3 text-center">
        <Badge icon="sparkles" />
        <h2 className="text-2xl font-semibold leading-tight text-slate-100 sm:text-[1.7rem]">{hello}</h2>
        <p className="text-sm leading-relaxed text-slate-300">
          We&apos;d love to have you teaching here. Join, add your students, and attunr gets each of them practising from day one.
        </p>
      </div>

      <ul className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-950/40 p-4">
        {perks.map((p) => (
          <li key={p.icon} className="flex items-start gap-3 text-sm leading-snug text-slate-200">
            <span className="mt-px flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-400/15 text-sky-300">
              <Icon name={p.icon} size={14} />
            </span>
            {p.text === undefined ? (
              <span aria-hidden className="mt-1 h-3.5 w-3/4 animate-pulse rounded-full bg-slate-700/60" />
            ) : (
              <span className="pt-0.5">{p.text}</span>
            )}
          </li>
        ))}
      </ul>
    </>
  );

  if (signedOut) {
    return (
      <Card className="mx-auto">
        <div className="flex flex-col gap-6">
          {invite}
          <div className="flex flex-col gap-4 border-t border-slate-800 pt-5 metal-rule">
            <div className="flex flex-col gap-1">
              <h3 className="text-base font-semibold text-slate-100">First, log in</h3>
              <p className="text-sm leading-relaxed text-slate-400">Use your email or Google. If you&apos;re new, this also creates your account. Then you come back here to join.</p>
            </div>
            <LinkForm google={google} next={joinHref(token)} bare />
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="mx-auto">
      <form noValidate onSubmit={(e) => void join(e)} className="flex flex-col gap-6">
        {invite}
        {!needsSetup && (
          <p className="flex items-start gap-2 text-xs leading-relaxed text-slate-400">
            <Icon name="info" size={14} className="mt-px shrink-0" />
            Joining moves your account off the plan it&apos;s on now.
          </p>
        )}

        {needsSetup && (
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
        <button type="submit" disabled={busy || !view} className={`${PRIMARY} btn-metal`}>{busy ? "Joining…" : <>Join as a teacher<Icon name="chevron-right" size={16} /></>}</button>
      </form>
    </Card>
  );
}

/** The round mark at the top of a card: a glowing accent disc with one icon. */
function Badge({ icon }: { icon: "sparkles" | "check" }) {
  return (
    <span aria-hidden className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-sky-400/15 text-sky-300 shadow-[0_0_32px_-4px] shadow-sky-400/50 ring-1 ring-sky-400/40">
      <Icon name={icon} size={26} />
    </span>
  );
}
