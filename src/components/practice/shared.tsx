"use client";

import { useEffect, useRef, type ReactNode } from "react";
import Icon from "@/components/Icon";

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

/** The big choice of what to play, above the stage: a card for each game, saying what it asks of you. */
export function GameChoice<T extends string>({ label, options, value, onChange, tone = "sky", disabled = false }: { label: string; options: { id: T; title: string; about: string }[]; value: T; onChange: (id: T) => void; tone?: "sky" | "amber" | "violet"; /** locked while a round is on */ disabled?: boolean }) {
  const onTone = {
    sky: "border-sky-400/80 bg-sky-400/10 text-sky-300",
    amber: "border-amber-400/80 bg-amber-400/10 text-amber-300",
    violet: "border-violet-400/80 bg-violet-400/10 text-violet-300",
  }[tone];
  return (
    <div role="group" aria-label={label} inert={disabled} className={`grid gap-2 max-sm:grid-cols-2 max-sm:[&>:last-child:nth-child(odd)]:col-span-2 sm:grid-cols-[repeat(auto-fit,minmax(9.5rem,1fr))] transition-opacity ${disabled ? "opacity-50" : ""}`}>
      {options.map((o) => {
        const on = o.id === value;
        return (
          <button key={o.id} type="button" aria-pressed={on} onClick={() => onChange(o.id)}
            className={`flex cursor-pointer flex-col gap-1 rounded-2xl border-2 p-3 text-left transition active:scale-[0.99] ${on ? onTone : "border-slate-700 bg-slate-900/40 hover:border-slate-500 hover:bg-slate-800/60"}`}>
            <span className="flex items-center justify-between gap-2"><span className="text-base font-semibold text-slate-50">{o.title}</span>{on && <Icon name="check" size={16} />}</span>
            <span className="text-xs leading-snug text-slate-400">{o.about}</span>
          </button>
        );
      })}
    </div>
  );
}

/** A score in the stage's corner: a small label over a big number. */
export function Stat({ label, value, tone = "text-slate-50" }: { label: string; value: ReactNode; tone?: string }) {
  return (
    <div className="flex min-w-16 flex-col items-center rounded-xl border border-slate-700/60 bg-slate-950/40 px-3 py-1.5">
      <span className={`text-xl font-semibold tabular-nums leading-tight ${tone}`}>{value}</span>
      <span className="text-[10px] font-medium uppercase tracking-widest text-slate-400">{label}</span>
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

/**
 * Keyboard play for a game. Skips browser shortcuts and held keys, and never fires while typing in a field.
 * `onControl` says focus is on a button or link, whose own Space and Enter should be left alone.
 */
export function useGameKeys(onKey: (e: KeyboardEvent, onControl: boolean) => void, enabled = true): void {
  const latest = useRef(onKey);
  useEffect(() => {
    latest.current = onKey;
  });
  useEffect(() => {
    if (!enabled) return;
    const handle = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target instanceof Element ? e.target : null;
      if (el?.closest("input, textarea, select, [contenteditable=true]")) return;
      latest.current(e, !!el?.closest("button, a, summary"));
    };
    // first in line, so a game that uses a key can stop the page's own shortcut for it
    window.addEventListener("keydown", handle, true);
    return () => window.removeEventListener("keydown", handle, true);
  }, [enabled]);
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
