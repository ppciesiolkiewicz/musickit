"use client";

/** Shared drawing for the fretboard diagrams (CAGED boxes and arpeggios): the board, frets, strings and markers. */

export interface FretGeometry {
  from: number;
  to: number;
  cols: number;
  colW: number;
  rowH: number;
  left: number;
  top: number;
  W: number;
  H: number;
  /** x of the left edge of the column of fret f (f from `from` to `to + 1`; the column of fret f is the space just before fret line f) */
  edge: (f: number) => number;
  /** x of the middle of fret f (fret 0 is the open-string column) */
  fx: (f: number) => number;
  /** y of string s (0 = low E, drawn at the bottom) */
  sy: (s: number) => number;
}

export const STRING_NAMES = ["E", "A", "D", "G", "B", "e"];

/**
 * How wide the column of fret f is, as a multiple of the base column width. On a real guitar each fret is about 5.6% closer
 * to the last one (2^(-1/12)), so the low frets are roughly 1.4x the base and the 12th about 0.75x. The open-string column
 * is as wide as the first fret. Very high frets are kept from getting too narrow for a note dot.
 */
export const fretWidthFactor = (f: number): number => Math.max(0.7, 1.41 * 2 ** (-(Math.max(f, 1) - 1) / 12));

export function fretGeometry(from: number, to: number, colW = 56, rowH = 38): FretGeometry {
  const cols = to - from + 1;
  const left = 40, top = 22, right = 14, bottom = 38;
  const edge = (f: number) => {
    let x = left;
    for (let k = from; k < f; k++) x += colW * fretWidthFactor(k);
    return x;
  };
  return {
    from, to, cols, colW, rowH, left, top, edge,
    W: edge(to + 1) + right,
    H: top + 5 * rowH + bottom,
    fx: (f) => edge(f) + (colW * fretWidthFactor(f)) / 2,
    sy: (s) => top + (5 - s) * rowH,
  };
}

const BOARD = "#0d1526";
const FRET = "#3a4a66";
const NUT = "#cbd5e1";
const STRING = ["#a8b3c4", "#a8b3c4", "#98a4b8", "#8693a8", "#7a869b", "#6e7a8f"];

/** The board itself. Draw note dots after it, inside the same <svg>. */
export function FretboardBase({ g, markerSize = 6 }: { g: FretGeometry; markerSize?: number }) {
  const { from, to, cols, left, edge, fx, sy } = g;
  const boardL = left, boardR = edge(to + 1), boardT = sy(5) - 14, boardB = sy(0) + 14;
  const single = [3, 5, 7, 9, 15, 17].filter((f) => f >= from && f <= to);
  const double = from <= 12 && to >= 12;
  const mid = (a: number, b: number) => (sy(a) + sy(b)) / 2;
  return (
    <g>
      <rect x={boardL} y={boardT} width={boardR - boardL} height={boardB - boardT} rx={8} fill={BOARD} stroke="#1c2840" />
      {single.map((f) => <circle key={f} cx={fx(f)} cy={mid(2, 3)} r={markerSize} fill="#18233a" />)}
      {double && (
        <>
          <circle cx={fx(12)} cy={mid(1, 2)} r={markerSize} fill="#18233a" />
          <circle cx={fx(12)} cy={mid(3, 4)} r={markerSize} fill="#18233a" />
        </>
      )}
      {Array.from({ length: cols + 1 }, (_, i) => {
        const isNut = from === 0 && i === 1;
        // the open-string column of a box that starts at the nut is separated by the nut
        if (from === 0 && i === 0) return null;
        return <line key={i} x1={edge(from + i)} x2={edge(from + i)} y1={boardT + 3} y2={boardB - 3} stroke={isNut ? NUT : FRET} strokeWidth={isNut ? 5 : 1.5} strokeLinecap="round" />;
      })}
      {Array.from({ length: 6 }, (_, s) => (
        <g key={s}>
          <line x1={boardL + 4} x2={boardR - 4} y1={sy(s)} y2={sy(s)} stroke={STRING[s]} strokeWidth={0.8 + (5 - s) * 0.32} opacity={0.75} />
          <text x={left - 14} y={sy(s)} textAnchor="middle" dominantBaseline="central" fontSize={11} fill="#64748b">{STRING_NAMES[s]}</text>
        </g>
      ))}
      {Array.from({ length: cols }, (_, i) => {
        const f = from + i;
        return <text key={f} x={fx(f)} y={boardB + 18} textAnchor="middle" fontSize={11} fill={f === 0 ? "#64748b" : "#94a3b8"}>{f === 0 ? "open" : f}</text>;
      })}
    </g>
  );
}

/** A tiny scale-degree marker hugging the top right of a dot of radius r at (x, y). */
export function Badge({ x, y, r, text, colour }: { x: number; y: number; r: number; text: string; colour: string }) {
  const bx = x + r * 0.78 + 2, by = y - r * 0.78 - 2;
  return (
    <g pointerEvents="none">
      <circle cx={bx} cy={by} r={6.5} fill={BOARD} stroke={colour} strokeWidth={1.5} />
      <text x={bx} y={by + 0.5} textAnchor="middle" dominantBaseline="central" fontSize={text.length > 1 ? 6.8 : 8.2} fontWeight={700} fill="#f1f5f9">{text}</text>
    </g>
  );
}
