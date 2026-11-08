"use client";

import { useEffect, useRef } from "react";

/** Calls `onEscape` on the Escape key while `active`. Use it for anything that opens and should close on Esc. */
export function useEscape(active: boolean, onEscape: () => void) {
  const latest = useRef(onEscape);
  useEffect(() => {
    latest.current = onEscape;
  });
  useEffect(() => {
    if (!active) return;
    const key = (e: KeyboardEvent) => e.key === "Escape" && latest.current();
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [active]);
}

/** The small [Esc] label shown next to an open (i) or (?) to say Escape closes it. */
export function EscKey() {
  return (
    <kbd aria-hidden className="shrink-0 rounded border border-slate-600 px-1 text-[9px] font-medium normal-case tracking-normal text-slate-400">
      Esc
    </kbd>
  );
}
