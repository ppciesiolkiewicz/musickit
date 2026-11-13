"use client";

import { useState, type ReactNode } from "react";
import { InfoBox } from "../../atoms/InfoBox";
import { InfoButton } from "../../atoms/InfoButton";

/** One labelled row of a settings panel: a small label (with an optional (i) explaining it) and controls that wrap. */
export function SettingsRow({ label, info, children }: { label: string; info?: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    // the label sits level with the first line of chips (h-8: a chip and the row's py-0.5), also when they wrap
    <div className="flex flex-wrap items-start gap-x-2 gap-y-1">
      <span className="flex h-8 w-20 shrink-0 items-center gap-1 text-[11px] uppercase tracking-wider text-slate-500">
        {label}
        {info && <InfoButton open={open} onClick={() => setOpen((v) => !v)} label={`About ${label.toLowerCase()}`} />}
      </span>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1 py-0.5">{children}</div>
      {open && info && <InfoBox>{info}</InfoBox>}
    </div>
  );
}

/** A section of a settings panel: an optional heading and its rows, set off from the one above by a rule. */
export function SettingsSection({ title, first = false, children }: { title?: string; first?: boolean; children: ReactNode }) {
  return (
    <section aria-label={title} className={`flex flex-col gap-2 ${first ? "" : "panel-rule pt-5"}`}>
      {title && <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-300">{title}</h3>}
      {children}
    </section>
  );
}

const FROM = { sm: "hidden sm:inline-flex", md: "hidden md:inline-flex", lg: "hidden lg:inline-flex" };

/** A small rounded tag for a settings panel's `summary`; `from` hides it below that width. */
export function SettingsFact({ from, className = "", children }: { from?: keyof typeof FROM; className?: string; children: ReactNode }) {
  return <span className={`${from ? FROM[from] : "inline-flex"} shrink-0 items-center gap-1 rounded-full border border-slate-700 px-2 py-0.5 text-[11px] ${className}`}>{children}</span>;
}
