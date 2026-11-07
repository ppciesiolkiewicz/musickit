"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { inSelectMenu } from "../../atoms/Select";
import { InfoButton } from "../../atoms/InfoButton";

const GAP = 6;
const EDGE = 12;

/**
 * A button with a panel of controls under it (above when there is more room there), its right edge on the button's.
 * Portalled and fixed, so a blurred bar or a full-screen player can't trap or clip it; closes on a click outside or Escape.
 */
export function Dropdown({ label, button, width = "w-72", children }: {
  /** the panel's name, and the button's title */
  label: string;
  /** what the button shows (an icon) */
  button: ReactNode;
  /** the panel's width class */
  width?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLSpanElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [place, setPlace] = useState<CSSProperties | null>(null);

  useLayoutEffect(() => {
    if (!open) return;
    const update = () => {
      const r = wrap.current?.getBoundingClientRect();
      if (!r) return;
      const below = window.innerHeight - r.bottom - GAP - EDGE;
      const above = r.top - GAP - EDGE;
      const right = Math.max(EDGE, window.innerWidth - r.right);
      setPlace(below >= 280 || below >= above
        ? { top: r.bottom + GAP, right, maxHeight: below }
        : { bottom: window.innerHeight - r.top + GAP, right, maxHeight: above });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const down = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!inSelectMenu(e.target) && !wrap.current?.contains(t) && !panel.current?.contains(t)) setOpen(false);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      setOpen(false);
    };
    window.addEventListener("pointerdown", down);
    // capture: a full-screen player closes on Escape too, and the panel should close first
    window.addEventListener("keydown", key, true);
    return () => {
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("keydown", key, true);
    };
  }, [open]);

  return (
    <span ref={wrap} className="relative inline-flex shrink-0">
      <button type="button" tabIndex={-1} title={label} aria-label={label} aria-expanded={open} aria-haspopup="dialog" onClick={() => setOpen(!open)}
        className={`grid h-8 min-w-8 place-items-center rounded-lg border px-1.5 transition ${open ? "border-sky-400/70 bg-sky-500/15 text-sky-100" : "border-slate-700 text-slate-300 hover:border-slate-500"}`}>
        {button}
      </button>
      {open && place && createPortal(
        <div ref={panel} role="dialog" aria-label={label} style={place}
          className={`fixed z-[2100] flex max-w-[calc(100vw-1.5rem)] flex-col gap-3 overflow-y-auto overscroll-contain rounded-xl border border-slate-700 bg-slate-950 p-3 text-xs text-slate-300 shadow-2xl shadow-black/60 ${width}`}>
          {children}
        </div>,
        document.body,
      )}
    </span>
  );
}

/**
 * One titled part of a dropdown's panel. `info` puts an (i) by the title that opens what the setting does under it
 * (in place, not a popup: the panel scrolls and would clip one).
 */
export function DropdownSection({ title, info, children }: { title: string; info?: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="flex flex-col gap-1.5">
      <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        {title}
        {info && <InfoButton open={open} onClick={() => setOpen(!open)} label={`What ${title.toLowerCase()} does`} />}
      </h3>
      {info && open && <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-2 leading-relaxed text-slate-300">{info}</div>}
      {children}
    </section>
  );
}
