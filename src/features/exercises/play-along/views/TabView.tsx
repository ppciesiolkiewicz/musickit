"use client";

import { useState } from "react";
import { tabOf } from "../../cues/tab";
import { BEATS_PER_BAR } from "../../timeline/timeline";
import { isNow, rowsOf, shade, useWidth, zoomFor, type ViewProps } from "./common";
import { BeatBands } from "./BeatBands";
import { GRIP_MIN, GripBox } from "./GripBox";
import { NoteSign, hasNoteSign } from "./NoteSign";

const NAMES = ["e", "B", "G", "D", "A", "E"];
const LEFT = 24, ROW = 18, PAD = 14;
/** room under the low E for the note-length signs */
const SIGNS = 30;

/**
 * Six-line tab (high e on top), one column per strum or note, spaced by beat, with a playhead and each column's length as a
 * note sign under it; wrapped into rows of whole bars that fill the width. Pointing at (or tapping) a column of three notes
 * or more shows its chord box over it.
 */
export default function TabView({ cues, pos, length }: ViewProps) {
  const [ref, width] = useWidth<HTMLDivElement>();
  // the chord column pointed at, and where its box sits in the view (px from the view's top left)
  const [grip, setGrip] = useState<{ i: number; left: number; top: number } | null>(null);
  const point = (i: number, el: Element) => {
    const box = ref.current?.getBoundingClientRect(), at = el.getBoundingClientRect();
    if (box) setGrip({ i, left: at.left + at.width / 2 - box.left, top: at.top - box.top });
  };
  const shown = cues.filter((c) => c.frets.length);
  const cols = tabOf(shown);
  // a chord name over the tab where each chord starts; room for it on top only when there are chords
  const changes = cues.filter((c, i) => c.chord && c.chord !== cues[i - 1]?.chord);
  const TOP = changes.length ? 32 : 14;
  const zoom = zoomFor(width);
  const W = width / zoom;
  const { rows, unit } = rowsOf(length, W - 6, LEFT + PAD, 26, 80);
  const signs = shown.some((c) => hasNoteSign(c.beats));
  const H = TOP + 5 * ROW + 12 + (signs ? SIGNS : 0);
  const bar = Math.min(10, unit / 3);

  return (
    <div ref={ref} className="relative flex w-full flex-col gap-3" onPointerLeave={() => setGrip(null)}>
      {rows.map(([start, end]) => {
        const x = (at: number) => LEFT + PAD + (at - start) * unit;
        const right = x(end) - bar;
        return (
          <svg key={start} viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Tab" className="font-mono">
            <BeatBands start={start} end={end} x={x} inset={bar} y={TOP - 8} height={H - TOP + 4} />
            {NAMES.map((nm, i) => (
              <g key={i}>
                <text x={4} y={TOP + i * ROW} dominantBaseline="central" fontSize={11} fill="var(--color-slate-500)">{nm}</text>
                <line x1={LEFT} x2={right} y1={TOP + i * ROW} y2={TOP + i * ROW} stroke="var(--color-slate-700)" strokeWidth={i === 5 ? 2.5 : 1} />
              </g>
            ))}
            {Array.from({ length: (end - start) / BEATS_PER_BAR + 1 }, (_, b) => {
              const bx = b === 0 ? LEFT : x(start + b * BEATS_PER_BAR) - bar;
              return <line key={b} x1={bx} x2={bx} y1={TOP} y2={TOP + 5 * ROW} stroke="var(--color-slate-600)" />;
            })}
            {changes.map((c) => c.at >= start && c.at < end && (
              <text key={`ch${c.at}`} x={x(c.at) - 4} y={12} fontSize={12} fontWeight={700} fill={isNow(c, pos) || (pos >= c.at && pos < (changes.find((n) => n.at > c.at)?.at ?? end)) ? "var(--color-sky-300)" : "var(--color-slate-200)"} className="font-sans">{c.chord}</text>
            ))}
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
            {signs && shown.map((c, i) => c.at >= start && c.at < end && hasNoteSign(c.beats) && (
              <NoteSign key={`len${i}`} beats={c.beats} x={x(c.at) - 5} y={TOP + 5 * ROW + 14} color={isNow(c, pos) ? "var(--color-sky-300)" : "var(--color-slate-400)"} />
            ))}
            {cols.map((col, i) => col.at >= start && col.at < end && col.cells.length >= GRIP_MIN && (
              <rect
                key={`grip${i}`}
                x={x(col.at) - 10}
                y={TOP - 8}
                width={20}
                height={5 * ROW + 16}
                fill="transparent"
                className="cursor-help"
                onPointerEnter={(e) => point(i, e.currentTarget)}
                onClick={(e) => (grip?.i === i ? setGrip(null) : point(i, e.currentTarget))}
              />
            ))}
            {pos >= start && pos < end && <line x1={x(pos) - bar} x2={x(pos) - bar} y1={TOP - 6} y2={TOP + 5 * ROW + 6} stroke="var(--color-sky-400)" strokeWidth={2} />}
          </svg>
        );
      })}
      {grip && shown[grip.i] && (
        <div className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full pb-1" style={{ left: grip.left, top: grip.top }}>
          <GripBox frets={shown[grip.i].frets} chord={shown[grip.i].chord} />
        </div>
      )}
    </div>
  );
}
