"use client";

import { useMemo } from "react";
import { playSequence } from "@/features/sound";
import { tabFor, type MelodyNote } from "@/lib/chordKit/tab";

const NAMES = ["e", "B", "G", "D", "A", "E"];
const BEAT_MS = 450;

/** A melody as six-line guitar tab (high e on top), spaced by note length, with a play button. */
export default function Tab({ title, origin, notes, position }: { title: string; origin: string; notes: MelodyNote[]; position: number }) {
  const tab = useMemo(() => tabFor(notes, position), [notes, position]);
  const unit = 28, left = 24, top = 16, row = 19;
  const xs: number[] = [];
  let x = left + 16;
  tab.forEach((n) => {
    xs.push(x);
    x += Math.max(1, n.beats) * unit;
  });
  const W = x + 10, H = top + 5 * row + 12;
  const play = () => {
    let at = 0;
    playSequence(tab.map((n) => {
      const step = { note: n.midi, at, hold: n.beats * BEAT_MS * 0.9 };
      at += n.beats * BEAT_MS;
      return step;
    }));
  };
  return (
    <figure className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
      <figcaption className="mb-1 flex flex-wrap items-baseline gap-2">
        <b className="text-sm text-slate-100">{title}</b>
        <span className="text-xs text-slate-500">{origin}</span>
        <button type="button" onClick={play} className="cursor-pointer ml-auto rounded-lg border border-sky-500/60 px-2 py-0.5 text-xs text-sky-200 hover:bg-sky-500/10">▶ Play</button>
      </figcaption>
      <div className="min-w-0">
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: W }} role="img" aria-label={`Tab for ${title}`} className="font-mono">
          {NAMES.map((nm, i) => (
            <g key={nm + i}>
              <text x={4} y={top + i * row} dominantBaseline="central" fontSize={11} fill="var(--color-slate-500)">{nm}</text>
              <line x1={left} x2={W - 4} y1={top + i * row} y2={top + i * row} stroke="var(--color-slate-700)" />
            </g>
          ))}
          {tab.map((n, i) => {
            const y = top + (5 - n.string) * row;
            return (
              <g key={i}>
                <rect x={xs[i] - 9} y={y - 8} width={18} height={16} rx={3} fill="var(--color-slate-950)" />
                <text x={xs[i]} y={y} textAnchor="middle" dominantBaseline="central" fontSize={13} fontWeight={600} fill="var(--color-slate-100)">{n.fret}</text>
              </g>
            );
          })}
        </svg>
      </div>
    </figure>
  );
}
