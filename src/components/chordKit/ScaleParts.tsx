"use client";

import { useState, type ReactNode } from "react";
import { modeAlias } from "@/features/theory/theory";
import { InfoBox, InfoButton } from "@/components/ui";
import { DegreeLegend } from "@/components/theory/DegreeLegend";

/** "Major" or "Minor" next to Ionian and Aeolian; nothing for the other modes. */
export function ModeAlias({ familyIndex, modeIndex }: { familyIndex: number; modeIndex: number }) {
  const alias = modeAlias(familyIndex, modeIndex);
  if (!alias) return null;
  return <span> ({alias})</span>;
}

/** The degree colours with a heading and a short reading guide; `children` is the longer explanation behind the (i). */
export function ColourKey({ title = "Colour key", children }: { title?: string; children?: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <section aria-label={title} className="flex flex-col gap-1.5 rounded-2xl border border-slate-800 bg-slate-900/40 px-3 py-2.5">
      <h2 className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-slate-400">
        {title}
        {children && <InfoButton open={open} onClick={() => setOpen((v) => !v)} label={`About the ${title.toLowerCase()}`} />}
      </h2>
      <DegreeLegend />
      <p className="text-xs text-slate-500">Each colour is a scale degree, counted from the key. A ♭ or ♯ note keeps its degree&apos;s colour: ♭3 is still amber.</p>
      {open && children && <InfoBox>{children}</InfoBox>}
    </section>
  );
}
