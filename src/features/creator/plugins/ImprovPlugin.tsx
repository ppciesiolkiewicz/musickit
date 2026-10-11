"use client";

import { useMemo, useState } from "react";
import { interference, invert, retrograde, rotations } from "@/lib/improv/schillinger";
import { useCreatorKey } from "../KeyProvider";
import { Body, Hint } from "./common";

const field = "rounded-md border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-xs text-slate-200";
const MOTIVE = [0, 2, 1, 4];

/** Schillinger at a glance: an interference rhythm, and one motive turned round, in the key's notes (or as degrees with no key). */
export default function ImprovPlugin() {
  const { ctx } = useCreatorKey();
  const [a, setA] = useState(3);
  const [b, setB] = useState(2);
  const it = useMemo(() => interference(a, b), [a, b]);
  const name = (d: number) => (ctx ? ctx.names[((d % 7) + 7) % 7] : String(((d % 7) + 7) % 7 + 1));
  const forms = [
    { label: "Motive", m: MOTIVE },
    { label: "Reversed", m: retrograde(MOTIVE) },
    { label: "Mirrored", m: invert(MOTIVE) },
    ...rotations(MOTIVE).slice(1).map((m, i) => ({ label: `Rotation ${i + 1}`, m })),
  ];
  const rows = [
    { label: String(a), pts: it.a, col: "var(--color-sky-400)" },
    { label: String(b), pts: it.b, col: "var(--color-amber-400)" },
    { label: "=", pts: it.r, col: "#f472b6" },
  ];
  return (
    <Body title="Improvisation" general={!ctx}>
      {!ctx && <Hint>Pick a key above to spell the motive in it. Until then, scale degrees.</Hint>}
      <div className="flex items-center gap-1.5 text-xs text-slate-400">
        Rhythm
        <select className={field} value={a} onChange={(e) => setA(Number(e.target.value))} aria-label="First pulse">{[2, 3, 4, 5, 6, 7].map((n) => <option key={n}>{n}</option>)}</select>
        against
        <select className={field} value={b} onChange={(e) => setB(Number(e.target.value))} aria-label="Second pulse">{[2, 3, 4, 5, 6, 7].map((n) => <option key={n}>{n}</option>)}</select>
        <span className="ml-auto font-mono text-slate-200">{it.durations.join("+")}</span>
      </div>
      <svg viewBox={`0 0 ${it.length * 10 + 16} 46`} className="w-full" role="img" aria-label={`Interference of ${a} against ${b}: ${it.durations.join(" ")}`}>
        {rows.map((r, i) => (
          <g key={r.label}>
            <text x={0} y={8 + i * 15} dominantBaseline="central" fontSize="8" fill="var(--color-slate-500)">{r.label}</text>
            <line x1={14} x2={14 + it.length * 10} y1={8 + i * 15} y2={8 + i * 15} stroke="var(--color-slate-800)" />
            {r.pts.map((p) => <rect key={p} x={14 + p * 10} y={4 + i * 15} width={4} height={8} rx={1} fill={r.col} />)}
          </g>
        ))}
      </svg>
      <ul className="grid gap-x-3 gap-y-0.5 text-xs [grid-template-columns:repeat(auto-fill,minmax(9rem,1fr))]">
        {forms.map((f) => (
          <li key={f.label} className="flex gap-2"><span className="w-20 shrink-0 text-slate-500">{f.label}</span><span className="text-slate-200">{f.m.map(name).join(" ")}</span></li>
        ))}
      </ul>
    </Body>
  );
}
