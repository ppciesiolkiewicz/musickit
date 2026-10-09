"use client";

import { STRING_NAMES, fretWidthFactor } from "./Fretboard";

/** Vertical fretboard for one box or position: strings run top to bottom (low E on the left, like a chord diagram), frets run down the page. */
export interface VGeometry {
  from: number;
  to: number;
  left: number;
  top: number;
  W: number;
  H: number;
  /** y of the top edge of the row of fret f (valid for from..to+1) */
  edge: (f: number) => number;
  /** y of the middle of fret f */
  fy: (f: number) => number;
  /** x of string s (0 = low E on the left) */
  sx: (s: number) => number;
}

export function vGeometry(from: number, to: number, stringW = 38, rowH = 40): VGeometry {
  const left = 30, top = 30, right = 16, bottom = 10;
  const edge = (f: number) => {
    let y = top;
    for (let k = from; k < f; k++) y += rowH * fretWidthFactor(k);
    return y;
  };
  return {
    from, to, left, top,
    W: left + 5 * stringW + right + 14,
    H: edge(to + 1) + bottom,
    edge,
    fy: (f) => edge(f) + (rowH * fretWidthFactor(f)) / 2,
    sx: (s) => left + 14 + s * stringW,
  };
}

const BOARD = "#0d1526";
const FRET = "#3a4a66";
const NUT = "#cbd5e1";
const STRING = ["#a8b3c4", "#a8b3c4", "#98a4b8", "#8693a8", "#7a869b", "#6e7a8f"];

/** The board. Draw note dots after it inside the same <svg>. */
export function VerticalBoard({ g }: { g: VGeometry }) {
  const { from, to, sx, edge, fy } = g;
  const boardL = sx(0) - 14, boardR = sx(5) + 14, boardT = edge(from), boardB = edge(to + 1);
  const single = [3, 5, 7, 9, 15, 17].filter((f) => f >= from && f <= to);
  const double = from <= 12 && to >= 12;
  const mid = (a: number, b: number) => (sx(a) + sx(b)) / 2;
  return (
    <g>
      <rect x={boardL} y={boardT} width={boardR - boardL} height={boardB - boardT} rx={8} fill={BOARD} stroke="#1c2840" />
      {single.map((f) => <circle key={f} cx={mid(2, 3)} cy={fy(f)} r={6} fill="#18233a" />)}
      {double && (
        <>
          <circle cx={mid(1, 2)} cy={fy(12)} r={6} fill="#18233a" />
          <circle cx={mid(3, 4)} cy={fy(12)} r={6} fill="#18233a" />
        </>
      )}
      {Array.from({ length: to - from + 2 }, (_, i) => {
        const f = from + i;
        if (from === 0 && i === 0) return null;
        const isNut = from === 0 && i === 1;
        return <line key={f} x1={boardL + 3} x2={boardR - 3} y1={edge(f)} y2={edge(f)} stroke={isNut ? NUT : FRET} strokeWidth={isNut ? 5 : 1.5} strokeLinecap="round" />;
      })}
      {Array.from({ length: 6 }, (_, s) => (
        <g key={s}>
          <line x1={sx(s)} x2={sx(s)} y1={boardT + 4} y2={boardB - 4} stroke={STRING[s]} strokeWidth={0.8 + (5 - s) * 0.32} opacity={0.75} />
          <text x={sx(s)} y={g.top - 12} textAnchor="middle" fontSize={11} fill="#64748b">{STRING_NAMES[s]}</text>
        </g>
      ))}
      {Array.from({ length: to - from + 1 }, (_, i) => {
        const f = from + i;
        return <text key={f} x={g.left - 4} y={fy(f)} textAnchor="end" dominantBaseline="central" fontSize={11} fill={f === 0 ? "#64748b" : "#94a3b8"}>{f === 0 ? "0" : f}</text>;
      })}
    </g>
  );
}
