"use client";

import { useState, type ReactNode } from "react";
import { DEGREE_COLOURS } from "@/lib/chordKit/scales";

export function Chip({ on, onClick, children, count, title }: { on?: boolean; onClick?: () => void; children: ReactNode; count?: number; title?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={on}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400 ${
        on ? "border-sky-400 bg-sky-500/20 text-sky-100" : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500"
      }`}
    >
      {children}
      {count !== undefined && <span className="tabular-nums text-[10px] text-slate-500">{count}</span>}
    </button>
  );
}

/** A labelled row of chips. `info` adds an (i) button that opens a plain-language explanation under the row. */
export function ChipRow({ label, children, info }: { label: string; children: ReactNode; info?: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="flex w-28 shrink-0 items-center gap-1 text-xs uppercase tracking-wider text-slate-500">
        {label}
        {info && <InfoButton open={open} onClick={() => setOpen((v) => !v)} label={`About ${label.toLowerCase()}`} />}
      </span>
      {children}
      {open && info && <InfoBox>{info}</InfoBox>}
    </div>
  );
}

export function InfoButton({ open, onClick, label }: { open: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      aria-label={label}
      title={label}
      className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[10px] normal-case tracking-normal ${open ? "border-sky-400 bg-sky-500/20 text-sky-200" : "border-slate-600 text-slate-400 hover:border-slate-400"}`}
    >
      i
    </button>
  );
}

export function InfoBox({ children }: { children: ReactNode }) {
  return <div className="basis-full rounded-lg border border-slate-700 bg-slate-950/70 p-2.5 text-xs normal-case leading-relaxed tracking-normal text-slate-300">{children}</div>;
}

/** The seven scale-degree colours, with their names. */
export function DegreeLegend() {
  return (
    <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400" aria-label="Colour key: scale degrees">
      {DEGREE_COLOURS.map((c, i) => (
        <span key={i} className="inline-flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-full border border-slate-700" style={{ background: c }} />
          {["R", "2", "3", "4", "p5", "6", "7"][i]}
        </span>
      ))}
    </span>
  );
}

/** A small clickable tag on a card. */
export function Tag({ children, on, onClick, tone = "form" }: { children: ReactNode; on?: boolean; onClick?: () => void; tone?: "form" | "style" | "mode" | "degree" }) {
  const tones = {
    form: "border-slate-700 text-slate-400",
    style: "border-violet-500/40 text-violet-300",
    mode: "border-teal-500/40 text-teal-300",
    degree: "border-sky-500/40 text-sky-300",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`rounded-full border px-2 py-0.5 text-xs transition hover:bg-slate-800 ${tones[tone]} ${on ? "bg-sky-500/20 !text-sky-100 !border-sky-400" : ""}`}
    >
      {children}
    </button>
  );
}

/** A collapsible section. Controlled when `open`/`onToggle` are given, otherwise it keeps its own state. */
export function Section({
  title, meta, info, children, level = 1, open, onToggle, defaultOpen = true,
}: {
  title: ReactNode; meta?: ReactNode; info?: ReactNode; children: ReactNode; level?: 1 | 2; open?: boolean; onToggle?: () => void; defaultOpen?: boolean;
}) {
  const [own, setOwn] = useState(defaultOpen);
  const isOpen = open ?? own;
  const toggle = onToggle ?? (() => setOwn((v) => !v));
  const [infoOpen, setInfoOpen] = useState(false);
  return (
    <section className={level === 1 ? "rounded-2xl border border-slate-800 bg-slate-900/40" : ""}>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={toggle}
          aria-expanded={isOpen}
          className={`flex min-w-0 flex-1 items-center gap-2 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400 ${level === 1 ? "px-4 py-3 text-sm font-medium text-slate-100" : "py-2 text-xs font-medium uppercase tracking-wider text-slate-400"}`}
        >
          <span className={`inline-block transition-transform ${isOpen ? "rotate-90" : ""}`} aria-hidden>▸</span>
          <span>{title}</span>
          {meta && <span className="ml-auto text-xs font-normal normal-case tracking-normal text-slate-500">{meta}</span>}
        </button>
        {info && <span className={level === 1 ? "pr-4" : ""}><InfoButton open={infoOpen} onClick={() => setInfoOpen((v) => !v)} label="About this section" /></span>}
      </div>
      {info && infoOpen && <div className={level === 1 ? "px-4 pb-2" : "pb-2"}><InfoBox>{info}</InfoBox></div>}
      {isOpen && <div className={level === 1 ? "px-4 pb-4" : "pb-2"}>{children}</div>}
    </section>
  );
}

/** Inline (i) button that reveals an explanation right after it. */
export function Info({ children, label = "What does this mean?" }: { children: ReactNode; label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="inline">
      <span className="ml-1 inline-block align-middle"><InfoButton open={open} onClick={() => setOpen((v) => !v)} label={label} /></span>
      {open && <span className="mt-1.5 block rounded-lg border border-slate-700 bg-slate-950/70 p-2.5 text-xs leading-relaxed text-slate-300">{children}</span>}
    </span>
  );
}

export function Stepper({ value, onDec, onInc, decDisabled, incDisabled, label }: { value: ReactNode; onDec: () => void; onInc: () => void; decDisabled?: boolean; incDisabled?: boolean; label: string }) {
  const btn = "h-6 w-6 rounded-md border border-slate-700 text-slate-300 hover:border-slate-500 disabled:opacity-30 disabled:hover:border-slate-700";
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-slate-400" role="group" aria-label={label}>
      <button type="button" className={btn} onClick={onDec} disabled={decDisabled} aria-label={`${label}: lower`}>−</button>
      <span className="min-w-[4.5rem] text-center tabular-nums">{value}</span>
      <button type="button" className={btn} onClick={onInc} disabled={incDisabled} aria-label={`${label}: higher`}>+</button>
    </span>
  );
}

export { Modal } from "../Modal";
