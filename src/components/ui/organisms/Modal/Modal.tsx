"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/** A simple dialog over the page (the whole screen on a phone): closes on Escape, on the backdrop, or with the close button. `narrow` for a short list or form. */
export function Modal({ title, onClose, narrow = false, children }: { title: ReactNode; onClose: () => void; narrow?: boolean; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);
  // Drawn on the page itself, not inside whatever opened it: a widget on a zoomed canvas is transformed, which would trap and clip a fixed dialog.
  const [host, setHost] = useState<HTMLElement | null>(null);
  useEffect(() => setHost(document.body), []);
  if (!host) return null;
  return createPortal(
    <div className="fixed inset-0 z-[2000] flex items-start justify-center overflow-y-auto bg-black/70 desk:p-6" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={typeof title === "string" ? title : undefined} onClick={(e) => e.stopPropagation()} className={`min-h-full w-full bg-slate-950 ${narrow ? "desk:max-w-md" : "desk:max-w-5xl"} p-3 desk:min-h-0 desk:rounded-2xl desk:border desk:border-slate-700 desk:p-4 desk:shadow-2xl`}>
        <div className="mb-3 flex items-center gap-2">
          <h2 className="text-base font-medium text-slate-100">{title}</h2>
          <button type="button" onClick={onClose} className="ml-auto rounded-md border border-slate-700 px-2.5 py-1 text-xs text-slate-300 hover:border-slate-500">Close ✕</button>
        </div>
        {children}
      </div>
    </div>,
    host,
  );
}

export default Modal;
