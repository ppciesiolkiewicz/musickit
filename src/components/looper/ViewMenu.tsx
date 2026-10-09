"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Icon from "../Icon";

export type View = "fixed" | "widgets" | "lines";

const VIEWS: { id: View; label: string; hint: string; icon: "rows-3" | "layout-dashboard" | "git-merge" }[] = [
  { id: "fixed", label: "Fixed layout", hint: "Everything in its place", icon: "rows-3" },
  { id: "widgets", label: "Widgets", hint: "Drag and resize; connections shown by colour", icon: "layout-dashboard" },
  { id: "lines", label: "Widgets with wires", hint: "The same, and connections drawn as lines", icon: "git-merge" },
];

/** The view button of the top bar: a dropdown of the three ways to see the looper. */
export default function ViewMenu({ view, onChange, btnClass }: { view: View; onChange: (v: View) => void; btnClass: string }) {
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (e.target instanceof Element && e.target.closest("[data-viewmenu]")) return;
      setOpen(false);
    };
    const key = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", key);
    };
  }, [open]);
  const toggle = () => {
    const r = btn.current?.getBoundingClientRect();
    if (r) setPos({ x: Math.max(8, Math.min(window.innerWidth - 268, r.right - 260)), y: r.bottom + 4 });
    setOpen((v) => !v);
  };
  const current = VIEWS.find((v) => v.id === view) ?? VIEWS[1];
  return (
    <>
      <button ref={btn} data-viewmenu type="button" className={`${btnClass} gap-1 ${open ? "border-sky-500" : ""}`} aria-haspopup="menu" aria-expanded={open} onClick={toggle} title={`View: ${current.label}`} aria-label={`View: ${current.label}`}>
        <Icon name={current.icon} />
        <Icon name="chevron-right" size={12} className="rotate-90 text-slate-400" />
      </button>
      {open && typeof document !== "undefined" &&
        createPortal(
          <div data-viewmenu role="menu" className="fixed z-[2000] w-64 rounded-xl border border-slate-700 bg-slate-950 p-1 shadow-xl" style={{ left: pos.x, top: pos.y }}>
            {VIEWS.map((v) => (
              <button key={v.id} type="button" role="menuitemradio" aria-checked={v.id === view} className="flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-xs text-slate-200 hover:bg-slate-800" onClick={() => { onChange(v.id); setOpen(false); }}>
                <Icon name={v.icon} size={15} className="mt-0.5 shrink-0 text-slate-400" />
                <span className="flex min-w-0 flex-col">
                  <span className="font-medium">{v.label}</span>
                  <span className="text-[11px] text-slate-400">{v.hint}</span>
                </span>
                {v.id === view && <Icon name="check" size={14} className="ml-auto mt-0.5 shrink-0 text-sky-300" />}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}
