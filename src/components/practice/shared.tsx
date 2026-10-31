"use client";

import type { ReactNode } from "react";

/** Small pieces both practice games use. */
export const panel = "rounded-2xl border border-slate-800 bg-slate-900/40 p-4";
export const btn = "cursor-pointer rounded-lg border border-slate-600 bg-slate-800 px-3 py-1 text-sm text-slate-100 shadow-sm shadow-black/20 transition hover:border-slate-400 hover:bg-slate-700 active:scale-[0.97] disabled:opacity-40";
export const btnPrimary = "cursor-pointer rounded-lg border border-sky-400/80 bg-sky-500/25 px-4 py-1 text-sm font-semibold text-sky-50 shadow-md shadow-sky-500/20 transition hover:bg-sky-500/40 active:scale-[0.97]";

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
