"use client";

import { useState, type FormEvent } from "react";
import { Card, ErrorLine, FIELD, GoogleButton, LABEL, LINK, OrLine, PRIMARY, errorOf, send } from "./parts";

/** Why Google sent the person back to /login without signing in (`?error=`, set by the callback route). */
const GOOGLE_ERRORS: Record<string, string> = {
  "google-off": "Log in with Google isn't set up on this site yet. Use your email below.",
  "google-cancelled": "You left Google before it finished, so you are not logged in.",
  "google-unverified": "Google hasn't checked this email address yet. Use your email below.",
  google: "Log in with Google didn't finish. Try again, or use your email below.",
};

type State =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "error"; message: string }
  | { kind: "sent"; email: string; lasts: string; devLink: string | null; devCode: string | null; devError: string | null };

/**
 * /login: the one way in. A form that mails a link and a 6-digit code (then a field for the code), and "Continue with Google" when the site has Google's keys. There
 * is no separate register form: an email or a Google account with no account yet goes on to the account setup.
 */
export default function LinkForm({ google, next, error }: { google: boolean; next: string | null; error?: string }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<State>(error && GOOGLE_ERRORS[error] ? { kind: "error", message: GOOGLE_ERRORS[error] } : { kind: "idle" });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setState({ kind: "sending" });
    const r = await send("/api/auth/email-link", "POST", { email, next });
    if (!r.ok) return setState({ kind: "error", message: errorOf(r) });
    const text = (v: unknown) => (typeof v === "string" ? v : null);
    setState({ kind: "sent", email: String(r.body.email ?? email), lasts: text(r.body.lasts) ?? "1 hour", devLink: text(r.body.devLink), devCode: text(r.body.devCode), devError: text(r.body.devError) });
  };

  if (state.kind === "sent") {
    return (
      <Card>
        <div role="status">
          <h2 className="text-base font-semibold text-slate-100">Check your email</h2>
          <p className="mt-1 text-sm text-slate-300">
            We sent a link and a code to <strong className="text-slate-100">{state.email}</strong>. Open the link, or type the code below. Both work for {state.lasts}.
          </p>
          <p className="mt-2 text-xs text-slate-500">No email after a minute? Look in the spam folder, or send a new email.</p>
        </div>
        {state.devLink && (
          <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
            {state.devError ? `Development: the email wasn't sent. Resend said: ${state.devError}` : "Development: no email was sent, because RESEND_API_KEY is not set."}{" "}
            The code is {state.devCode}. <a className={LINK} href={state.devLink}>Open the link</a>
          </p>
        )}
        <CodeForm email={state.email} />
        <button type="button" className={`${LINK} self-start text-sm`} onClick={() => setState({ kind: "idle" })}>Send a new email</button>
      </Card>
    );
  }

  return (
    <Card>
      <form noValidate onSubmit={(e) => void submit(e)} className="flex flex-col gap-4">
        <label>
          <span className={LABEL}>Email</span>
          <input className={FIELD} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="you@example.com" />
        </label>
        <ErrorLine>{state.kind === "error" ? state.message : null}</ErrorLine>
        <button type="submit" disabled={state.kind === "sending"} className={PRIMARY}>
          {state.kind === "sending" ? "Sending…" : "Email me a log-in link"}
        </button>
        <p className="text-xs text-slate-500">No password. We email you a link and a code, and either one logs you in.</p>
      </form>
      {google && (
        <>
          <OrLine />
          <GoogleButton next={next} />
        </>
      )}
    </Card>
  );
}

/** The 6-digit code from the email, typed on this page: it logs in here even when the email was opened on another device. */
function CodeForm({ email }: { email: string }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const r = await send("/api/auth/email-code", "POST", { email, code });
    if (r.ok && typeof r.body.redirect === "string") return window.location.assign(r.body.redirect);
    setBusy(false);
    setError(errorOf(r));
  };

  return (
    <form noValidate onSubmit={(e) => void submit(e)} className="flex flex-col gap-4">
      <label>
        <span className={LABEL}>Code</span>
        <input
          className={`${FIELD} font-mono tracking-[0.3em]`}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/[^\d]/g, "").slice(0, 6))}
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="123456"
        />
      </label>
      <ErrorLine>{error}</ErrorLine>
      <button type="submit" disabled={busy || code.length !== 6} className={PRIMARY}>
        {busy ? "One moment…" : "Log in"}
      </button>
    </form>
  );
}
