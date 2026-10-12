"use client";

import { FretboardBase, fretGeometry } from "@/components/chordKit/Fretboard";

/** One dot on the neck. string 0 = low E. */
export interface NeckDot { string: number; fret: number; label: string; fill: string; text?: string; outline?: boolean; big?: boolean }

interface Props {
  from?: number;
  to: number;
  dots: NeckDot[];
  /** tap a fret cell (string, fret) */
  onCell?: (string: number, fret: number) => void;
  /** shade a cell (heatmaps, a highlighted window) */
  cellFill?: (string: number, fret: number) => string | undefined;
  /** a translucent band over these frets */
  window?: { from: number; to: number; colour?: string };
  compact?: boolean;
}

/** A plain fretboard with labelled dots and optional tappable cells. Shared by the basics page, the practice games and the CAGED neighbours. */
export default function NoteNeck({ from = 0, to, dots, onCell, cellFill, window, compact }: Props) {
  const g = compact ? fretGeometry(from, to, 36, 24, 22) : fretGeometry(from, to, 50, 32, 22);
  const r = compact ? 9 : 12;
  const cells: { s: number; f: number }[] = [];
  for (let s = 0; s < 6; s++) for (let f = from; f <= to; f++) cells.push({ s, f });
  const colLeft = (f: number) => g.edge(f);
  const colW = (f: number) => g.edge(f + 1) - g.edge(f);
  return (
    <svg viewBox={`0 0 ${g.W} ${g.H}`} width="100%" role="img" aria-label="Fretboard" style={{ minWidth: Math.min(g.W, 520) }}>
      <FretboardBase g={g} markerSize={compact ? 4 : 6} />
      {window && (
        <rect x={colLeft(Math.max(from, window.from))} y={g.sy(5) - 14} width={g.edge(Math.min(to, window.to) + 1) - colLeft(Math.max(from, window.from))} height={g.sy(0) - g.sy(5) + 28} rx={6} fill={window.colour ?? "#38bdf8"} opacity={0.12} pointerEvents="none" />
      )}
      {cellFill && cells.map(({ s, f }) => {
        const c = cellFill(s, f);
        return c ? <rect key={`h${s}-${f}`} x={colLeft(f) + 2} y={g.sy(s) - g.rowH / 2 + 2} width={colW(f) - 4} height={g.rowH - 4} rx={4} fill={c} pointerEvents="none" /> : null;
      })}
      {onCell && cells.map(({ s, f }) => (
        <rect key={`c${s}-${f}`} x={colLeft(f)} y={g.sy(s) - g.rowH / 2} width={colW(f)} height={g.rowH} fill="transparent" style={{ cursor: "pointer" }} onClick={() => onCell(s, f)}>
          <title>{`string ${6 - s}, fret ${f}`}</title>
        </rect>
      ))}
      {dots.map((d, i) => {
        const rr = d.big ? r + 2 : r;
        return (
          <g key={i} pointerEvents="none">
            <circle cx={g.fx(d.fret)} cy={g.sy(d.string)} r={rr} fill={d.outline ? "var(--color-slate-950)" : d.fill} stroke={d.fill} strokeWidth={d.outline ? 2.5 : 1} />
            <text x={g.fx(d.fret)} y={g.sy(d.string)} textAnchor="middle" dominantBaseline="central" fontSize={d.label.length > 2 ? 8 : 10} fontWeight={700} fill={d.outline ? d.fill : d.text ?? "#0f172a"}>{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
}
