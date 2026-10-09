"use client";

import type { Shape } from "@/lib/chordKit/shapes";
import { fmtInterval } from "@/lib/chordKit/labels";
import { intervalLabel, OPEN_PITCH, ROOT_INDEX } from "@/lib/chordKit/shapeTools";
import { GROUP_SWATCH, swatchFor } from "./palette";

interface Props {
  shape: Shape;
  /** fret where the root note sits */
  rootFret: number;
  /** called when the diagram is clicked (e.g. to strum it) */
  onPlay?: () => void;
  active?: boolean;
}

/** A chord box: six strings, frets, and one labelled dot per sounding string. */
export default function ChordDiagram({ shape, rootFret, onPlay, active }: Props) {
  const ss = 18, fsz = 24, left = 36, top = 26;
  const ri = ROOT_INDEX[shape.rs];
  const abs = shape.f.map((v) => (v === null ? null : rootFret + v));
  // open strings (fret 0) sit above the nut, so only fretted notes set the size of the box
  const fretted = abs.filter((v): v is number => v !== null && v > 0);
  const lo = fretted.length ? Math.min(...fretted) : 1;
  const hi = fretted.length ? Math.max(...fretted) : 1;
  const rows = Math.max(4, hi - lo + 1);
  const w = left + 5 * ss + 18;
  const h = top + rows * fsz + 10;
  const grid = "#64748b";

  const svg = (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" role="img" aria-label="Chord diagram">
      {Array.from({ length: rows + 1 }, (_, i) => (
        <line key={`f${i}`} x1={left} x2={left + 5 * ss} y1={top + i * fsz} y2={top + i * fsz} stroke={grid} strokeWidth={i === 0 && lo === 1 ? 3 : 1} />
      ))}
      {Array.from({ length: 6 }, (_, i) => (
        <line key={`s${i}`} x1={left + i * ss} x2={left + i * ss} y1={top} y2={top + rows * fsz} stroke={grid} strokeWidth={1 + (5 - i) * 0.12} />
      ))}
      {lo > 1 && (
        <text x={left - 10} y={top + fsz / 2} textAnchor="end" dominantBaseline="central" fontSize={11} fill="#94a3b8">
          {lo}fr
        </text>
      )}
      {abs.map((a, i) => {
        const x = left + i * ss;
        if (a === null)
          return (
            <text key={i} x={x} y={top - 10} textAnchor="middle" dominantBaseline="central" fontSize={12} fill={grid}>
              ×
            </text>
          );
        const semi = (((OPEN_PITCH[i] + (shape.f[i] as number) - OPEN_PITCH[ri]) % 12) + 12) % 12;
        const label = fmtInterval(intervalLabel(shape, semi));
        const sw = semi === 0 ? GROUP_SWATCH.root : swatchFor(label);
        const y = a === 0 ? top - 12 : top + (a - lo) * fsz + fsz / 2;
        return (
          <g key={i}>
            <circle cx={x} cy={y} r={9} fill={sw.fill} stroke={sw.line} strokeWidth={1.2} />
            <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fill={sw.text} fontSize={label.length > 2 ? 8 : 10} fontWeight={600}>
              {label}
            </text>
          </g>
        );
      })}
    </svg>
  );

  if (!onPlay) return svg;
  return (
    <button
      type="button"
      onClick={onPlay}
      title="Click to hear it"
      className={`block w-full cursor-pointer rounded-lg transition hover:bg-slate-800/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400 ${active ? "bg-slate-800/80 ring-1 ring-sky-400" : ""}`}
    >
      {svg}
    </button>
  );
}
