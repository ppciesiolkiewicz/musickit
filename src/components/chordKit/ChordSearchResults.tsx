"use client";

import { useMemo, useState } from "react";
import ChordDiagram from "./ChordDiagram";
import { DIFF_CLASS } from "./palette";
import { shapesForTones } from "@/lib/chordKit/chordShapes";
import { STRING_SHORT, STYLE_TAGS, tagCount, tagText } from "@/lib/chordKit/shapeTools";
import { filterChoices } from "@/lib/chordKit/chordSearch";
import { strumShape } from "@/lib/chordKit/playback";
import { Chip, ChipRow } from "@/components/ui";

/** Every shape that plays one chord, simplest first: open chord, first barre, then the rest. */
export default function ChordSearchResults({ rootPc, semis, name }: { rootPc: number; semis: number[]; name: string }) {
  const all = useMemo(() => shapesForTones(rootPc, semis, ["easy", "medium", "hard"]).filter((r) => r.full).map((r) => r.choice), [rootPc, semis]);
  const [selected, setSelected] = useState<string[]>([]);
  const list = filterChoices(all, selected);
  const entries = all.map((c) => ({ shape: c.shape }));
  const tags = [...new Set(all.flatMap((c) => c.shape.tags))];
  const toggle = (t: string) => setSelected((s) => (s.includes(t) ? s.filter((x) => x !== t) : [...s, t]));
  const row = (label: string, ts: string[]) => ts.length > 0 && (
    <ChipRow label={label}>
      {ts.map((t) => <Chip key={t} on={selected.includes(t)} onClick={() => toggle(t)} count={tagCount(entries, t, selected)}>{tagText(t)}</Chip>)}
    </ChipRow>
  );
  if (!all.length) return <p className="rounded-xl border border-dashed border-slate-700 p-6 text-center text-sm text-slate-400">No shape in the library plays {name} yet.</p>;
  return (
    <section aria-label={`Shapes for ${name}`} className="flex flex-col gap-2">
      <div className="flex flex-col gap-2.5 rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
        {row("Difficulty", ["x:easy", "x:medium", "x:hard"].filter((t) => all.some((c) => "x:" + c.shape.diff === t)))}
        {row("Style", STYLE_TAGS.filter((t) => tags.includes(t)))}
        {row("Shape", tags.filter((t) => !STYLE_TAGS.includes(t)))}
      </div>
      <p className="text-xs text-slate-400"><b className="text-slate-200">{list.length}</b> way{list.length === 1 ? "" : "s"} to play <b className="text-slate-200">{name}</b>, simplest first.</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {list.map((c) => (
          <div key={c.shape.id} className="rounded-lg border border-slate-800 bg-slate-950/50 p-2">
            <div className="mb-1 flex items-center gap-1.5 text-xs">
              <span className={`rounded-full border px-1.5 ${DIFF_CLASS[c.shape.diff]}`}>{c.shape.diff}</span>
              {c.shape.at !== undefined ? <span className="text-sky-300">open</span> : c.shape.v && <span className="text-slate-400">{c.shape.v}</span>}
            </div>
            <ChordDiagram shape={c.shape} rootFret={c.fret} onPlay={() => strumShape(c.shape, c.fret)} />
            <div className="text-xs text-slate-500">{c.shape.at !== undefined ? "open position" : `${STRING_SHORT[c.shape.rs]} string root · fret ${c.fret}`}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
