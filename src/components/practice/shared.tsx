"use client";

/** Small pieces both practice games use. */
export const panel = "rounded-2xl border border-slate-800 bg-slate-900/40 p-4";
export const btn = "rounded-lg border border-slate-700 px-3 py-1 text-sm text-slate-200 hover:border-slate-500";
export const btnPrimary = "rounded-lg border border-sky-500/60 bg-sky-500/10 px-3 py-1 text-sm text-sky-100 hover:bg-sky-500/20";

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
