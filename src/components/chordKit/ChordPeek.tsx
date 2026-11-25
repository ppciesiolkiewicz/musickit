"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/** how long the card stays after the pointer leaves, ms: time to move from the name down into the card */
const LINGER = 150;
/** the card's width, px; it is kept this far inside the window */
const WIDTH = 224;

/**
 * A chord's name that opens a card under it when pointed at (a mouse), tapped or focused: `card` is what the card
 * holds, often a `ChordDiagram`. The card is drawn on the body, so it can open from inside a paragraph or a clipped box,
 * and it closes when the pointer leaves both, on a second tap, or on a scroll.
 */
export default function ChordPeek({ label, card, className = "" }: { label: ReactNode; card: ReactNode; className?: string }) {
  const [at, setAt] = useState<{ left: number; top: number } | null>(null);
  const name = useRef<HTMLButtonElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const keep = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  const show = () => {
    keep();
    const r = name.current?.getBoundingClientRect();
    if (!r) return;
    const half = WIDTH / 2 + 8;
    setAt({ left: Math.min(window.innerWidth - half, Math.max(half, r.left + r.width / 2)), top: r.bottom });
  };
  const hide = () => {
    keep();
    timer.current = setTimeout(() => setAt(null), LINGER);
  };
  useEffect(() => keep, []);
  // a scroll moves the name away from the card
  useEffect(() => {
    if (!at) return;
    const close = () => setAt(null);
    window.addEventListener("scroll", close, { passive: true, capture: true });
    return () => window.removeEventListener("scroll", close, { capture: true });
  }, [at]);

  return (
    <>
      <button
        ref={name}
        type="button"
        onPointerEnter={(e) => e.pointerType === "mouse" && show()}
        onPointerLeave={(e) => e.pointerType === "mouse" && hide()}
        onClick={() => (at ? setAt(null) : show())}
        onFocus={show}
        onBlur={hide}
        aria-expanded={!!at}
        className={`cursor-help focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400 ${className}`}
      >
        {label}
      </button>
      {at && createPortal(
        // the padding is part of the hover area, so the pointer can move down into the card without closing it
        <div className="fixed z-50 -translate-x-1/2 pt-1.5 text-left text-xs text-slate-300" style={{ left: at.left, top: at.top, width: WIDTH }} onPointerEnter={keep} onPointerLeave={(e) => e.pointerType === "mouse" && hide()}>
          <div className="flex flex-col gap-1.5 rounded-lg border border-slate-700 bg-slate-950 p-2 shadow-xl">{card}</div>
        </div>,
        document.body,
      )}
    </>
  );
}
