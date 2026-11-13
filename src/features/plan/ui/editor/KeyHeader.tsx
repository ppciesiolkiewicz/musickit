"use client";

import { Select } from "@/components/ui";
import { tonicName } from "@/features/theory";
import { PENTATONICS } from "@/features/theory/pentatonics";
import { MODE_PAGES } from "@/features/theory/scales";
import type { ChoiceOption } from "../../model/tools";

const KEYS = Array.from({ length: 12 }, (_, pc) => ({ value: pc, label: tonicName(pc) }));
const SCALES = [...MODE_PAGES.map((m) => ({ value: m.slug, label: m.name })), ...PENTATONICS.map((p) => ({ value: p.slug, label: p.name }))];

/**
 * The block's key bar while it is written: Key and Scale, which every tool that follows them takes at once; a block with no key
 * offers Add key (C major to start).
 */
export default function KeyHeader({ value, onChange }: { value: ChoiceOption | null; onChange: (v: ChoiceOption) => void }) {
  if (!value) {
    return (
      <button type="button" onClick={() => onChange({ key: 0, scale: MODE_PAGES[0].slug })} className="w-fit rounded-md border border-dashed border-slate-600 px-3 py-1.5 text-sm text-slate-300 hover:border-slate-400 hover:text-slate-100">
        Add key
      </button>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <label className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-400">
        Key
        <Select value={value.key ?? 0} onChange={(key) => onChange({ ...value, key })} options={KEYS} size="sm" aria-label="Key" />
      </label>
      <label className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-400">
        Scale
        <Select value={value.scale ?? MODE_PAGES[0].slug} onChange={(scale) => onChange({ ...value, scale })} options={SCALES} size="sm" aria-label="Scale" />
      </label>
    </div>
  );
}
