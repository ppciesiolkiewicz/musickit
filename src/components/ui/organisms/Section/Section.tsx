"use client";

import { useState, type ReactNode } from "react";
import { InfoBox } from "../../atoms/InfoBox";
import { InfoButton } from "../../atoms/InfoButton";

/**
 * A collapsible section. Controlled when `open`/`onToggle` are given, otherwise it keeps its own state.
 * `accent` (a colour, level 1 only) makes it stand out from what is inside: a stronger frame, a left edge in that colour and the title on its own band.
 */
export function Section({
  title, meta, info, lead, children, level = 1, open, onToggle, defaultOpen = true, accent,
}: {
  title: ReactNode; meta?: ReactNode; info?: ReactNode; /** controls between the chevron and the title, outside the toggle */ lead?: ReactNode; children: ReactNode; level?: 1 | 2; open?: boolean; onToggle?: () => void; defaultOpen?: boolean; accent?: string;
}) {
  const [own, setOwn] = useState(defaultOpen);
  const isOpen = open ?? own;
  const toggle = onToggle ?? (() => setOwn((v) => !v));
  const [infoOpen, setInfoOpen] = useState(false);
  return (
    <section
      className={level === 1 ? (accent ? "overflow-hidden rounded-2xl border border-l-4 border-slate-700 bg-slate-900/80 shadow-lg shadow-black/10" : "rounded-2xl border border-slate-800 bg-slate-900/40") : ""}
      style={accent && level === 1 ? { borderLeftColor: accent } : undefined}
    >
      <div className={`flex items-center gap-2 ${accent && level === 1 ? `border-b border-slate-700 bg-slate-800/60 ${isOpen ? "mb-3" : ""}` : ""}`}>
        {/* with a lead the chevron is its own toggle, so the lead's controls sit outside any button */}
        {lead && (
          <button type="button" onClick={toggle} aria-expanded={isOpen} aria-label={isOpen ? "Hide section" : "Show section"} className={`cursor-pointer ${level === 1 ? "py-3 pl-4 text-slate-100" : "py-2 text-slate-400"} focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400`}>
            <span className={`inline-block transition-transform ${isOpen ? "rotate-90" : ""}`} aria-hidden>▸</span>
          </button>
        )}
        {lead}
        <button
          type="button"
          onClick={toggle}
          aria-expanded={isOpen}
          className={`flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400 ${level === 1 ? `${lead ? "py-3 pr-4" : "px-4 py-3"} font-medium text-slate-100 ${accent ? "text-base" : "text-sm"}` : "py-2 text-xs font-medium uppercase tracking-wider text-slate-400"}`}
        >
          {!lead && <span className={`inline-block transition-transform ${isOpen ? "rotate-90" : ""}`} aria-hidden>▸</span>}
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
