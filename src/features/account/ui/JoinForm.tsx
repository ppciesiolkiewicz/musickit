"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import { confetti } from "@/components/confetti";
import { studentsLabel } from "../plans";
import { joinHref } from "../loginGuard";
import { useAccount } from "../useAccount";
import JoinSetup from "./JoinSetup";
import LinkForm from "./LinkForm";
import type { InviteKind } from "../emailHtml";
import { Card, ErrorLine, LINK, PRIMARY, SECONDARY, errorOf, send, type Posted } from "./parts";

type View = {
  state: "open" | "yours" | "used" | "not-found" | "ended";
  kind: InviteKind | null;
  plan: { name: string; students: number | null } | null;
  /** Who we made the invite for (its note on /admin/admin/invites), if we said. */
  name: string | null;
  /** how many days the plan is free for: a join code's (`/join/INDIEAPPCIRCLE`); null for an invite */
  days: number | null;
  /** false for a visitor who isn't logged in: the page logs them in itself */
  signedIn: boolean;
  needsSetup: boolean;
  taught: boolean;
};

/** Where each kind of invite goes once joined, and the button that goes there now. */
const AFTER: Record<InviteKind, { href: string; open: string; opening: string }> = {
  teacher: { href: "/students", open: "Open Students", opening: "Opening Students" },
  personal: { href: "/plan", open: "Open your plan", opening: "Opening your plan" },
};

/** How many seconds "You're in!" stays, counting down, before /students opens by itself (Open Students skips it). */
const CELEBRATE_SECONDS = 8;

const NOTICES = {
  used: { title: "This invite has already been used", text: "Someone already joined with this link. Send us a message and we'll get you a fresh one." },
  "not-found": { title: "Hmm, this invite link doesn't work", text: "It may be mistyped or cut short. Check the link, or send us a message and we'll get you a new one." },
  ended: { title: "Your free days with this code are over", text: "This account already joined with this code. Choose a plan to keep using attunr." },
  taught: { title: "This account can't use this invite", text: "It belongs to a teacher's class. Log out, then open the link again and log in with another email." },
} as const;

/** The page title: a new account that just logged in here is being set up, not invited any more. */
export function JoinTitle() {
  const { account } = useAccount();
  return <>{account?.needsSetup ? "Setting up your account" : "You've been invited to a free attunr account"}</>;
}

/**
 * A personal invite works the same up to logging in, then: a new account sets itself up here (`JoinSetup`: name, email
 * updates, the voice-care box) instead of joining by itself, and everyone lands on /plan, not /students.
 *
 * A teacher invite (`/join/<token>`, made on /admin/admin/invites). A visitor who isn't logged in sees the invite and logs in
 * on the page (the /login form, `LinkForm`), agreeing to the terms by doing so, and comes back here. A new account (no
 * plan yet, so /account/setup is skipped) then joins by itself (user, 2026-11-19): named from the invite's note, else
 * its own name, terms agreed, no email updates, while the page shows the plan it gets. An account that is already set
 * up sees what the plan gives and joins with Join as a teacher, since joining moves it off its plan. Either way
 * `POST /api/join/<token>`, then /students loads afresh, since the role changed. A used or unknown link, or a student of
 * a teacher, gets a notice instead. Warmer and more excited than the rest of the app on purpose (user, 2026-11-19):
 * confetti when a usable invite opens and again on joining, with "You're in!" counting down `CELEBRATE_SECONDS` before
 * /students opens by itself (user, 2026-11-19: long enough to read), and Open Students to go now.
 */
