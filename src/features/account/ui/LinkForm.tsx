"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import type { SignupRole } from "../model";
import { Card, ErrorLine, FIELD, GoogleButton, LABEL, LINK, OrLine, PRIMARY, errorOf, send } from "./parts";

/** Why Google sent the person back to /login without signing in (`?error=`, set by the callback route). */
const GOOGLE_ERRORS: Record<string, string> = {
  "google-off": "Log in with Google isn't set up on this site yet. Use your email below.",
  "google-cancelled": "You left Google before it finished, so you are not logged in.",
  "google-unverified": "Google hasn't checked this email address yet. Use your email below.",
  google: "Log in with Google didn't finish. Try again, or use your email below.",
};

type State = { kind: "idle" } | { kind: "sending" } | { kind: "error"; message: string } | { kind: "sent"; email: string; devLink: string | null };

/**
 * /login, /register (students) and /register/teacher: one form that mails a link, and "Continue with Google" when the site
 * has Google's keys. A `role` makes it the create-account form for that role, with the name; the role comes from the
 * address, and Google takes it with it, so a new person needs no second form.
 */
export default function LinkForm({ role, google, next, error }: { role?: SignupRole; google: boolean; next: string | null; error?: string }) {
  const register = !!role;
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [state, setState] = useState<State>(error && GOOGLE_ERRORS[error] ? { kind: "error", message: GOOGLE_ERRORS[error] } : { kind: "idle" });
  const other = `${register ? "/login" : "/register"}${next ? `?next=${encodeURIComponent(next)}` : ""}`;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setState({ kind: "sending" });
    const r = await send("/api/auth/email-link", "POST", register ? { email, register: true, name, role, next } : { email, next });
    if (!r.ok) return setState({ kind: "error", message: errorOf(r) });
    setState({ kind: "sent", email: String(r.body.email ?? email), devLink: typeof r.body.devLink === "string" ? r.body.devLink : null });
  };

  if (state.kind === "sent") {
    return (
      <Card>
        <div role="status">
          <h2 className="text-base font-semibold text-slate-100">Check your email</h2>
          <p className="mt-1 text-sm text-slate-300">
            We sent a link to <strong className="text-slate-100">{state.email}</strong>. Open it on this device to {register ? "create your account" : "log in"}. The link works for 20 minutes.
          </p>
          <p className="mt-2 text-xs text-slate-500">No email after a minute? Look in the spam folder, or send a new link.</p>
        </div>
        {state.devLink && (
          <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
            Development: no email was sent, because RESEND_API_KEY is not set.{" "}
            <a className={LINK} href={state.devLink}>Open the link</a>
          </p>
        )}
        <button type="button" className={`${LINK} self-start text-sm`} onClick={() => setState({ kind: "idle" })}>Send a new link</button>
      </Card>
    );
  }

  return (
    <Card>
      {role && (
        <Link className={`${LINK} self-end text-sm`} href={`${role === "student" ? "/register/teacher" : "/register"}${next ? `?next=${encodeURIComponent(next)}` : ""}`}>
          {role === "student" ? "Are you a teacher? Register here" : "Are you a student? Register here"} <span aria-hidden>→</span>
        </Link>
      )}
      <form noValidate onSubmit={(e) => void submit(e)} className="flex flex-col gap-4">
        {register && (
          <label>
            <span className={LABEL}>Name</span>
            <input className={FIELD} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={80} />
          </label>
        )}
        <label>
          <span className={LABEL}>Email</span>
          <input className={FIELD} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="you@example.com" />
        </label>
        <ErrorLine>{state.kind === "error" ? state.message : null}</ErrorLine>
        <button type="submit" disabled={state.kind === "sending"} className={PRIMARY}>
          {state.kind === "sending" ? "Sending…" : register ? "Create account" : "Email me a log-in link"}
        </button>
        <p className="text-xs text-slate-500">No password. We email you a link, and opening it {register ? "creates your account" : "logs you in"}.</p>
      </form>
      {google && (
        <>
          <OrLine />
          <GoogleButton role={role ?? null} next={next} />
        </>
      )}
      <p className="text-sm text-slate-400">
        {register ? "Already have an account? " : "New here? "}
        <Link className={LINK} href={other}>{register ? "Log in" : "Create account"}</Link>
      </p>
    </Card>
  );
}
