"use client";

import { KeyBar, KeyScope, type KeyChoice } from "@/features/creator";

/** The master Key & scale: every widget follows it, except the parts of its key set on the widget itself. */
export default function KeyWidget({ value, onChange }: { value: KeyChoice; onChange: (k: KeyChoice) => void }) {
  return (
    <KeyScope value={value} onChange={onChange}>
      <div className="flex flex-col gap-1.5 rounded-xl border border-slate-800 bg-slate-950 p-2">
        <span className="px-1 text-xs font-medium uppercase tracking-wide text-slate-400">Key &amp; scale</span>
        <KeyBar />
      </div>
    </KeyScope>
  );
}