export default function JoinForm({ token, google, tours }: {
  token: string;
  google: boolean;
  /** a quick tour for each kind of invite, drawn under the invite once its kind is read (the page passes them in: this folder imports no feature) */
  tours?: Partial<Record<InviteKind, ReactNode>>;
}) {
  const api = `/api/join/${encodeURIComponent(token)}`;
  const [view, setView] = useState<View | null>(null);
  const { account, loaded } = useAccount();
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [joined, setJoined] = useState(false);
  const [left, setLeft] = useState(CELEBRATE_SECONDS);
  const cheered = useRef(false);
  const autoJoined = useRef(false);

  const show = useCallback((r: Posted) => {
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

  const kind: InviteKind = view?.kind ?? "teacher";
  const after = AFTER[kind];
  // the tour waits for the invite to be read, so a personal invite never flashes the teachers' one
  const tour = view ? tours?.[kind] : undefined;
  // under the invite on a phone; beside it on a wide screen, the invite on the left, the tour taking the rest
  const withTour = (card: ReactNode) => (tour
    ? (
      <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-8 lg:max-w-6xl lg:flex-row lg:items-start">
        <div className="w-full lg:w-[28rem] lg:shrink-0">{card}</div>
        <div className="w-full lg:min-w-0 lg:flex-1">{tour}</div>
      </div>
    )
    : card);
  const usable = view?.state === "open" && !view.taught;
  // a new account that just logged in here: on a teacher invite it joins by itself, no second step; on a personal one it sets up first
  const settingUp = usable && view.signedIn && view.needsSetup;
  const personalSetup = settingUp && kind === "personal";
  // one burst when an invite that can be used opens: it's good news (the one on joining follows soon for a new account)
  const inviting = usable && !settingUp;
  useEffect(() => {
    if (!inviting || cheered.current) return;
    cheered.current = true;
    confetti({ count: 90, origin: { x: 0.5, y: 0.25 } });
  }, [inviting]);

  // a new account is named from the invite's note, else the name it has (Google's, or its email's first part)
  const setupName = view?.name || account?.name || "";
  const post = useCallback(async (body: Record<string, unknown>) => {
    setError(null);
    setBusy(true);
    const r = await send(api, "POST", body);
    // logged out in another tab: the page shows the log-in instead
    if (r.status === 401) return window.location.reload();
    // a full page load: the role changed, and every useAccount() reads it once per page
    if (r.ok) {
      setJoined(true);
      confetti({ count: 180, origin: { x: 0.5, y: 0.45 } });
      return;
    }
    setBusy(false);
    if (r.status === 404 || r.status === 410) void send(api, "GET").then(show);
    else setError(errorOf(r));
  }, [api, show]);
  // the terms were agreed under the log-in form; email updates stay off until they ask for them on /account
  const setUp = useCallback(() => post({ name: setupName, acceptTerms: true, emailUpdates: false }), [post, setupName]);

  useEffect(() => {
    if (!settingUp || personalSetup || autoJoined.current || !setupName) return;
    autoJoined.current = true;
    void setUp();
  }, [settingUp, personalSetup, setupName, setUp]);

  // "You're in!" counts down, then /students opens by itself
  useEffect(() => {
    if (!joined) return;
    if (left <= 0) return window.location.replace(after.href);
    const t = window.setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [joined, left, after.href]);

  const join = (e: FormEvent) => {
    e.preventDefault();
    if (view) void post({}); // the button waits for the invite to be read
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
  const notice = !view ? null : view.state === "used" || view.state === "not-found" || view.state === "ended" ? NOTICES[view.state] : view.state === "open" && view.taught ? NOTICES.taught : null;
  if (notice) {
    return (
      <Card className="mx-auto">
        <div role="alert" className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-slate-100">{notice.title}</h2>
          <p className="text-sm leading-relaxed text-slate-400">{notice.text}</p>
        </div>
        {notice === NOTICES.ended
          ? <Link href="/account/setup" className={PRIMARY}>Choose a plan<Icon name="chevron-right" size={16} /></Link>
          : notice !== NOTICES.taught && <Link href="/feedback" className={SECONDARY}>Send us a message</Link>}
      </Card>
    );
  }
  if (view?.state === "yours" && !view.needsSetup) {
    return (
      <Card className="mx-auto">
        <Badge icon="check" />
        <div className="flex flex-col gap-1.5 text-center">
          <h2 className="text-xl font-semibold text-slate-100">You&apos;re already in</h2>
          <p className="text-sm leading-relaxed text-slate-400">Your account is on the {view.plan?.name} plan.{kind === "teacher" ? " Your students are waiting." : ""}</p>
        </div>
        <Link href={after.href} className={PRIMARY}>{after.open}<Icon name="chevron-right" size={16} /></Link>
      </Card>
    );
  }

  if (joined) {
    return (
      <Card className="mx-auto">
        <div role="status" className="flex flex-col items-center gap-4 py-4 text-center">
          <Badge icon="sparkles" />
          <h2 className="text-2xl font-semibold text-slate-100">You&apos;re in!</h2>
          <p className="text-sm leading-relaxed text-slate-300">Welcome to attunr. Thank you for joining us.</p>
          <p aria-live="off" className="text-xs text-slate-500">{after.opening} in {left}…</p>
        </div>
        <button type="button" onClick={() => window.location.replace(after.href)} className={PRIMARY}>{after.open} now<Icon name="chevron-right" size={16} /></button>
      </Card>
    );
  }

  // the session read usually answers first (the nav asked already), so the right form shows from the start
  const signedOut = view ? !view.signedIn : loaded && !account;
  // greeted by the name we wrote on the invite, else a set-up account's own
  const greetName = (view?.name ?? (signedOut ? "" : account?.name) ?? "").trim();
  const hello = greetName ? `Hello, ${greetName}` : "Hello there";
  const students = view?.plan ? studentsLabel(view.plan) : null;
  const free = view?.days ? `Free for ${view.days} days. No card needed` : "Free for a year with this invite. No card needed";
  const perks = (kind === "personal"
    ? [
        { icon: "sparkles" as const, text: view ? `A practice plan made for you, on the ${view.plan?.name} plan` : undefined },
        { icon: "graduation-cap" as const, text: "A few short exercises each day, for your instrument or your voice" },
        { icon: "check" as const, text: free },
      ]
    : [
        { icon: "graduation-cap" as const, text: view ? (students ? `${students}, on the ${view.plan?.name} plan` : null) : undefined },
        { icon: "sparkles" as const, text: "Every student you add gets an account and a plan for their first week" },
        { icon: "check" as const, text: free },
      ]
  ).filter((p) => p.text !== null);
  const perkList = (
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
  );

  if (personalSetup) {
    return withTour(
      <Card className="mx-auto">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <Badge icon="sparkles" />
            <h2 className="text-xl font-semibold text-slate-100">{hello}</h2>
            <p className="text-sm leading-relaxed text-slate-400">Tell us your name, then your plan opens.</p>
          </div>
          {perkList}
          <JoinSetup startName={setupName} busy={busy} error={error} onSave={(input) => void post({ ...input, acceptTerms: true })} />
        </div>
      </Card>
    );
  }

  if (settingUp || (!view && loaded && account?.needsSetup)) {
    return (
      <Card className="mx-auto">
        <div className="flex flex-col gap-6">
          <div role="status" className="flex flex-col items-center gap-3 text-center">
            <Badge icon="sparkles" />
            <h2 className="text-xl font-semibold text-slate-100">{error ? "Your account isn't set up yet" : "One moment…"}</h2>
            {!error && <p className="text-sm leading-relaxed text-slate-400">We&apos;re putting your account on the {view?.plan?.name ?? "teacher"} plan.</p>}
          </div>
          {perkList}
          <ErrorLine>{error}</ErrorLine>
          {error && <button type="button" disabled={busy} onClick={() => void setUp()} className={PRIMARY}>{busy ? "Setting up…" : "Try again"}</button>}
        </div>
      </Card>
    );
  }

  const invite = (
    <>
      <div className="flex flex-col items-center gap-3 text-center">
        <Badge icon="sparkles" />
        <h2 className="text-2xl font-semibold leading-tight text-slate-100 sm:text-[1.7rem]">{hello}</h2>
        <p className="text-sm leading-relaxed text-slate-300">
          {kind === "personal"
            ? <>We&apos;d love to have you practising here. Join, and attunr puts together a plan for you from day one.</>
            : <>We&apos;d love to have you teaching here. Join, add your students, and attunr gets each of them practising from day one.</>}
        </p>
      </div>

      {perkList}
    </>
  );

  if (signedOut) {
    return withTour(
      <Card className="mx-auto">
        <div className="flex flex-col gap-6">
          {invite}
          <div className="flex flex-col gap-4 border-t border-slate-800 pt-5 metal-rule">
            <div className="flex flex-col gap-1">
              <h3 className="text-base font-semibold text-slate-100">First, log in</h3>
              <p className="text-sm leading-relaxed text-slate-400">
                {kind === "personal"
                  ? "Use your email or Google. If you're new, this also creates your account, and you set it up next."
                  : "Use your email or Google. If you're new, this also creates your account, and you join straight away."}
              </p>
            </div>
            <LinkForm google={google} next={joinHref(token)} bare />
            <p className="text-xs leading-relaxed text-slate-500">
              By logging in, you agree to the{" "}
              <Link href="/terms" target="_blank" className={LINK}>terms of use</Link>. The{" "}
              <Link href="/privacy" target="_blank" className={LINK}>privacy policy</Link> says what we keep about you.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return withTour(
    <Card className="mx-auto">
      <form noValidate onSubmit={(e) => void join(e)} className="flex flex-col gap-6">
        {invite}
        <p className="flex items-start gap-2 text-xs leading-relaxed text-slate-400">
          <Icon name="info" size={14} className="mt-px shrink-0" />
          Joining moves your account off the plan it&apos;s on now.
        </p>

        <ErrorLine>{error}</ErrorLine>
        <button type="submit" disabled={busy || !view} className={PRIMARY}>{busy ? "Joining…" : <>{kind === "personal" ? "Join" : "Join as a teacher"}<Icon name="chevron-right" size={16} /></>}</button>
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
