"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/** A simple full-screen dialog: closes on Escape, on the backdrop, or with the close button. */
export function Modal({ title, onClose, children }: { title: ReactNode; onClose: () => void; children: ReactNode }) {
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
    <div className="fixed inset-0 z-[2000] flex items-start justify-center overflow-y-auto bg-black/70 p-2 sm:p-6" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={typeof title === "string" ? title : undefined} onClick={(e) => e.stopPropagation()} className="w-full max-w-5xl rounded-2xl border border-slate-700 bg-slate-950 p-4 shadow-2xl">
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
