"use client";

import type { CagedBox, CagedCell } from "@/lib/chordKit/caged";
import { degreeColour } from "@/lib/chordKit/scales";

export interface Layers {
  chord: boolean;
  arp: boolean;
  pent: boolean;
  scale: boolean;
}
export type LabelMode = "name" | "degree";

const colW = 54, left = 34, top = 24, rowH = 28;
const STRING_NAMES = ["E", "A", "D", "G", "B", "e"];

/** A horizontal slice of the neck for one CAGED box. Chord, arpeggio, pentatonic and scale notes are drawn in layers of decreasing size. */
export default function BoxNeck({ cells, box, layers, labelMode, onNote }: { cells: CagedCell[]; box: CagedBox; layers: Layers; labelMode: LabelMode; onNote: (c: CagedCell) => void }) {
  const cols = box.to - box.from + 1;
  const W = left + cols * colW + 8;
  const H = top + 5 * rowH + 36;
  const fx = (f: number) => left + (f - box.from) * colW + colW / 2;
  const sy = (s: number) => top + (5 - s) * rowH;
  const grid = "#475569";
  const labelFor = (c: CagedCell) => (labelMode === "name" ? c.name : c.degreeText);
  const markers = [3, 5, 7, 9, 15, 17].filter((f) => f >= box.from && f <= box.to);

  const tier = (c: CagedCell): "chord" | "arp" | "pent" | "scale" | null => {
    if (layers.chord && c.inChord) return "chord";
    if (layers.arp && c.arpRole) return "arp";
    if (layers.pent && c.inPent) return "pent";
    if (layers.scale && c.inScale) return "scale";
    return null;
  };

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ minWidth: Math.min(W, 420) }} role="img" aria-label={`${box.letter} shape box, frets ${box.from} to ${box.to}`}>
        {markers.map((f) => <circle key={f} cx={fx(f)} cy={(sy(2) + sy(3)) / 2} r={5} fill="#1e293b" />)}
        {box.from <= 12 && box.to >= 12 && (
          <>
            <circle cx={fx(12)} cy={(sy(1) + sy(2)) / 2} r={5} fill="#1e293b" />
            <circle cx={fx(12)} cy={(sy(3) + sy(4)) / 2} r={5} fill="#1e293b" />
          </>
        )}
        {Array.from({ length: cols + 1 }, (_, i) => {
          const isNut = box.from === 0 && i === 1;
          return <line key={i} x1={left + i * colW} x2={left + i * colW} y1={sy(5) - 8} y2={sy(0) + 8} stroke={grid} strokeWidth={isNut ? 4 : 1} />;
        })}
        {Array.from({ length: 6 }, (_, s) => (
          <g key={s}>
            <line x1={left} x2={left + cols * colW} y1={sy(s)} y2={sy(s)} stroke={grid} strokeWidth={1 + (5 - s) * 0.12} />
            <text x={left - 10} y={sy(s)} textAnchor="end" dominantBaseline="central" fontSize={10} fill="#64748b">{STRING_NAMES[s]}</text>
          </g>
        ))}
        {Array.from({ length: cols }, (_, i) => (
          <text key={i} x={fx(box.from + i)} y={sy(0) + 28} textAnchor="middle" fontSize={11} fill="#94a3b8">{box.from + i === 0 ? "open" : box.from + i}</text>
        ))}
        {cells.map((c) => {
          const t = tier(c);
          if (!t) return null;
          const x = fx(c.fret), y = sy(c.string);
          const colour = c.scaleDegree === null ? "#f43f5e" : degreeColour(c.scaleDegree);
          const label = labelFor(c);
          const key = `${c.string}-${c.fret}`;
          if (t === "scale") {
            return (
              <g key={key} onClick={() => onNote(c)} style={{ cursor: "pointer" }} opacity={0.8}>
                <circle cx={x} cy={y} r={9} fill="#0f172a" stroke={colour} strokeWidth={1.5} />
                <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize={8} fill={colour} pointerEvents="none">{label}</text>
              </g>
            );
          }
          const big = t === "chord" || t === "arp";
          const r = big ? 13 : 11;
          return (
            <g key={key} onClick={() => onNote(c)} style={{ cursor: "pointer" }}>
              {t === "chord" && <circle cx={x} cy={y} r={18} fill="none" stroke="#e2e8f0" strokeWidth={1.5} strokeDasharray="3 2" />}
              <circle cx={x} cy={y} r={r} fill={colour} stroke={c.isRoot ? "#ffffff" : "#0f172a"} strokeWidth={c.isRoot ? 3 : 1.5} />
              <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize={label.length > 2 ? 9 : 11} fontWeight={700} fill="#0f172a" pointerEvents="none">{label}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
