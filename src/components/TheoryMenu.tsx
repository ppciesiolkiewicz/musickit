"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import Icon from "./Icon";
import { menuClick } from "@/lib/practice/menu";
import { GROUP_LABEL, THEORY_SECTIONS, TONE, sectionFor, type SectionGroup, type TheorySection } from "@/features/theory/sections";

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

/** The columns a menu shows: one per group, and a group with `sub` columns (Guitar: Explore, Practice) splits into those.
 * A heading is only shown where it tells you something: the group name in a menu of several groups, the sub name always. */
function columns(groups: SectionGroup[]) {
  return groups.flatMap((g) => {
    const items = THEORY_SECTIONS.filter((s) => s.group === g);
    const subs = [...new Set(items.map((s) => s.sub))];
    return subs.map((sub) => ({
      key: `${g}:${sub ?? ""}`,
      heading: [groups.length > 1 ? GROUP_LABEL[g] : null, sub].filter(Boolean).join(" · "),
      items: items.filter((s) => s.sub === sub),
    }));
  });
}

/** One item of the top nav: a button that opens a panel of pages from `groups`, on hover (mouse), click, tap or keyboard.
 * On a phone the panel covers the screen. */
export default function TheoryMenu({ active, label, groups = GROUPS, className = "" }: { active: string; label: string; groups?: SectionGroup[]; className?: string }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverOpenedAt = useRef<number | null>(null);
  const panelId = useId();
  const here = sectionFor(active);
  const inTheory = !!here && groups.includes(here.group);

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
      className={`static desk:relative ${className}`}
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
        {label}
        <Icon name="chevron-down" size={14} className={`transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div
          id={panelId}
          className="fixed inset-0 z-[2000] overflow-y-auto bg-slate-900 p-3 desk:absolute desk:inset-auto desk:left-0 desk:z-50 desk:mt-1 desk:max-h-[80vh] desk:w-max desk:max-w-[calc(100vw-2rem)] desk:rounded-2xl desk:border desk:border-slate-700 desk:shadow-2xl"
        >
          {/* on a phone the panel covers the screen, so it needs its own way out */}
          <div className="mb-2 flex items-center desk:hidden">
            <span className="px-3 text-base font-medium text-slate-100">{label}</span>
            <button type="button" onClick={() => setOpen(false)} className="ml-auto rounded-md border border-slate-700 px-2.5 py-1 text-xs text-slate-300">Close ✕</button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 desk:grid-flow-col desk:grid-cols-none desk:auto-cols-64">
            {columns(groups).map((c) => (
              <div key={c.key} className="flex flex-col gap-0.5">
                {c.heading && <span className="px-3 pb-1 text-xs uppercase tracking-wider text-slate-500">{c.heading}</span>}
                {c.items.map((s) => (
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
