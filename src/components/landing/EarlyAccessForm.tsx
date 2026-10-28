"use client";

import { useState, type FormEvent } from "react";
import posthog from "posthog-js";
import Icon from "@/components/Icon";
import type { Interest } from "@/features/earlyAccess/signup";

const CHOICES: { id: Interest; label: string }[] = [
  { id: "basic-course", label: "The basic course" },
  { id: "style-courses", label: "Style courses" },
  { id: "private-lessons", label: "Private lessons" },
  { id: "songs-by-mode", label: "Songs by mode" },
];

type State = { kind: "idle" } | { kind: "sending" } | { kind: "done" } | { kind: "error"; message: string };

/**
 * Email plus what the player wants first, posted to /api/early-access. `source` names the section the form sits in; a compact form
 * hides the choices and sends `initial` (a teacher's form sends "teaching"). `cta` and `done` let a section word it its own way.
 */
export default function EarlyAccessForm({ source, compact = false, initial = ["basic-course"], cta = "Get early access", done = "We'll email you once when early access opens, with the early-adopter offer. Meanwhile, every tool on this page is free to use." }: { source: string; compact?: boolean; initial?: Interest[]; cta?: string; done?: string }) {
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [interests, setInterests] = useState<Interest[]>(initial);
  const [state, setState] = useState<State>({ kind: "idle" });

  const toggle = (id: Interest) => setInterests((xs) => (xs.includes(id) ? xs.filter((x) => x !== id) : [...xs, id]));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setState({ kind: "sending" });
    try {
      const res = await fetch("/api/early-access", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, interests, source, website }) });
      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        posthog.capture("early_access_requested", { source, interests });
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
          <b className="block text-emerald-50">You&apos;re on the list.</b>
          {done}
        </span>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      {!compact && (
        <fieldset className="flex flex-wrap gap-1.5">
          <legend className="mb-2 text-xs text-slate-400">What do you want first?</legend>
          {CHOICES.map((c) => {
            const on = interests.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(c.id)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition ${on ? "border-sky-400 bg-sky-500/20 text-sky-100" : "border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200"}`}
              >
                {on && <Icon name="check" size={12} />}
                {c.label}
              </button>
            );
          })}
        </fieldset>
      )}
      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="sr-only" htmlFor={`ea-${source}`}>Email</label>
        <input
          id={`ea-${source}`}
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-400 focus:outline-none"
        />
        {/* people never see this; bots fill it in */}
        <input type="text" tabIndex={-1} autoComplete="off" aria-hidden value={website} onChange={(e) => setWebsite(e.target.value)} name="website" className="hidden" />
        <button
          type="submit"
          disabled={state.kind === "sending"}
          className="ls-btn ls-btn-primary inline-flex items-center justify-center gap-2 rounded-xl bg-sky-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-300 disabled:opacity-60"
        >
          {state.kind === "sending" ? "Joining…" : cta}
          <Icon name="chevron-right" size={16} />
        </button>
      </div>
      {state.kind === "error" ? (
        <p role="alert" className="text-xs text-rose-300">{state.message}</p>
      ) : (
        <p className="text-xs text-slate-500">One email when it opens. No spam, unsubscribe any time.</p>
      )}
    </form>
  );
}
