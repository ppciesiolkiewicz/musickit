"use client";

import { useMemo, useState } from "react";
import { Chip, ChipRow, Info } from "@/components/ui";
import { MODE_GROUPS, compareModes, noteAt } from "@/features/theory/modeGroups";
import { degreeColour } from "@/features/theory/scales";

const colW = 62, rowH = 42, left = 112, top = 62, right = 120;

/**
 * Pick a group of modes. The notes they all share (the core) are shaded; every other column is a note only some of them
 * have, so you can see at a glance which modes overlap and what each one adds.
 */
export default function ModeCompare({ tonicPc }: { tonicPc: number }) {
  const [groupId, setGroupId] = useState("tonic-major");
  const cmp = useMemo(() => compareModes(groupId, tonicPc), [groupId, tonicPc]);
  const n = cmp.modes.length;
  const W = left + cmp.columns.length * colW + right;
  const H = top + n * rowH + 28;
  const cx = (i: number) => left + i * colW + colW / 2;
  const ry = (i: number) => top + i * rowH + rowH / 2;
  const tonic = cmp.modes[0]?.ctx.names[0] ?? "";
  const coreNames = cmp.modes[0] ? cmp.core.map((s) => ({ semi: s, ...noteAt(cmp.modes[0], s)! })) : [];

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
      <h2 className="mb-2 text-sm font-medium text-slate-100">
        Compare modes: what they share and what each one adds
        <Info label="How to read the comparison">
          Pick a group of modes. Each row is one mode on {tonic}; each column is a note, counted in semitones above the tonic. Shaded columns are the <b>core</b>: notes every mode in the group has. In the other columns only some modes have the note, so a column that is filled in two rows is where those two modes overlap. The brightly outlined circles are the notes a mode adds beyond the core, and the list on the right says which. Modes are ordered from brightest (most raised notes) to darkest, so neighbours overlap the most.
        </Info>
      </h2>
      <ChipRow label="Group" info="Group by parent scale (the seven modes of the major scale, of harmonic minor, of melodic minor), or by the chord on the tonic: every mode with a major, minor, diminished or augmented 1 – 3 – 5, whatever scale it comes from.">
        {MODE_GROUPS.map((g) => <Chip key={g.id} on={g.id === groupId} onClick={() => setGroupId(g.id)}>{g.label}</Chip>)}
      </ChipRow>
      <p className="mt-2 text-xs text-slate-400">{cmp.group.why} {n} mode{n === 1 ? "" : "s"}.</p>

      <div className="mt-3 flex flex-wrap items-center gap-2" aria-label="Core notes">
        <span className="text-xs uppercase tracking-wider text-slate-500">Core notes</span>
        {coreNames.map((c) => (
          <span key={c.semi} className="flex flex-col items-center gap-0.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold text-slate-950" style={{ background: degreeColour(c.index) }}>{c.name}</span>
            <span className="text-[10px] text-slate-500">{cmp.columns.find((x) => x.semi === c.semi)?.label}</span>
          </span>
        ))}
        <span className="text-xs text-slate-500">{n > 1 ? `in all ${n} modes` : ""}</span>
      </div>

      <div className="mt-3 overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ minWidth: Math.min(W, 640) }} role="img" aria-label="Which notes each mode has">
          {cmp.columns.map((c, i) => (
            <g key={c.semi}>
              {c.core && <rect x={left + i * colW + 2} y={top - 30} width={colW - 4} height={n * rowH + 36} rx={10} fill="#1e293b" opacity={0.7} />}
              <text x={cx(i)} y={top - 36} textAnchor="middle" fontSize={11} fontWeight={600} fill={c.core ? "#e2e8f0" : "#94a3b8"}>{c.label}</text>
              <text x={cx(i)} y={top - 20} textAnchor="middle" fontSize={9.5} fill={c.core ? "#94a3b8" : "#64748b"}>{c.core ? "core" : `${c.count} of ${n}`}</text>
              <title>{`${c.label}: ${c.who.join(", ")}`}</title>
            </g>
          ))}
          {cmp.modes.map((m, r) => (
            <g key={m.name}>
              <text x={left - 10} y={ry(r)} textAnchor="end" dominantBaseline="central" fontSize={12} fill="#e2e8f0">{m.ctx.names[0]} {m.name}</text>
              {cmp.columns.map((c, i) => {
                const cell = noteAt(m, c.semi);
                if (!cell) return <circle key={c.semi} cx={cx(i)} cy={ry(r)} r={3} fill="#334155" />;
                const added = !c.core;
                return (
                  <g key={c.semi}>
                    <circle cx={cx(i)} cy={ry(r)} r={16} fill={degreeColour(cell.index)} opacity={added ? 1 : 0.55} stroke={added ? "#f8fafc" : "none"} strokeWidth={2} />
                    <text x={cx(i)} y={ry(r)} textAnchor="middle" dominantBaseline="central" fontSize={cell.name.length > 2 ? 10 : 12} fontWeight={700} fill="#0f172a">{cell.name}</text>
                  </g>
                );
              })}
              <text x={left + cmp.columns.length * colW + 10} y={ry(r)} dominantBaseline="central" fontSize={10.5} fill="#94a3b8">
                {cmp.added[m.name].length ? "adds " + cmp.added[m.name].map((s) => cmp.columns.find((c) => c.semi === s)!.label).join(" ") : "core only"}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </section>
  );
}
