"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import Icon from "./Icon";
import { menuClick } from "@/lib/practice/menu";
import { GROUP_LABEL, THEORY_SECTIONS, TONE, type SectionGroup, type TheorySection } from "@/features/theory/sections";

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
      <span className={`grid size-7 shrink-0 place-items-center rounded-lg ${TONE[s.tone].chip}`}>
        <Icon name={s.icon} size={16} className={TONE[s.tone].icon} />
      </span>
      <span className="min-w-0">
        <span className={`block text-sm ${current ? "text-sky-100" : "text-slate-100"}`}>{s.label}</span>
        <span className="block text-xs text-slate-500">{s.desc}</span>
      </span>
    </Link>
  );
}

/** The "Practice" item of the top nav (the /theory pages): opens a panel with every theory page, on hover (mouse), click, tap or keyboard. */
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
        // keyboard: tabbing out of the menu closes it. Focus dropped to nowhere is not that: NoControlFocus blurs the button on
        // pointerup, which on a phone lands between the tap on an item and its click, and closing then would swallow the click.
        const to = e.relatedTarget as Node | null;
        if (to && !root.current?.contains(to)) setOpen(false);
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
        className={`flex items-center gap-1 rounded-lg px-3.5 py-2 text-sm transition ${inTheory ? "bg-sky-500/20 text-sky-100" : "text-slate-400 hover:text-slate-200"}`}
      >
        Practice
        <Icon name="chevron-down" size={14} className={`transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div
          id={panelId}
          className="fixed inset-0 z-[2000] overflow-y-auto bg-slate-900 p-3 sm:absolute sm:inset-auto sm:left-0 sm:z-50 sm:mt-1 sm:max-h-[80vh] sm:w-[min(64rem,calc(100vw-2rem))] sm:rounded-2xl sm:border sm:border-slate-700 sm:shadow-2xl"
        >
          {/* on a phone the panel covers the screen, so it needs its own way out */}
          <div className="mb-2 flex items-center sm:hidden">
            <span className="px-3 text-base font-medium text-slate-100">Practice</span>
            <button type="button" onClick={() => setOpen(false)} className="ml-auto rounded-md border border-slate-700 px-2.5 py-1 text-xs text-slate-300">Close ✕</button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {GROUPS.map((g) => (
              <div key={g} className="flex flex-col gap-0.5">
                <span className={`px-3 pb-1 text-xs uppercase tracking-wider text-slate-500`}>{GROUP_LABEL[g]}</span>
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
