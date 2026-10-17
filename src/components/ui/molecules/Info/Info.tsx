"use client";

import { useState, type ReactNode } from "react";
import { InfoButton } from "../../atoms/InfoButton";

/** Inline (i) button that reveals an explanation right after it. */
export function Info({ children, label = "What does this mean?" }: { children: ReactNode; label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="inline">
      <span className="ml-1 inline-block align-middle"><InfoButton open={open} onClick={() => setOpen((v) => !v)} label={label} /></span>
      {open && <span className="mt-1.5 block rounded-lg border border-slate-700 bg-slate-950/70 p-2.5 text-xs leading-relaxed text-slate-300">{children}</span>}
    </span>
  );
}
