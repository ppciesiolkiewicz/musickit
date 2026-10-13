"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import Icon from "./Icon";
import { menuClick } from "@/lib/practice/menu";
import { GROUP_LABEL, THEORY_SECTIONS, type SectionGroup, type TheorySection } from "@/features/theory/sections";

const GROUPS = Object.keys(GROUP_LABEL) as SectionGroup[];

/** One theory page as a block: icon, name, one grey line. Used by the menu and the hub. */
export function SectionBlock({ s, current, onPick, roomy }: { s: TheorySection; current?: boolean; onPick?: () => void; roomy?: boolean }) {
  return (
    <Link
      href={s.href}
      onClick={onPick}
      aria-current={current ? "page" : undefined}
      className={`flex items-start gap-2.5 rounded-xl border px-3 py-2 transition ${roomy ? "py-3" : ""} ${current ? "border-sky-500/60 bg-sky-500/15" : "border-transparent hover:border-slate-700 hover:bg-slate-800/60"}`}
    >
      <Icon name={s.icon} size={18} className={`mt-0.5 shrink-0 ${current ? "text-sky-300" : "text-slate-400"}`} />
      <span className="min-w-0">
        <span className={`block text-sm ${current ? "text-sky-100" : "text-slate-100"}`}>{s.label}</span>
        <span className="block text-xs text-slate-500">{s.desc}</span>
      </span>
    </Link>
  );
}

/** The "Theory" item of the top nav: opens a panel with every theory page, on hover (mouse), click, tap or keyboard. */
export default function TheoryMenu({ active }: { active: string }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverOpenedAt = useRef<number | null>(null);
  const panelId = useId();
  const inTheory = active === "/theory" || active.startsWith("/theory/");

  const cancelClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = null;
  };
  const closeSoon = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(false), 150);
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  useEffect(() => cancelClose, []);

  const isCurrent = (s: TheorySection) => (s.href === "/theory" ? active === "/theory" : !s.href.includes("#") && (active === s.href || active.startsWith(`${s.href}/`)));

  return (
    <div
      ref={root}
      className="static sm:relative"
      onPointerEnter={(e) => {
        if (e.pointerType !== "mouse") return;
        cancelClose();
        if (!open) hoverOpenedAt.current = performance.now();
        setOpen(true);
      }}
      onPointerLeave={(e) => e.pointerType === "mouse" && closeSoon()}
      onBlur={(e) => {
        // keyboard: tabbing out of the menu closes it
        if (!root.current?.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={(e) => {
          const pointerType = (e.nativeEvent as PointerEvent).pointerType || "keyboard";
          setOpen(menuClick({ open, hoverOpenedAt: hoverOpenedAt.current, now: performance.now(), pointerType }));
          hoverOpenedAt.current = null;
        }}
        className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm transition ${inTheory ? "bg-sky-500/20 text-sky-100" : "text-slate-400 hover:text-slate-200"}`}
      >
        Theory
        <Icon name="chevron-down" size={14} className={`transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div
          id={panelId}
          className="absolute left-2 right-2 z-50 mt-1 max-h-[80vh] overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-3 shadow-2xl sm:left-0 sm:right-auto sm:w-[min(64rem,calc(100vw-2rem))]"
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {GROUPS.map((g) => (
              <div key={g} className="flex flex-col gap-0.5">
                <span className="px-3 pb-1 text-xs uppercase tracking-wider text-slate-500">{GROUP_LABEL[g]}</span>
                {THEORY_SECTIONS.filter((s) => s.group === g).map((s) => (
                  <SectionBlock key={s.href} s={s} current={isCurrent(s)} onPick={() => setOpen(false)} />
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
