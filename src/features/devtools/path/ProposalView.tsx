"use client";

import { useMemo, useState, type KeyboardEvent } from "react";
import { topicsFor } from "@/features/plan/intake/topics";
import type { Area } from "@/features/plan/model/concepts";
import { LEVEL_ORDER } from "@/features/plan/model/outcome";
import { wrap, type PathNode } from "../model/path";
import { PATH as PROPOSAL, levelIndex, pathStats as proposalStats, spanOf, stepAt, type PathStep as ProposedStep, type Track } from "@/features/plan/model/path";

const LABEL_W = 150, COL_W = 236, HEAD_H = 30, PAD = 10, TITLE_H = 18, STEP_H = 14, ROW_GAP = 6;
const WIDTH = LABEL_W + COL_W * LEVEL_ORDER.length;
const H = "mb-1 text-xs font-medium uppercase tracking-wider text-slate-400";

const colX = (level: number) => LABEL_W + level * COL_W;
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);
const stepText = (st: ProposedStep) => (st.holds ? `${st.name}: ${st.holds}` : st.name);
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

interface Row { track: Track; top: number; height: number; /** where each step's line sits */ at: { x: number; y: number }[] }

/** Lanes are the area's topics; in a lane each track is a row, a bar from its first step's level to its last. */
function layout(area: Area) {
  const rows = new Map<string, Row>();
  let top = HEAD_H;
  const lanes = topicsFor(area).map((topic) => {
    const laneTop = top;
    let y = top + PAD;
    for (const track of PROPOSAL.filter((t) => t.topic === topic.id)) {
      const perCol = [0, 0, 0, 0];
      const at = track.steps.map((st) => {
        const l = levelIndex(st.level);
        return { x: colX(l) + 14, y: y + TITLE_H + 10 + perCol[l]++ * STEP_H };
      });
      const height = TITLE_H + Math.max(...perCol) * STEP_H + 10;
      rows.set(track.id, { track, top: y, height, at });
      y += height + ROW_GAP;
    }
    top = Math.max(y, laneTop + 60) + PAD - ROW_GAP;
    return { topic, top: laneTop, height: top - laneTop };
  });
  return { lanes, rows, height: top };
}

/** An arrow from the end of a step's line to the start of a later one's. */
function arrow(a: { x: number; y: number }, b: { x: number; y: number }): string {
  const x1 = a.x + COL_W - 30, y1 = a.y - 4, x2 = b.x - 6, y2 = b.y - 4;
  if (x2 <= x1) return `M ${a.x - 4} ${y1} C ${a.x - 22} ${y1}, ${b.x - 22} ${y2}, ${x2} ${y2}`; // same column: round the left
  const bend = Math.min(70, (x2 - x1) / 2);
  return `M ${x1} ${y1} C ${x1 + bend} ${y1}, ${x2 - bend} ${y2}, ${x2} ${y2}`;
}

function TrackRow({ row, state, onPick }: { row: Row; state: "sel" | "lit" | "dim" | "plain"; onPick: () => void }) {
  const { track, top, height, at } = row;
  const [from, to] = spanOf(track);
  const x = colX(from) + 6, w = colX(to) + COL_W - 6 - x;
  const key = (e: KeyboardEvent) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    onPick();
  };
  return (
    <g
      role="button" tabIndex={0} aria-pressed={state === "sel"} onClick={onPick} onKeyDown={key}
      aria-label={`${track.label}: ${track.steps.length} steps, ${LEVEL_ORDER[from]} to ${LEVEL_ORDER[to]}`}
      opacity={state === "dim" ? 0.3 : 1} className="cursor-pointer outline-none [&:focus-visible>rect]:stroke-sky-300"
    >
      <rect
        x={x} y={top} width={w} height={height} rx={8} fill={state === "sel" ? "#2e1065" : "#0f172a"}
        stroke={state === "sel" ? "#a78bfa" : state === "lit" ? "#38bdf8" : track.merges.length ? "#334155" : "#a78bfa"}
        strokeWidth={state === "plain" || state === "dim" ? 1 : 2} strokeDasharray={track.merges.length ? undefined : "4 3"}
      />
      <text x={x + 8} y={top + 13} fontSize={11.5} fontWeight={600} fill="#e2e8f0">
        {track.label}
        {track.merges.length > 1 && <tspan fill="#64748b" fontWeight={400} fontSize={9.5}>{`  ${track.merges.length} concepts today`}</tspan>}
        {track.merges.length === 0 && <tspan fill="#a78bfa" fontWeight={400} fontSize={9.5}>  new</tspan>}
      </text>
      {track.steps.map((st, i) => (
        <text key={i} x={at[i].x} y={at[i].y} fontSize={9.5} fill={st.ladder ? "#7dd3fc" : "#fbbf24"} fontStyle={st.ladder ? undefined : "italic"}>
          <title>{`${i + 1}. ${stepText(st)} (${st.level})${st.ladder ? `, read from ${st.ladder}` : ", not implemented"}`}</title>
          {`${i + 1} ${clip(stepText(st), 36)}`}
        </text>
      ))}
    </g>
  );
}

