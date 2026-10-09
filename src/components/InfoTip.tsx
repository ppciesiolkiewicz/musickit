"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Icon from "./Icon";

/** A small (i) button that opens a short note below it. Closes on Escape or a click elsewhere. */
export default function InfoTip({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const key = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("pointerdown", away);
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("pointerdown", away);
      window.removeEventListener("keydown", key);
    };
  }, [open]);
  return (
    <span ref={box} className="relative">
      <button type="button" className="grid h-6 min-w-6 place-items-center rounded-md border border-slate-700/80 bg-slate-900/80 px-1 text-slate-300 hover:border-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400" aria-expanded={open} aria-label={label} title={label} onClick={() => setOpen(!open)}>
        <Icon name="info" size={12} />
      </button>
      {open && (
        <div role="note" className="absolute right-0 top-7 z-30 flex w-64 flex-col gap-1.5 rounded-lg border border-slate-700 bg-slate-950 p-2 text-left text-xs text-slate-300 shadow-xl">{children}</div>
      )}
    </span>
  );
}
