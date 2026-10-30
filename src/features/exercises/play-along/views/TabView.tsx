"use client";

import { tabOf } from "../../cues/tab";
import { isNow, shade, type ViewProps } from "./common";

const NAMES = ["e", "B", "G", "D", "A", "E"];

/** Six-line tab (high e on top), one column per strum or note, spaced by beat, with a playhead. */
export default function TabView({ cues, pos, length }: ViewProps) {
  const shown = cues.filter((c) => c.frets.length);
  const cols = tabOf(shown);
  const unit = 30, left = 24, top = 14, row = 18;
  const x = (at: number) => left + 14 + at * unit;
  const W = x(length) + 6, H = top + 5 * row + 12;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: W }} role="img" aria-label="Tab" className="font-mono">
      {NAMES.map((nm, i) => (
        <g key={i}>
          <text x={4} y={top + i * row} dominantBaseline="central" fontSize={11} fill="var(--color-slate-500)">{nm}</text>
          <line x1={left} x2={W - 4} y1={top + i * row} y2={top + i * row} stroke="var(--color-slate-700)" />
        </g>
      ))}
      {Array.from({ length: length / 4 + 1 }, (_, b) => (
        <line key={b} x1={x(b * 4) - 10} x2={x(b * 4) - 10} y1={top} y2={top + 5 * row} stroke="var(--color-slate-600)" />
      ))}
      {cols.map((col, i) => {
        const now = isNow(shown[i], pos);
        return col.cells.map((f) => {
          const y = top + (5 - f.string) * row;
          return (
            <g key={`${i}-${f.string}`}>
              <rect x={x(col.at) - 8} y={y - 7} width={16} height={14} rx={3} fill="var(--color-slate-950)" />
              <text x={x(col.at)} y={y} textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={600} fill={shade(shown[i], now)}>{f.fret}</text>
            </g>
          );
        });
      })}
      {pos >= 0 && <line x1={x(pos) - 10} x2={x(pos) - 10} y1={top - 6} y2={top + 5 * row + 6} stroke="var(--color-sky-400)" strokeWidth={2} />}
    </svg>
  );
}
