"use client";

import { useMemo, useState } from "react";
import { Chip, ChipRow, Info } from "./ui";
import { KeyPicker } from "./KeyPicker";
import { INVERSIONS, STRING_GROUPS, TRIAD_QUALITIES, triadVoicings, type TriadQuality, type TriadVoicing } from "@/lib/chordKit/triads";
import { GROUP_SWATCH, swatchFor } from "./palette";
import { strum } from "@/lib/chordKit/playback";
import { TONICS } from "@/lib/chordKit/theory";

/** Small chord box for three adjacent strings. */
function TriadBox({ v, onPlay, active }: { v: TriadVoicing; onPlay: () => void; active: boolean }) {
  const q = TRIAD_QUALITIES.find((x) => x.id === v.quality)!;
  const ss = 20, fsz = 24, left = 34, top = 26;
  const fretted = v.frets.filter((f) => f > 0);
  const lo = fretted.length ? Math.min(...fretted) : 1;
  const rows = Math.max(4, Math.max(...v.frets) - lo + 1);
  const w = left + 5 * ss + 16, h = top + rows * fsz + 10;
  return (
    <button type="button" onClick={onPlay} title="Click to hear it" className={`rounded-lg p-1 text-center transition hover:bg-slate-800/60 ${active ? "bg-slate-800/80 ring-1 ring-sky-400" : ""}`}>
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" role="img" aria-label={`Triad at fret ${v.lowestFret}`}>
        {Array.from({ length: rows + 1 }, (_, i) => <line key={i} x1={left} x2={left + 5 * ss} y1={top + i * fsz} y2={top + i * fsz} stroke="#64748b" strokeWidth={i === 0 && lo === 1 ? 3 : 1} />)}
        {Array.from({ length: 6 }, (_, i) => <line key={i} x1={left + i * ss} x2={left + i * ss} y1={top} y2={top + rows * fsz} stroke="#64748b" strokeWidth={1 + (5 - i) * 0.12} />)}
        {lo > 1 && <text x={left - 8} y={top + fsz / 2} textAnchor="end" dominantBaseline="central" fontSize={11} fill="#94a3b8">{lo}fr</text>}
        {Array.from({ length: 6 }, (_, si) => {
          const gi = v.group.strings.indexOf(si);
          const x = left + si * ss;
          if (gi < 0) return <text key={si} x={x} y={top - 10} textAnchor="middle" dominantBaseline="central" fontSize={12} fill="#475569">×</text>;
          const fret = v.frets[gi];
          const label = q.labels[v.tones[gi]];
          const sw = v.tones[gi] === 0 ? GROUP_SWATCH.root : swatchFor(label);
          // open strings sit above the nut as a ring
          const y = fret === 0 ? top - 10 : top + (fret - lo) * fsz + fsz / 2;
          return (
            <g key={si}>
              <circle cx={x} cy={y} r={9} fill={sw.fill} stroke={sw.line} strokeWidth={1.2} />
              <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fill={sw.text} fontSize={label.length > 2 ? 8 : 10} fontWeight={600}>{label}</text>
            </g>
          );
        })}
      </svg>
      <div className="text-[11px] tabular-nums text-slate-500">fret {v.lowestFret === 0 ? "0 (open)" : v.lowestFret}</div>
    </button>
  );
}

export default function TriadsExplorer() {
  const [tonicPc, setTonicPc] = useState(0);
  const [quality, setQuality] = useState<TriadQuality>("maj");
  const [groupIds, setGroupIds] = useState<string[]>(STRING_GROUPS.map((g) => g.id));
  const [playing, setPlaying] = useState<string | null>(null);

  const tonic = TONICS.find((t) => t.pc === tonicPc)!;
  const q = TRIAD_QUALITIES.find((x) => x.id === quality)!;
  const chordName = tonic.name + q.symbol;
  const groups = STRING_GROUPS.filter((g) => groupIds.includes(g.id));

  const data = useMemo(
    () => groups.map((g) => ({ g, inv: INVERSIONS.map((inv) => ({ inv, list: triadVoicings(tonicPc, quality, inv.id as 0 | 1 | 2, g) })) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tonicPc, quality, groupIds.join()],
  );

  const toggleGroup = (id: string) => setGroupIds((s) => (s.includes(id) ? (s.length > 1 ? s.filter((x) => x !== id) : s) : [...s, id]));
  const play = (v: TriadVoicing, id: string) => {
    strum([...v.midi], { gapMs: 60, holdMs: 1200 });
    setPlaying(id);
    setTimeout(() => setPlaying((p) => (p === id ? null : p)), 600);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2.5 rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
        <KeyPicker tonicPc={tonicPc} onTonic={setTonicPc} />
        <ChipRow label="Triad" info="A triad is three notes stacked in thirds. Major is root, major 3rd, 5th. Minor lowers the 3rd. Diminished lowers the 3rd and the 5th. Augmented raises the 5th.">
          {TRIAD_QUALITIES.map((t) => <Chip key={t.id} on={t.id === quality} onClick={() => setQuality(t.id)}>{t.label}</Chip>)}
        </ChipRow>
        <ChipRow label="String group" info="Which three neighbouring strings the triad is played on. Pick several to compare. The 3-2-1 group is the brightest, 6-5-4 the deepest. The other strings are not played.">
          {STRING_GROUPS.map((g) => <Chip key={g.id} on={groupIds.includes(g.id)} onClick={() => toggleGroup(g.id)}>{g.label}</Chip>)}
        </ChipRow>
        <p className="text-xs text-slate-400">
          Showing <b className="text-slate-200">{chordName}</b> ({q.labels.join(" ")}) in every closed voicing on the chosen string groups.
          <Info label="What is a string group?">
            A triad has three notes, so it lives on three neighbouring strings. Each of the four groups gives three shapes by turning the chord upside down: root position (root lowest), 1st inversion (3rd lowest) and 2nd inversion (5th lowest). Closed means the three notes fit inside one octave, so there are no gaps. Each shape repeats an octave higher up the neck.
          </Info>
        </p>
      </div>

      {data.map(({ g, inv }) => (
        <section key={g.id} className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
          <h3 className="mb-3 text-sm font-medium text-slate-100">{g.label}</h3>
          <div className="grid gap-4 md:grid-cols-3">
            {inv.map(({ inv: iv, list }) => (
              <div key={iv.id}>
                <div className="mb-1 flex items-baseline gap-2 text-xs">
                  <b className="text-slate-200">{iv.label}</b>
                  <span className="text-slate-500">bass note is the {["root", "3rd", "5th"][iv.id]}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {list.length === 0 && <p className="col-span-2 text-xs text-slate-500">No closed shape fits within 4 frets.</p>}
                  {list.map((v, i) => <TriadBox key={i} v={v} active={playing === `${g.id}${iv.id}${i}`} onPlay={() => play(v, `${g.id}${iv.id}${i}`)} />)}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
