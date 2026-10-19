"use client";

import { useId } from "react";
import { FretboardBase, fretGeometry } from "@/components/chordKit/Fretboard";
import usePhone from "@/components/usePhone";
import { segment, type NeckPath } from "@/features/course/paths";

/** One dot on the neck. string 0 = low E. `sub` is a small second label under the dot. */
export interface NeckDot { string: number; fret: number; label: string; fill: string; text?: string; outline?: boolean; big?: boolean; sub?: string }

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
  /** static arrows from note to note, drawn under the dots */
  paths?: NeckPath[];
}

/** A plain fretboard with labelled dots and optional tappable cells. Shared by the basics page, the practice games and the CAGED neighbours. */
export default function NoteNeck({ from = 0, to, dots, onCell, cellFill, window, compact, paths }: Props) {
  // a phone fits the whole neck on screen: narrower frets, so the dots come out bigger once it is scaled down
  const phone = usePhone();
  // second labels need room under each dot; a short neck can afford wide frets even on a phone
  const subs = dots.some((d) => d.sub);
  const short = to - from <= 6;
  const g = compact || phone
    ? fretGeometry(from, to, phone ? (short ? 44 : 26) : 36, subs ? 36 : 24, 22)
    : fretGeometry(from, to, 50, subs ? 44 : 32, 22);
  const r = phone ? 10 : compact ? 9 : 12;
  const cells: { s: number; f: number }[] = [];
  for (let s = 0; s < 6; s++) for (let f = from; f <= to; f++) cells.push({ s, f });
  const markerId = useId().replace(/:/g, "");
  const pathColours = [...new Set((paths ?? []).map((p) => p.colour))];
  const colLeft = (f: number) => g.edge(f);
  const colW = (f: number) => g.edge(f + 1) - g.edge(f);
  return (
    <svg viewBox={`0 0 ${g.W} ${g.H}`} width="100%" role="img" aria-label="Fretboard" style={{ maxWidth: g.W * 1.1 }}>
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
      {paths && paths.length > 0 && (
        <g pointerEvents="none">
          <defs>
            {pathColours.map((c, i) => (
              <marker key={c} id={`${markerId}-a${i}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                <path d="M0,0 L10,5 L0,10 z" fill={c} />
              </marker>
            ))}
          </defs>
          {paths.flatMap((p, pi) => p.points.slice(1).map((b, k) => {
            const a = p.points[k];
            const sg = segment({ x: g.fx(a.fret), y: g.sy(a.string) }, { x: g.fx(b.fret), y: g.sy(b.string) }, r + 4);
            return sg && <line key={`p${pi}-${k}`} {...sg} stroke={p.colour} strokeWidth={2.5} strokeLinecap="round" markerEnd={`url(#${markerId}-a${pathColours.indexOf(p.colour)})`} />;
          }))}
        </g>
      )}
      {dots.map((d, i) => {
        const rr = d.big ? r + 2 : r;
        return (
          <g key={i} pointerEvents="none">
            <circle cx={g.fx(d.fret)} cy={g.sy(d.string)} r={rr} fill={d.outline ? "var(--color-slate-950)" : d.fill} stroke={d.fill} strokeWidth={d.outline ? 2.5 : 1} />
            <text x={g.fx(d.fret)} y={g.sy(d.string)} textAnchor="middle" dominantBaseline="central" fontSize={d.label.length > 2 ? 8 : 10} fontWeight={700} fill={d.outline ? d.fill : d.text ?? "#0f172a"}>{d.label}</text>
            {d.sub && <text x={g.fx(d.fret)} y={g.sy(d.string) + rr + 6} textAnchor="middle" dominantBaseline="central" fontSize={8} fontWeight={700} fill={d.fill}>{d.sub}</text>}
          </g>
        );
      })}
    </svg>
  );
}
