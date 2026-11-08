"use client";

import { useState, type FormEvent } from "react";
import posthog from "posthog-js";
import Icon from "@/components/Icon";

type State = { kind: "idle" } | { kind: "sending" } | { kind: "done" } | { kind: "error"; message: string };

/** Email plus a message that starts prefilled (the visitor can edit it), posted to /api/contact. `source` names the section the form sits in. */
export default function ContactForm({ source, initialMessage, cta = "Send message", done = "Thanks! We'll reply by email.", note = "We only use your email to reply." }: { source: string; initialMessage: string; cta?: string; done?: string; note?: string }) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState(initialMessage);
  const [website, setWebsite] = useState("");
  const [state, setState] = useState<State>({ kind: "idle" });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setState({ kind: "sending" });
    try {
      const res = await fetch("/api/contact", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, message, source, website }) });
      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        posthog.capture("contact_sent", { source });
        setState({ kind: "done" });
      } else {
        setState({ kind: "error", message: body.error ?? "Something went wrong. Please try again." });
      }
    } catch {
      setState({ kind: "error", message: "Couldn't reach the server. Check your connection and try again." });
    }
  };

  if (state.kind === "done") {
    return (
      <div role="status" className="landing-fade flex items-start gap-3 rounded-2xl border border-emerald-500/50 bg-emerald-500/10 p-4 text-sm text-emerald-100">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-slate-950">
          <Icon name="check" size={16} />
        </span>
        <span>
          <b className="block text-emerald-50">Message sent.</b>
          {done}
        </span>
      </div>
    );
  }

  const field = "min-w-0 rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-400 focus:outline-none";
  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <label className="sr-only" htmlFor={`cf-email-${source}`}>Your email</label>
      <input id={`cf-email-${source}`} type="email" required autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className={field} />
      <label className="sr-only" htmlFor={`cf-msg-${source}`}>Message</label>
      <textarea id={`cf-msg-${source}`} required rows={5} maxLength={4000} value={message} onChange={(e) => setMessage(e.target.value)} className={`${field} resize-y`} />
      {/* people never see this; bots fill it in */}
      <input type="text" tabIndex={-1} autoComplete="off" aria-hidden value={website} onChange={(e) => setWebsite(e.target.value)} name="website" className="hidden" />
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={state.kind === "sending"} className="ls-btn ls-btn-primary inline-flex items-center justify-center gap-2 rounded-xl bg-sky-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-300 disabled:opacity-60">
          {state.kind === "sending" ? "Sending…" : cta}
          <Icon name="chevron-right" size={16} />
        </button>
        {state.kind === "error" ? <p role="alert" className="text-xs text-rose-300">{state.message}</p> : <p className="text-xs text-slate-500">{note}</p>}
      </div>
    </form>
  );
}