function Detail({ track, nodes, pick }: { track: Track; nodes: Map<string, PathNode>; pick: (id: string) => void }) {
  const [from, to] = spanOf(track);
  return (
    <section className="rounded-xl border border-violet-500/30 bg-slate-900/60 p-4">
      <h3 className="text-lg font-semibold text-violet-100">{track.label}</h3>
      <p className="text-sm text-slate-400">
        <span className="font-mono text-xs">{track.id}</span> · {from === to ? LEVEL_ORDER[from] : `${LEVEL_ORDER[from]} to ${LEVEL_ORDER[to]}`} · {track.topic}
      </p>
      <h4 className={`${H} mt-4`}>Today</h4>
      {track.merges.length === 0
        ? <p className="text-sm text-violet-300">A new concept: nothing in the catalogue stands for it.</p>
        : (
          <ul className="space-y-0.5 text-sm text-slate-300">
            {track.merges.map((id) => {
              const n = nodes.get(id);
              return <li key={id}>{n?.label ?? id} <span className="font-mono text-xs text-slate-500">{id}</span> · {n ? LEVEL_ORDER[n.level] : "?"}</li>;
            })}
          </ul>
        )}
      <h4 className={`${H} mt-4`}>Steps</h4>
      <div className="overflow-x-auto">
        <table className="border-collapse text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-slate-400">
              {["#", "Level", "Step", "Read from", "After"].map((h) => <th key={h} className="py-1 pr-5 font-medium">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {track.steps.map((st, i) => (
              <tr key={i} className="border-t border-slate-800 text-slate-200">
                <td className="py-1 pr-5 tabular-nums text-slate-500">{i + 1}</td>
                <td className="py-1 pr-5">{st.level}</td>
                <td className="py-1 pr-5"><span className="font-medium">{st.name}</span>{st.holds && <span className="text-slate-400">: {st.holds}</span>}</td>
                <td className="py-1 pr-5">
                  {st.ladder
                    ? <span className="font-mono text-xs text-sky-300">{st.ladder}</span>
                    : <span className="rounded border border-amber-400/40 px-1.5 py-0.5 text-xs text-amber-300">not implemented</span>}
                </td>
                <td className="py-1 pr-5">
                  {(st.after ?? []).map((ref) => {
                    const at = stepAt(ref);
                    return (
                      <button key={ref} type="button" onClick={() => at && pick(at.track.id)} className="mr-2 cursor-pointer text-left text-sky-300 hover:underline">
                        {at ? `${at.track.label} ${at.index + 1}: ${at.step.name}` : ref}
                      </button>
                    );
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/** The proposed path of one area (model/proposal.ts): tracks whose steps overlap the levels. */
export default function ProposalView({ area, nodes, onArea }: { area: Area; nodes: Map<string, PathNode>; onArea: (a: Area) => void }) {
  const [sel, setSel] = useState<string | null>(null);
  const { lanes, rows, height } = useMemo(() => layout(area), [area]);
  const own = PROPOSAL.filter((t) => t.area === area);
  const n = proposalStats(own);
  const today = [...nodes.values()].filter((x) => x.area === area).length;
  // every "after" as an arrow; one into another area is listed under the diagram
  const links = own.flatMap((t) => t.steps.flatMap((st, i) => (st.after ?? []).map((ref) => ({ ref, to: t.id, i, from: stepAt(ref)! }))));
  const inside = links.filter((l) => l.from.track.area === area);
  const outside = links.filter((l) => l.from.track.area !== area);
  // a track picked in another area lights nothing here
  const here = sel && own.some((t) => t.id === sel) ? sel : null;
  const near = new Set<string>(here ? [here] : []);
  for (const l of inside) if (here && (l.to === here || l.from.track.id === here)) near.add(l.to).add(l.from.track.id);
  const selected = here ? PROPOSAL.find((t) => t.id === here) : undefined;
  const pick = (id: string) => {
    const t = PROPOSAL.find((x) => x.id === id);
    if (t && t.area !== area) onArea(t.area);
    setSel(id);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-400">
        A proposal, not the app (model/proposal.ts). Each track is one skill, often several of today&apos;s concepts merged. Its
        bar runs from the level of its first step to the level of its last, so tracks in a topic overlap: the first triads come
        before CAGED, the last ones after it. An arrow says a step needs another track&apos;s step first. Pick a track to see what
        it replaces.
      </p>
      <p className="text-sm text-slate-400">
        {today} concepts today → {n.tracks} tracks ({n.added} new) · {n.steps} steps, {n.fromLadder} read from a ladder in the code · {n.spanning} of {n.tracks} tracks span more than one level
      </p>
      <p className="text-xs text-slate-400">
        <span className="mr-4 text-sky-300">Blue step: a ladder in the code stands for it.</span>
        <span className="mr-4 italic text-amber-300">Amber: not implemented.</span>
        <span className="text-violet-300">Dashed violet bar: a concept the catalogue doesn&apos;t have.</span>
      </p>
      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60">
        <svg width={WIDTH} height={height} viewBox={`0 0 ${WIDTH} ${height}`} role="group" aria-label={`Proposed ${area} path`} className="block">
          <defs>
            <marker id="prop-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b" />
            </marker>
            <marker id="prop-arrow-lit" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#38bdf8" />
            </marker>
          </defs>
          {LEVEL_ORDER.map((level, i) => (
            <g key={level}>
              <line x1={colX(i)} y1={0} x2={colX(i)} y2={height} stroke="#1e293b" />
              <text x={colX(i) + COL_W / 2} y={20} textAnchor="middle" fontSize={12} fontWeight={600} fill="#cbd5e1">{cap(level)}</text>
            </g>
          ))}
          {lanes.map(({ topic, top }) => (
            <g key={topic.id}>
              <line x1={0} y1={top} x2={WIDTH} y2={top} stroke="#1e293b" />
              <text x={12} y={top + PAD + 14} fontSize={13} fontWeight={600} fill="#f1f5f9">{topic.label}</text>
              {wrap(topic.desc, 24).map((line, i) => (
                <text key={i} x={12} y={top + PAD + 30 + i * 12} fontSize={10} fill="#64748b">{line}</text>
              ))}
            </g>
          ))}
          {[...rows.values()].map((row) => (
            <TrackRow
              key={row.track.id} row={row} onPick={() => setSel(sel === row.track.id ? null : row.track.id)}
              state={!here ? "plain" : row.track.id === here ? "sel" : near.has(row.track.id) ? "lit" : "dim"}
            />
          ))}
          {inside.map((l) => {
            const a = rows.get(l.from.track.id)!.at[l.from.index], b = rows.get(l.to)!.at[l.i];
            const on = !!here && (l.to === here || l.from.track.id === here);
            return (
              <path
                key={`${l.ref}>${l.to}:${l.i}`} d={arrow(a, b)} fill="none" pointerEvents="none"
                stroke={on ? "#38bdf8" : "#64748b"} strokeWidth={on ? 2 : 1.25} opacity={here && !on ? 0.12 : 0.9}
                markerEnd={`url(#${on ? "prop-arrow-lit" : "prop-arrow"})`}
              />
            );
          })}
        </svg>
      </div>
      {outside.length > 0 && (
        <p className="text-sm text-slate-400">
          Needs a step from another area:{" "}
          {outside.map((l, k) => (
            <span key={k}>
              {k > 0 && " · "}
              {PROPOSAL.find((t) => t.id === l.to)!.label} {l.i + 1} ←{" "}
              <button type="button" onClick={() => pick(l.from.track.id)} className="cursor-pointer text-sky-300 hover:underline">
                {l.from.track.label} {l.from.index + 1}
              </button>
            </span>
          ))}
        </p>
      )}
      {selected ? <Detail track={selected} nodes={nodes} pick={pick} /> : <p className="text-sm text-slate-500">No track picked.</p>}
    </div>
  );
}
