"use client";

import type { SoloTargets } from "../solo";

const NAMES = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];
/** open strings low E to high e, as pitch classes */
const OPEN = [4, 9, 2, 7, 11, 4];
const FRETS = 15;
const MARKS = [3, 5, 7, 9, 12, 15];

/**
 * Solo-over: the chord sounding now, its scale on the neck with the targets lit (the rest dimmed, or hidden), or as
 * note names. No fixed notes to follow: the student improvises around the lit ones.
 */
export default function SoloView({ targets, mode, others }: { targets: SoloTargets; mode: "neck" | "notes" | "tab"; others: "dimmed" | "hidden" }) {
  const lit = new Set(targets.lit);
  const shown = others === "hidden" ? targets.lit : targets.pcs;
  if (mode === "notes")
    return (
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <span className="text-slate-500">Over {targets.chord}, aim for</span>
        {shown.map((pc) => (
          <span key={pc} className={`rounded-md border px-1.5 py-0.5 font-mono ${lit.has(pc) ? "border-sky-400 bg-sky-500/20 text-sky-100" : "border-slate-800 text-slate-500"}`}>{NAMES[pc]}</span>
        ))}
      </div>
    );
  const fw = 34, sh = 16, left = 26, top = 10;
  const W = left + FRETS * fw + 6, H = top + 5 * sh + 22;
  const fx = (f: number) => (f === 0 ? left - 12 : left + (f - 0.5) * fw);
  const sy = (s: number) => top + (5 - s) * sh;
  const keep = new Set(shown);
  const dots = OPEN.flatMap((open, s) => Array.from({ length: FRETS + 1 }, (_, f) => ({ s, f, pc: (open + f) % 12 })).filter((d) => keep.has(d.pc)));
  return (
    <div className="flex flex-col gap-1">
      {mode === "tab" && <p className="text-[11px] text-slate-500">Improvise: no fixed tab. Aim for the lit notes over {targets.chord}.</p>}
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: W }} role="img" aria-label={`Notes to aim for over ${targets.chord}`}>
        {Array.from({ length: FRETS + 1 }, (_, f) => (
          <line key={f} x1={left + f * fw} x2={left + f * fw} y1={top} y2={top + 5 * sh} stroke={f === 0 ? "var(--color-slate-300)" : "var(--color-slate-700)"} strokeWidth={f === 0 ? 3 : 1} />
        ))}
        {OPEN.map((_, s) => <line key={s} x1={left} x2={left + FRETS * fw} y1={sy(s)} y2={sy(s)} stroke="var(--color-slate-600)" />)}
        {MARKS.map((f) => <text key={f} x={fx(f)} y={H - 4} textAnchor="middle" fontSize={10} fill="var(--color-slate-500)">{f}</text>)}
        {dots.map((d) => (
          <circle key={`${d.s}-${d.f}`} cx={fx(d.f)} cy={sy(d.s)} r={lit.has(d.pc) ? 6.5 : 5} fill={lit.has(d.pc) ? "var(--color-sky-300)" : "var(--color-slate-600)"} />
        ))}
      </svg>
    </div>
  );
}
