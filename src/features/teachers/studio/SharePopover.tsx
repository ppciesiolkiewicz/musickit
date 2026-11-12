"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Icon from "@/components/Icon";

/**
 * Share in the demo: a popover beside the button, amber like the app's other heads-up notices, saying sharing isn't open
 * yet. `thing` names what can't be sent (a note in the notes creator, a plan on the AI practice plan page). In the notes creator it offers View as a note (`onView`). Closes on ✕, Esc or a press outside it and its button. Drawn on the page
 * (a portal, fixed beside the button; under it on a narrow window), as the side panel scrolls and would clip it.
 */
export default function SharePopover({ open, onClose, onView, thing = "a note", children }: { open: boolean; thing?: string; onClose: () => void; onView?: () => void; /** the button it belongs to */ children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState<{ left: number; top: number } | null>(null);
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const r = box.current?.getBoundingClientRect();
      if (!r) return;
      const beside = window.innerWidth >= 768 && r.right + 8 + 288 <= window.innerWidth;
      setAt(beside ? { left: r.right + 8, top: r.top } : { left: Math.max(8, Math.min(r.left, window.innerWidth - 296)), top: r.bottom + 8 });
    };
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const inside = (n: Node) => !!box.current?.contains(n) || !!pop.current?.contains(n);
    const down = (e: PointerEvent) => !inside(e.target as Node) && onClose();
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("pointerdown", down);
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("keydown", key);
    };
  }, [open, onClose]);
  return (
    <div ref={box} className="relative">
      {children}
      {open && at && createPortal(
        <div ref={pop} role="dialog" aria-label="Sharing isn't open yet" style={{ left: at.left, top: at.top }} className="fixed z-[1500] w-72 rounded-xl border border-amber-500/40 bg-slate-900 p-3 shadow-xl shadow-black/40">
          <div className="flex items-start gap-2.5">
            <span aria-hidden className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-amber-500/15 text-amber-300">
              <Icon name="share-2" size={14} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-amber-200">Sharing isn&apos;t open yet</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-300">
                This is a demo, so {thing} can&apos;t be sent as a link yet.{onView ? " Press View as a note to see the note as your students will." : ""}
              </p>
            </div>
            <button type="button" aria-label="Close" onClick={onClose} className="-mr-1 -mt-1 rounded-md p-1 text-slate-400 hover:text-slate-100">
              <Icon name="x" size={14} />
            </button>
          </div>
          {onView && (
            <button type="button" onClick={() => { onClose(); onView(); }} className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-amber-500/50 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-100 hover:bg-amber-500/20">
              <Icon name="eye" size={12} /> View as a note
            </button>
          )}
        </div>,
        document.body,
      )}
    </div>
  );
}
