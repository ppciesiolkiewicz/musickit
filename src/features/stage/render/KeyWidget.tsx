"use client";

import { TONICS } from "@/features/theory";
import { LabelSelect } from "@/features/theory/useLabelSystem";
import { Chip } from "@/components/ui";

/** The Key widget: the twelve root notes and the note labels. No scale or mode: each widget keeps its own, so modes of one root can be compared. */
export default function KeyWidget({ tonicPc, onTonic }: { tonicPc: number | null; onTonic: (pc: number) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-slate-800 bg-slate-950 p-2.5" role="group" aria-label="Root note">
      <div className="flex flex-wrap items-center gap-1">
        {TONICS.map((t) => (
          <Chip key={t.pc} on={t.pc === tonicPc} onClick={() => onTonic(t.pc)}>{t.name}</Chip>
        ))}
      </div>
      <LabelSelect />
    </div>
  );
}
