"use client";

import Icon from "@/components/Icon";
import { FAMILIES, TONICS, modeAlias, shortModeName } from "@/features/theory";
import { LabelSelect } from "@/features/theory/useLabelSystem";
import { useCreatorKey } from "./KeyProvider";
import { keySignature } from "./model/key";
import { Chip, Select } from "@/components/ui";

/** The key selector: twelve tonics, a scale family and a mode, and a way back to no key at all. */
export default function KeyBar() {
  const { choice, ctx, title, setTonic, setMode, clear } = useCreatorKey();
  const sig = keySignature(choice);
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-slate-800 bg-slate-900/50 p-2.5" role="group" aria-label="Key">
      <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Tonic">
        <Chip on={choice.tonicPc === null} onClick={clear} title="No key: the plugins show the general picture">Any</Chip>
        {TONICS.map((t) => (
          <Chip key={t.pc} on={t.pc === choice.tonicPc} onClick={() => setTonic(t.pc)}>{t.name}</Chip>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Select size="lg" value={choice.family} onChange={(f) => setMode(f, 0)} aria-label="Scale family" options={FAMILIES.map((f, i) => ({ value: i, label: f.label }))} />
        <Select
          size="lg"
          value={choice.mode}
          onChange={(k) => setMode(choice.family, k)}
          aria-label="Mode"
          options={FAMILIES[choice.family].names.map((n, i) => {
            const alias = modeAlias(choice.family, i);
            return { value: i, label: alias ? `${shortModeName(n)} (${alias})` : shortModeName(n) };
          })}
        />
      </div>
      <LabelSelect />
      <div className="ml-auto flex items-center gap-2 text-sm">
        <span className="font-medium text-slate-100">{title}</span>
        {ctx && <span className="text-slate-500">{ctx.names.join(" ")}</span>}
        {sig && <span className="rounded-md border border-slate-700 px-1.5 py-0.5 text-xs text-slate-400" title="Key signature of the parent major scale">{sig.kind === "none" ? "no ♯ or ♭" : `${sig.count}${sig.kind === "sharps" ? "♯" : "♭"}`}</span>}
        {ctx && <button type="button" className="grid h-7 w-7 place-items-center rounded-lg border border-slate-700 text-slate-300 hover:border-slate-500" onClick={clear} title="Clear the key" aria-label="Clear the key"><Icon name="x" size={14} /></button>}
      </div>
    </div>
  );
}
