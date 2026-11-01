"use client";

import { tabOf } from "../../cues/tab";
import { BEATS_PER_BAR } from "../../timeline/timeline";
import { isNow, rowsOf, shade, useWidth, zoomFor, type ViewProps } from "./common";

const NAMES = ["e", "B", "G", "D", "A", "E"];
const LEFT = 24, TOP = 14, ROW = 18, PAD = 14;

/** Six-line tab (high e on top), one column per strum or note, spaced by beat, with a playhead; wrapped into rows of whole bars that fill the width. */
export default function TabView({ cues, pos, length }: ViewProps) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const shown = cues.filter((c) => c.frets.length);
  const cols = tabOf(shown);
  const zoom = zoomFor(width);
  const W = width / zoom;
  const { rows, unit } = rowsOf(length, W - 6, LEFT + PAD, 26, 80);
  const H = TOP + 5 * ROW + 12;
  const bar = Math.min(10, unit / 3);

  return (
    <div ref={ref} className="flex w-full flex-col gap-3">
      {rows.map(([start, end]) => {
        const x = (at: number) => LEFT + PAD + (at - start) * unit;
        const right = x(end) - bar;
        return (
          <svg key={start} viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Tab" className="font-mono">
            {NAMES.map((nm, i) => (
              <g key={i}>
                <text x={4} y={TOP + i * ROW} dominantBaseline="central" fontSize={11} fill="var(--color-slate-500)">{nm}</text>
                <line x1={LEFT} x2={right} y1={TOP + i * ROW} y2={TOP + i * ROW} stroke="var(--color-slate-700)" />
              </g>
            ))}
            {Array.from({ length: (end - start) / BEATS_PER_BAR + 1 }, (_, b) => {
              const bx = b === 0 ? LEFT : x(start + b * BEATS_PER_BAR) - bar;
              return <line key={b} x1={bx} x2={bx} y1={TOP} y2={TOP + 5 * ROW} stroke="var(--color-slate-600)" />;
            })}
            {cols.map((col, i) => {
              if (col.at < start || col.at >= end) return null;
              const now = isNow(shown[i], pos);
              return col.cells.map((f) => {
                const y = TOP + (5 - f.string) * ROW;
                return (
                  <g key={`${i}-${f.string}`}>
                    <rect x={x(col.at) - 8} y={y - 7} width={16} height={14} rx={3} fill="var(--color-slate-950)" />
                    <text x={x(col.at)} y={y} textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={600} fill={shade(shown[i], now)}>{f.fret}</text>
                  </g>
                );
              });
            })}
            {pos >= start && pos < end && <line x1={x(pos) - bar} x2={x(pos) - bar} y1={TOP - 6} y2={TOP + 5 * ROW + 6} stroke="var(--color-sky-400)" strokeWidth={2} />}
          </svg>
        );
      })}
    </div>
  );
}
