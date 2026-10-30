"use client";

import { isNow, shade, type ViewProps } from "./common";

const FRETS = 17;
const MARKS = [3, 5, 7, 9, 12, 15, 17];

/** The neck (low E at the bottom) with every fret the cues use; the ones sounding now are lit. */
export default function NeckView({ cues, pos }: ViewProps) {
  const fw = 34, sh = 16, left = 26, top = 10;
  const W = left + FRETS * fw + 6, H = top + 5 * sh + 22;
  const fx = (f: number) => (f === 0 ? left - 12 : left + (f - 0.5) * fw);
  const sy = (s: number) => top + (5 - s) * sh;
  const dots = new Map<string, { s: number; f: number; fill: string; now: boolean }>();
  for (const c of cues) {
    const now = isNow(c, pos);
    for (const fr of c.frets) {
      const k = `${fr.string}-${fr.fret}`;
      const had = dots.get(k);
      if (!had || now || (!had.now && c.highlighted)) dots.set(k, { s: fr.string, f: fr.fret, fill: shade(c, now), now: now || !!had?.now });
    }
  }
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: W }} role="img" aria-label="Neck">
      {Array.from({ length: FRETS + 1 }, (_, f) => (
        <line key={f} x1={left + f * fw} x2={left + f * fw} y1={top} y2={top + 5 * sh} stroke={f === 0 ? "var(--color-slate-300)" : "var(--color-slate-700)"} strokeWidth={f === 0 ? 3 : 1} />
      ))}
      {Array.from({ length: 6 }, (_, s) => <line key={s} x1={left} x2={left + FRETS * fw} y1={sy(s)} y2={sy(s)} stroke="var(--color-slate-600)" />)}
      {MARKS.map((f) => <text key={f} x={fx(f)} y={H - 4} textAnchor="middle" fontSize={10} fill="var(--color-slate-500)">{f}</text>)}
      {[...dots.values()].map((d) => (
        <circle key={`${d.s}-${d.f}`} cx={fx(d.f)} cy={sy(d.s)} r={d.now ? 7 : 5.5} fill={d.fill} stroke={d.now ? "var(--color-sky-200)" : "none"} strokeWidth={2} />
      ))}
    </svg>
  );
}
