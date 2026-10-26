"use client";

import { useState } from "react";
import { TriadBox } from "@/components/chordKit/TriadsExplorer";
import { INVERSIONS, STRING_GROUPS, TRIAD_QUALITIES, triadVoicings, type TriadQuality } from "@/lib/chordKit/triads";
import { strum } from "@/features/sound";
import { useCreatorKey } from "../KeyProvider";
import { Select } from "@/components/ui";
import { Body, Hint } from "./common";

/** The triad on a degree of the key in its three inversions on one string group. With no key: C major. */
export default function TriadsPlugin() {
  const { ctx, title } = useCreatorKey();
  const [degree, setDegree] = useState(0);
  const [groupAt, setGroupAt] = useState(STRING_GROUPS.length - 1);
  const d = ctx ? Math.min(degree, 6) : 0;
  const chord = ctx?.chords[d];
  const rootPc = ctx ? (ctx.tonic.pc + ctx.steps[d]) % 12 : 0;
  const quality: TriadQuality = chord && chord.tri !== "other" ? chord.tri : "maj";
  const q = TRIAD_QUALITIES.find((x) => x.id === quality)!;
  const group = STRING_GROUPS[groupAt];
  const name = chord ? chord.triadName : "C";
  const [playing, setPlaying] = useState<number | null>(null);

  return (
    <Body
      title={ctx ? `Triads in ${title}` : "Triads"}
      general={!ctx}
      aside={<Select size="xs" aria-label="String group" value={groupAt} onChange={setGroupAt} options={STRING_GROUPS.map((g, i) => ({ value: i, label: `Strings ${g.id.split("").join("-")}` }))} />}
    >
      {ctx ? (
        <div className="flex flex-wrap gap-1" role="group" aria-label="Degree">
          {ctx.chords.map((c) => (
            <button key={c.degree} type="button" aria-pressed={c.degree === d} onClick={() => setDegree(c.degree)} className={`rounded-full border px-2 py-0.5 text-xs ${c.degree === d ? "border-sky-400 bg-sky-500/20 text-sky-100" : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500"}`}>
              {c.roman} <span className="text-slate-400">{c.triadName}</span>
            </button>
          ))}
        </div>
      ) : (
        <Hint>Pick a key above to see the triads of its degrees. Until then, C major.</Hint>
      )}
      <p className="text-xs text-slate-400"><b className="text-slate-200">{name}</b> · {q.labels.join(" ")} · {group.label}</p>
      <div className="grid grid-cols-3 gap-1">
        {INVERSIONS.map((inv) => {
          const v = triadVoicings(rootPc, quality, inv.id as 0 | 1 | 2, group)[0];
          return (
            <div key={inv.id} className="flex flex-col items-center">
              <span className="text-[11px] text-slate-500">{inv.short}</span>
              {v ? <TriadBox v={v} rootPc={rootPc} active={playing === inv.id} onPlay={() => { strum([...v.midi], { gapMs: 60, holdMs: 1200 }); setPlaying(inv.id); setTimeout(() => setPlaying((p) => (p === inv.id ? null : p)), 600); }} /> : <span className="py-6 text-xs text-slate-500">no closed shape</span>}
            </div>
          );
        })}
      </div>
    </Body>
  );
}
