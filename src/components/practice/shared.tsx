"use client";

import type { ReactNode } from "react";

/** Small pieces both practice games use. */
export const panel = "rounded-2xl border border-slate-800 bg-slate-900/40 p-4";
export const btn = "cursor-pointer rounded-lg border border-slate-600 bg-slate-800 px-3 py-1 text-sm text-slate-100 shadow-sm shadow-black/20 transition hover:border-slate-400 hover:bg-slate-700 active:scale-[0.97] disabled:opacity-40";
export const btnPrimary = "cursor-pointer rounded-lg border border-sky-400/80 bg-sky-500/25 px-4 py-1 text-sm font-semibold text-sky-50 shadow-md shadow-sky-500/20 transition hover:bg-sky-500/40 active:scale-[0.97]";

/** The hero panel a game plays in: a deeper card with a soft glow, so the question is what the eye lands on. */
export function Stage({ tone = "sky", children }: { tone?: "sky" | "amber" | "violet"; children: ReactNode }) {
  const glow = { sky: "var(--color-sky-400)", amber: "var(--color-amber-400)", violet: "var(--color-violet-400)" }[tone];
  return (
    <section className="relative isolate flex flex-col gap-4 overflow-hidden rounded-3xl border border-slate-700/70 bg-slate-900/60 p-4 shadow-lg shadow-black/20 sm:p-6">
      <div aria-hidden className="pointer-events-none absolute -right-24 -top-28 -z-10 h-80 w-80 rounded-full" style={{ background: `radial-gradient(closest-side, color-mix(in oklab, ${glow} 22%, transparent), transparent)` }} />
      {children}
    </section>
  );
}

/** A score in the stage's corner: a small label over a big number. */
export function Stat({ label, value, tone = "text-slate-50" }: { label: string; value: ReactNode; tone?: string }) {
  return (
    <div className="flex min-w-16 flex-col items-center rounded-xl border border-slate-700/60 bg-slate-950/40 px-3 py-1.5">
      <span className={`text-xl font-semibold tabular-nums leading-tight ${tone}`}>{value}</span>
      <span className="text-[10px] font-medium uppercase tracking-widest text-slate-500">{label}</span>
    </div>
  );
}

/** The thing a question is about, lifted out of the sentence: "Find [C] on the A string". */
export function Target({ children, tone = "amber" }: { children: ReactNode; tone?: "amber" | "sky" }) {
  const t = tone === "amber" ? "bg-amber-400/20 text-amber-200 ring-amber-400/40" : "bg-sky-400/20 text-sky-200 ring-sky-400/40";
  return <span className={`mx-1 inline-block min-w-[1.6em] rounded-xl px-3 py-0.5 text-center ring-1 ring-inset ${t}`}>{children}</span>;
}

export const btnBig = "inline-flex cursor-pointer items-center gap-2 rounded-xl border border-sky-300/70 bg-sky-500/30 px-6 py-2.5 text-base font-semibold text-sky-50 shadow-lg shadow-sky-500/20 transition hover:bg-sky-500/45 active:scale-[0.97]";

/** A read-only fact about how a game is set up ("↗ Rising", "Strings E A"): a flat tinted label, so it never reads as a button. */
export function SetupTag({ tone, children }: { tone: "amber" | "teal" | "violet" | "sky"; children: ReactNode }) {
  const tones = {
    amber: "bg-amber-400/15 text-amber-200 ring-amber-400/30",
    teal: "bg-teal-400/15 text-teal-200 ring-teal-400/30",
    violet: "bg-violet-400/15 text-violet-200 ring-violet-400/30",
    sky: "bg-sky-400/15 text-sky-200 ring-sky-400/30",
  };
  return <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ring-1 ring-inset ${tones[tone]}`}>{children}</span>;
}

/** Keep the page URL in step with the settings without a navigation, so a teacher can copy a link to this exact setup. */
export function writeQuery(query: string): void {
  const url = new URL(window.location.href);
  url.search = query;
  window.history.replaceState(null, "", url);
}

/** Read a best score from localStorage; storage can be missing or blocked. */
export function readBest(key: string): number {
  try {
    return Number(window.localStorage.getItem(key)) || 0;
  } catch {
    return 0;
  }
}
export function writeBest(key: string, v: number): void {
  try {
    window.localStorage.setItem(key, String(v));
  } catch {
    /* storage blocked: the best score just isn't kept */
  }
}
