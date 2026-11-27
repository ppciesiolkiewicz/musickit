"use client";

import { useNotePlayer } from "@/components/chordKit/useNotePlayer";
import { DOT_INK } from "@/features/theory/scales";
import { named } from "./NamesChart";

/** Standard tuning, low E first, as MIDI notes: each string 5 semitones over the one under it, 4 from G to B. */
const STRINGS = [40, 45, 50, 55, 59, 64];
const STRING_NAMES = ["E", "A", "D", "G", "B", "e"];
const FRETS = 12, DO = 60; // Do is C, as on the piano chart
const FW = 56, SH = 34, LEFT = 40, TOP = 22, NUT = 34;
const MARKERS = [3, 5, 7, 9];

/**
 * The `names` block `on: "guitar"`: frets 0 to 12 of a guitar in standard tuning with every note named from Do (C), its
 * interval on the dot and its colour, as on the piano chart (`named` in `NamesChart.tsx`), the low E string at the bottom
 * as on the app's other necks. Tap a dot to hear it.
 */
export default function NamesNeck() {
  const { active, tap } = useNotePlayer();
  const width = LEFT + NUT + FRETS * FW + 8, height = TOP + 5 * SH + 30;
  const y = (s: number) => TOP + (5 - s) * SH; // s 0 = low E, drawn at the bottom
  const x = (f: number) => (f === 0 ? LEFT + NUT / 2 - 4 : LEFT + NUT + (f - 0.5) * FW);
  return (
    // 78 dots of short labels, kept out of search snippets; the svg's aria-label names the neck
    <figure data-nosnippet className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[40rem] select-none" role="group" aria-label="A guitar neck, frets 0 to 12, every note named from Do">
        {MARKERS.map((f) => <circle key={f} cx={x(f)} cy={TOP + 2.5 * SH} r={5} fill="var(--color-slate-700)" />)}
        {[TOP + 1.5 * SH, TOP + 3.5 * SH].map((cy) => <circle key={cy} cx={x(12)} cy={cy} r={5} fill="var(--color-slate-700)" />)}
        <line x1={LEFT + NUT} x2={LEFT + NUT} y1={TOP} y2={y(0)} stroke="var(--color-slate-300)" strokeWidth={4} />
        {Array.from({ length: FRETS }, (_, i) => <line key={i} x1={LEFT + NUT + (i + 1) * FW} x2={LEFT + NUT + (i + 1) * FW} y1={TOP} y2={y(0)} stroke="var(--color-slate-600)" strokeWidth={1.5} />)}
        {STRINGS.map((_, s) => (
          <g key={s}>
            <line x1={LEFT + NUT} x2={width - 8} y1={y(s)} y2={y(s)} stroke="var(--color-slate-500)" strokeWidth={1 + (5 - s) * 0.3} />
            <text x={12} y={y(s)} dominantBaseline="central" fontSize={12} fontWeight={600} fill="var(--color-slate-400)">{STRING_NAMES[s]}</text>
          </g>
        ))}
        {Array.from({ length: FRETS + 1 }, (_, f) => <text key={f} x={x(f)} y={height - 8} textAnchor="middle" fontSize={11} fill="var(--color-slate-500)">{f === 0 ? "open" : f}</text>)}
        {STRINGS.flatMap((open, s) => Array.from({ length: FRETS + 1 }, (_, f) => {
          const midi = open + f, n = named((((midi - DO) % 12) + 12) % 12, 1), key = `neck-${s}-${f}`, root = n.semis === 0;
          return (
            <g key={key} role="button" aria-label={`${n.solfege}, ${n.name}, ${STRING_NAMES[s]} string fret ${f}, tap to hear`} onPointerDown={() => tap(key, midi)} className="cursor-pointer">
              <circle cx={x(f)} cy={y(s)} r={13} fill={active === key ? "var(--color-sky-300)" : n.colour} stroke={root ? "var(--color-slate-50)" : DOT_INK} strokeWidth={root ? 2.4 : 1.2} />
              <text x={x(f)} y={y(s) + 0.5} textAnchor="middle" dominantBaseline="central" fontSize={10.5} fontWeight={700} fill={DOT_INK}>{n.interval}</text>
            </g>
          );
        }))}
      </svg>
    </figure>
  );
}
