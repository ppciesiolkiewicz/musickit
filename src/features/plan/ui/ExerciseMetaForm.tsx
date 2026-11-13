"use client";

import { useMemo } from "react";
import Icon from "@/components/Icon";
import { catalogue, linkLabel } from "../model/catalogue";

/** What the meta form edits: the title as the player types it (hashtags included), minutes, why and the two link slots. */
export interface MetaDraft { titleText: string; minutes: number; why: string; learnBefore: string[]; exploreMore: string[] }

const field = "rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-100 outline-none focus:border-sky-500";

/** One link slot: the pages as chips with ✕, and Add a page (any page an exercise may link to). At most 3. */
function Links({ label, hrefs, onChange }: { label: string; hrefs: string[]; onChange: (hrefs: string[]) => void }) {
  const entries = useMemo(() => catalogue(), []);
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</span>
      {hrefs.map((h) => (
        <span key={h} className="inline-flex items-center gap-1 rounded-md bg-slate-800 px-2 py-0.5 text-xs text-slate-200">
          {linkLabel(h, entries) ?? h}
          <button type="button" onClick={() => onChange(hrefs.filter((x) => x !== h))} aria-label={`Remove ${linkLabel(h, entries) ?? h} from ${label}`} className="text-slate-400 hover:text-rose-300"><Icon name="x" size={11} /></button>
        </span>
      ))}
      {hrefs.length < 3 && (
        <select value="" onChange={(e) => e.target.value && onChange([...hrefs, e.target.value])} aria-label={`Add a page to ${label}`} className={`${field} max-w-48 py-0.5 text-xs`}>
          <option value="">Add a page</option>
          {entries.filter((e) => !hrefs.includes(e.href)).map((e, i) => <option key={`${e.href}-${i}`} value={e.href}>{e.label}</option>)}
        </select>
      )}
    </div>
  );
}

/** A plan exercise's own fields, over its block in the day editor: what the plan knows about the block, apart from the block. */
export default function ExerciseMetaForm({ meta, onChange }: { meta: MetaDraft; onChange: (m: MetaDraft) => void }) {
  const set = (p: Partial<MetaDraft>) => onChange({ ...meta, ...p });
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <input value={meta.titleText} onChange={(e) => set({ titleText: e.target.value })} aria-label="Title" placeholder="Title #guitar #beginner #technique" className={`${field} min-w-0 flex-1 text-base`} />
        <label className="flex items-center gap-1.5 text-xs text-slate-400">
          <input type="number" min={1} max={120} value={meta.minutes} onChange={(e) => set({ minutes: Math.min(120, Math.max(1, Math.round(Number(e.target.value)) || 1)) })} aria-label="Minutes" className={`${field} w-16`} />
          min
        </label>
      </div>
      <input value={meta.why} onChange={(e) => set({ why: e.target.value })} aria-label="Why" placeholder="Why: what this exercise builds" className={`${field} text-xs`} />
      <Links label="Learn before" hrefs={meta.learnBefore} onChange={(learnBefore) => set({ learnBefore })} />
      <Links label="Explore more" hrefs={meta.exploreMore} onChange={(exploreMore) => set({ exploreMore })} />
    </div>
  );
}
