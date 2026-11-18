"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Card, ErrorLine, LINK, PRIMARY, SECONDARY } from "@/features/account/ui/parts";
import { useAccount } from "@/features/account/useAccount";
import { loginHref } from "@/lib/publicPaths";
import { fetchClaim, postClaim } from "../client";

/** What the claim page shows, drawn from this so tests draw every state without a server. */
export type ClaimState =
  | { kind: "loading" }
  /** the link is live: whose account it opens, who is logged in in this browser now (null: nobody), a press out, a failed press */
  | { kind: "ready"; name: string; signedInAs: string | null; sending: boolean; error: string | null }
  /** used or too old (410): the route's own line */
  | { kind: "gone"; error: string }
  /** the check itself failed (offline, a 5xx): its line, with Try again */
  | { kind: "failed"; error: string };

/** Where Log in goes from a dead link: their email already has the account, so the normal email link logs them in. */
const LOG_IN = loginHref("/plan");

/**
 * `/claim?token=`, the link mailed to a teacher's new student. The page's GET only reads whose account it is (an email
 * scanner's fetch must not use the link up); the button spends it, then the page loads where the route says
 * (`window.location.replace`, a full load: the stores are per session). A dead link says so, with Log in.
 */
export function ClaimLinkView({ state, onClaim, onRetry }: { state: ClaimState; onClaim: () => void; onRetry: () => void }) {
  return (
    <Card>
      {state.kind === "loading" && <p role="status" className="text-sm text-slate-300">Checking the link…</p>}
      {state.kind === "ready" && (
        <>
          <p className="text-base text-slate-100">This is {state.name}&apos;s attunr account. Your teacher made it for you.</p>
          {state.signedInAs !== null && (
            <p className="text-sm text-slate-400">
              You&apos;re logged in to {state.signedInAs}&apos;s account in this browser. Pressing Log in as {state.name} logs you out of it.
            </p>
          )}
          <button type="button" className={PRIMARY} onClick={onClaim} disabled={state.sending}>
            {state.sending ? "Logging you in…" : `Log in as ${state.name}`}
          </button>
          <ErrorLine>{state.error}</ErrorLine>
        </>
      )}
      {state.kind === "gone" && (
        <>
          <ErrorLine>{state.error}</ErrorLine>
          <Link className={`${LINK} text-sm`} href={LOG_IN}>Log in</Link>
        </>
      )}
      {state.kind === "failed" && (
        <>
          <ErrorLine>{state.error}</ErrorLine>
          <button type="button" className={SECONDARY} onClick={onRetry}>Try again</button>
        </>
      )}
    </Card>
  );
}

export default function ClaimLink({ token }: { token: string }) {
  const { account, loaded } = useAccount();
  const [state, setState] = useState<ClaimState>({ kind: "loading" });
  // the GET once per mount (React runs effects twice in development); Try again asks again
  const asked = useRef(false);

  const peek = useCallback(async () => {
    setState({ kind: "loading" });
    const r = await fetchClaim(token);
    if (r.ok) setState({ kind: "ready", name: r.name, signedInAs: null, sending: false, error: null });
    else setState(r.code === "gone" ? { kind: "gone", error: r.error } : { kind: "failed", error: r.error });
  }, [token]);

  useEffect(() => {
    if (asked.current) return;
    asked.current = true;
    void peek();
  }, [peek]);

  const claim = async () => {
    if (state.kind !== "ready" || state.sending) return;
    setState({ ...state, sending: true, error: null });
    const r = await postClaim(token);
    if (r.ok) return window.location.replace(r.next);
    setState(r.code === "gone" ? { kind: "gone", error: r.error } : { ...state, sending: false, error: r.error });
  };

  // who is logged in here now: the button waits for the session read, so it is said before the press, never after it
  const shown: ClaimState = state.kind !== "ready" ? state : loaded ? { ...state, signedInAs: account ? account.name : null } : { kind: "loading" };
  return <ClaimLinkView state={shown} onClaim={() => void claim()} onRetry={() => void peek()} />;
}
