"use client";

import { useState, type ReactNode } from "react";
import { InfoBox } from "../../atoms/InfoBox";
import { InfoButton } from "../../atoms/InfoButton";

/** A labelled row of chips. `info` adds an (i) button that opens a plain-language explanation under the row. */
export function ChipRow({ label, children, info }: { label: string; children: ReactNode; info?: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="flex w-28 shrink-0 items-center gap-1 text-xs uppercase tracking-wider text-slate-500">
        {label}
        {info && <InfoButton open={open} onClick={() => setOpen((v) => !v)} label={`About ${label.toLowerCase()}`} />}
      </span>
      {children}
      {open && info && <InfoBox>{info}</InfoBox>}
    </div>
  );
}
