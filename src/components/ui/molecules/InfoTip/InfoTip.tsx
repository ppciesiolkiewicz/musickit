"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { InfoButton } from "../../atoms/InfoButton";

/**
 * A small (i) button that opens a short note below it. Closes on Escape or a click elsewhere.
 * `hover` also opens it while a mouse is over it; `align` sets which edge of the button the note lines up with.
 * A note that would run off the side of the window (a button near the edge of a phone) is moved back in, so it never
 * widens the page.
 */
const EDGE = 8;

export default function InfoTip({ label, children, hover = false, align = "right" }: { label: string; children: ReactNode; hover?: boolean; align?: "right" | "center" }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLSpanElement>(null);
  const note = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = note.current;
    if (!open || !el) return;
    el.style.marginLeft = "";
    const r = el.getBoundingClientRect();
    const over = r.right - (document.documentElement.clientWidth - EDGE);
    const shift = over > 0 ? -over : r.left < EDGE ? EDGE - r.left : 0;
    if (shift) el.style.marginLeft = `${shift}px`;
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    window.addEventListener("pointerdown", away);
    return () => {
      window.removeEventListener("pointerdown", away);
    };
  }, [open]);
  return (
    <span
      ref={box}
      className="relative inline-flex"
      onPointerEnter={hover ? (e) => e.pointerType === "mouse" && setOpen(true) : undefined}
      onPointerLeave={hover ? (e) => e.pointerType === "mouse" && setOpen(false) : undefined}
    >
      <InfoButton open={open} onClick={() => setOpen(!open)} label={label} />
      {open && (
        <>
          {/* Invisible bridge over the gap to the note, so the pointer can cross it without closing the hover. */}
          <span aria-hidden className="absolute inset-x-0 top-6 h-1" />
          <div ref={note} role="note" className={`absolute ${align === "center" ? "left-1/2 -translate-x-1/2" : "right-0"} top-7 z-30 flex w-64 max-w-[calc(100vw-1rem)] flex-col gap-1.5 rounded-lg border border-slate-700 bg-slate-950 p-2 whitespace-normal text-left text-xs text-slate-300 shadow-xl`}>{children}</div>
        </>
      )}
    </span>
  );
}
