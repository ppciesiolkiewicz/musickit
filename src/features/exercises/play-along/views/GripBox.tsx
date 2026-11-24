"use client";

import { swatchFor } from "@/components/chordKit/palette";
import { gripName } from "@/lib/chordKit/gripName";
import { OPEN_MIDI } from "@/lib/chordKit/shapeTools";
import type { Fret } from "../../cues/cues";

/** Only a column with this many notes or more is a chord to show as a box; fewer is a double stop or a note. */
export const GRIP_MIN = 3;

const SS = 16, ROW = 20, LEFT = 28, TOP = 30;

/**
 * A small chord box for the frets a tab column holds together: the chord's name over it, a dot a string labelled with
 * its interval (R, 3, ♭7, 9) and coloured like every chord box, × on a string not played. No fingering: a riff writes
 * none. The name is `chord` when it holds every note, else read from the notes.
 */
export function GripBox({ frets, chord }: { frets: Fret[]; chord?: string }) {
  const held = [...frets].sort((a, b) => a.string - b.string);
  const named = gripName(held.map((f) => OPEN_MIDI[f.string] + f.fret), chord || undefined);
  const fretted = held.filter((f) => f.fret > 0).map((f) => f.fret);
  const lo = !fretted.length || held.some((f) => f.fret === 0) || Math.max(...fretted) <= 4 ? 1 : Math.min(...fretted);
  const rows = Math.max(4, (fretted.length ? Math.max(...fretted) : 1) - lo + 1);
  const w = LEFT + 5 * SS + 14, h = TOP + rows * ROW + 8;
  const grid = "var(--color-slate-500)";

  return (
    <div className="flex w-30 flex-col items-center rounded-lg border border-slate-700 bg-slate-900/95 px-2 pb-1 pt-1.5 shadow-xl">
      {named && <div className="text-sm font-bold text-slate-100">{named.name}</div>}
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" role="img" aria-label={`Chord box${named ? ` for ${named.name}` : ""}`}>
        {Array.from({ length: rows + 1 }, (_, i) => (
          <line key={`f${i}`} x1={LEFT} x2={LEFT + 5 * SS} y1={TOP + i * ROW} y2={TOP + i * ROW} stroke={grid} strokeWidth={i === 0 && lo === 1 ? 3 : 1} />
        ))}
        {Array.from({ length: 6 }, (_, s) => (
          <line key={`s${s}`} x1={LEFT + s * SS} x2={LEFT + s * SS} y1={TOP} y2={TOP + rows * ROW} stroke={grid} strokeWidth={1 + (5 - s) * 0.12} />
        ))}
        {lo > 1 && <text x={LEFT - 8} y={TOP + ROW / 2} textAnchor="end" dominantBaseline="central" fontSize={10} fill="var(--color-slate-400)">{lo}fr</text>}
        {Array.from({ length: 6 }, (_, s) => {
          const x = LEFT + s * SS;
          const k = held.findIndex((f) => f.string === s);
          if (k < 0) return <text key={s} x={x} y={TOP - 10} textAnchor="middle" dominantBaseline="central" fontSize={11} fill={grid}>×</text>;
          const { fret } = held[k];
          const label = named?.labels[k] ?? "";
          const sw = swatchFor(label || "R");
          if (fret === 0)
            return (
              <g key={s}>
                <circle cx={x} cy={TOP - 11} r={7} fill="var(--color-slate-950)" stroke={sw.fill} strokeWidth={1.6} />
                <text x={x} y={TOP - 11} textAnchor="middle" dominantBaseline="central" fill={sw.fill} fontSize={label.length > 2 ? 6 : 7.5} fontWeight={700}>{label}</text>
              </g>
            );
          const y = TOP + (fret - lo) * ROW + ROW / 2;
          return (
            <g key={s}>
              <circle cx={x} cy={y} r={8} fill={sw.fill} stroke={sw.line} strokeWidth={1.2} />
              <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fill={sw.text} fontSize={label.length > 2 ? 7 : 9} fontWeight={600}>{label}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
