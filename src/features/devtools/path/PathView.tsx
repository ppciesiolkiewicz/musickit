"use client";

import { useMemo, useState, type KeyboardEvent } from "react";
import { AREAS, type Area } from "@/features/plan/model/concepts";
import { LEVEL_ORDER } from "@/features/plan/model/outcome";
import { areaPath, chain, gaps, wrap, type PathNode } from "../model/path";

const LABEL_W = 150, COL_W = 236, NODE_W = 208, NODE_H = 40, GAP = 8, RUNG_H = 32, PAD = 10, HEAD_H = 30;
const WIDTH = LABEL_W + COL_W * LEVEL_ORDER.length;

const BTN = "inline-flex min-h-8 cursor-pointer items-center rounded-lg border px-3 py-1 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400";
const H = "mb-1 text-xs font-medium uppercase tracking-wider text-slate-400";

interface Box { node: PathNode; x: number; y: number }

/** Where every lane and node of the area sits in the drawing. */
function layout(path: ReturnType<typeof areaPath>) {
  const boxes = new Map<string, Box>();
  let top = HEAD_H;
  const lanes = path.lanes.map((lane) => {
    const rows = Math.max(1, ...lane.cells.map((cell) => cell.length));
    const height = PAD + RUNG_H + rows * (NODE_H + GAP) - GAP + PAD;
    lane.cells.forEach((cell, level) => cell.forEach((node, i) => boxes.set(node.id, {
      node,
      x: LABEL_W + level * COL_W + (COL_W - NODE_W) / 2,
      y: top + PAD + RUNG_H + i * (NODE_H + GAP),
    })));
    const out = { lane, top, height };
    top += height;
    return out;
  });
  return { lanes, boxes, height: top };
}

/** An arrow from the right of `a` to the left of `b`; within one column it bows out and comes back to the right side. */
function edgePath(a: Box, b: Box): string {
  const y1 = a.y + NODE_H / 2, y2 = b.y + NODE_H / 2, x1 = a.x + NODE_W;
  if (a.x === b.x) return `M ${x1} ${y1} C ${x1 + 26} ${y1}, ${x1 + 26} ${y2}, ${x1 + 5} ${y2}`;
  const x2 = b.x - 5, s = Math.sign(y2 - y1), r = 10, gx = x1 + (COL_W - NODE_W) / 2;
  // past the next column: down the gutter beside `a`, then along b's row, so it doesn't cut across other lanes' concepts
  if (b.x - a.x > COL_W && Math.abs(y2 - y1) > 2 * r) {
    return `M ${x1} ${y1} L ${gx - r} ${y1} Q ${gx} ${y1} ${gx} ${y1 + s * r} L ${gx} ${y2 - s * r} Q ${gx} ${y2} ${gx + r} ${y2} L ${x2} ${y2}`;
  }
  const bend = Math.min(60, (x2 - x1) / 2);
  return `M ${x1} ${y1} C ${x1 + bend} ${y1}, ${x2 - bend} ${y2}, ${x2} ${y2}`;
}

function Node({ box, state, onPick }: { box: Box; state: "sel" | "chain" | "dim" | "plain"; onPick: () => void }) {
  const { node, x, y } = box;
  const lines = wrap(node.label, 27);
  const has = node.exercises.length > 0;
  const stroke = state === "sel" ? "#a78bfa" : state === "chain" ? "#38bdf8" : has ? "#34d399" : "#475569";
  const key = (e: KeyboardEvent) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    onPick();
  };
  return (
    <g
      role="button" tabIndex={0} aria-pressed={state === "sel"} onClick={onPick} onKeyDown={key}
      aria-label={`${node.label}: ${node.exercises.length} example exercises, ${node.plans.length} example plans`}
      opacity={state === "dim" ? 0.25 : 1} className="cursor-pointer outline-none [&:focus-visible>rect]:stroke-sky-300"
    >
      <rect
        x={x} y={y} width={NODE_W} height={NODE_H} rx={8}
        fill={state === "sel" ? "#2e1065" : "#0f172a"} stroke={stroke} strokeWidth={state === "plain" || state === "dim" ? 1 : 2}
        strokeDasharray={node.courseState === "written" ? undefined : "4 3"}
      />
      {lines.map((line, i) => (
        <text key={i} x={x + 10} y={y + (lines.length === 1 ? 24 : 17 + i * 14)} fontSize={11.5} fill="#e2e8f0">{line}</text>
      ))}
      {has && <circle cx={x + NODE_W - 22} cy={y + 9} r={3.5} fill="#34d399" />}
      {node.plans.length > 0 && <circle cx={x + NODE_W - 11} cy={y + 9} r={3.5} fill="#a78bfa" />}
    </g>
  );
}

function Dot({ fill }: { fill: string }) {
  return <span className="mr-1 inline-block size-2 rounded-full align-middle" style={{ background: fill }} />;
}

function Names({ ids, nodes, pick }: { ids: string[]; nodes: Map<string, PathNode>; pick: (id: string) => void }) {
  if (!ids.length) return <p className="text-sm text-slate-500">Nothing</p>;
  return (
    <ul className="space-y-0.5">
      {ids.map((id) => (
        <li key={id}>
          <button type="button" onClick={() => pick(id)} className="cursor-pointer text-left text-sm text-sky-300 hover:text-sky-100 hover:underline">
            {nodes.get(id)?.label ?? id}
          </button>
        </li>
      ))}
    </ul>
  );
}

function Detail({ node, nodes, pick }: { node: PathNode; nodes: Map<string, PathNode>; pick: (id: string, area: Area) => void }) {
  const go = (id: string) => pick(id, nodes.get(id)!.area);
  const list = (ids: string[]) => ids.length
    ? <ul className="space-y-0.5 font-mono text-xs text-slate-300">{ids.map((id) => <li key={id}>{id}</li>)}</ul>
    : <p className="text-sm text-amber-300">None</p>;
  return (
    <section className="rounded-xl border border-violet-500/30 bg-slate-900/60 p-4">
      <h3 className="text-lg font-semibold text-violet-100">{node.label}</h3>
      <p className="text-sm text-slate-400">
        <span className="font-mono text-xs">{node.id}</span> · {LEVEL_ORDER[node.level]} · {node.topic}
      </p>
      <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
        <div><h4 className={H}>Builds on</h4><Names ids={node.buildsOn} nodes={nodes} pick={go} /></div>
        <div><h4 className={H}>Leads to</h4><Names ids={node.leadsTo} nodes={nodes} pick={go} /></div>
        <div>
          <h4 className={H}>Course page</h4>
          {node.course
            ? <a href={node.course} target="_blank" rel="noreferrer" className="font-mono text-xs text-sky-300 hover:underline">{node.course}</a>
            : <p className="text-sm text-amber-300">None</p>}
          {node.courseState === "planned" && <p className="text-sm text-amber-300">Planned, not written yet</p>}
        </div>
        <div><h4 className={H}>Example exercises</h4>{list(node.exercises)}</div>
        <div><h4 className={H}>Example plans</h4>{list(node.plans)}</div>
      </div>
    </section>
  );
}

/** The learning path of one area as a diagram: topics down, levels across, an arrow for every "builds on". */
export default function PathView({ nodes: list }: { nodes: PathNode[] }) {
  const nodes = useMemo(() => new Map(list.map((n) => [n.id, n])), [list]);
  const [area, setArea] = useState<Area>("guitar");
  const [sel, setSel] = useState<string | null>(null);
  const path = useMemo(() => areaPath(area, nodes), [area, nodes]);
  const { lanes, boxes, height } = useMemo(() => layout(path), [path]);
  const lit = useMemo(() => (sel ? chain(sel, nodes) : null), [sel, nodes]);
  const g = gaps([...boxes.values()].map((b) => b.node));
  const selected = sel ? nodes.get(sel) : undefined;
  const stateOf = (id: string) => (!lit ? "plain" : id === sel ? "sel" : lit.has(id) ? "chain" : "dim");
  const pickArea = (id: Area) => {
    setArea(id);
    setSel(null);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-400">
        The path as the code has it: each topic of the first questionnaire is a row, each level a column, and a concept sits where
        its topic and level meet. An arrow runs from a concept to the one that builds on it. Pick a concept to see its whole chain.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {AREAS.map((a) => (
          <button
            key={a.id} type="button" aria-pressed={a.id === area} onClick={() => pickArea(a.id)}
            className={`${BTN} ${a.id === area ? "border-sky-400 bg-sky-500/20 text-sky-100" : "border-slate-700 text-slate-300 hover:border-slate-400"}`}
          >
            {a.label}
          </button>
        ))}
        <span className="ml-2 text-sm text-slate-400">
          {g.concepts} concepts · {g.noExercise} with no example exercise · {g.noPlan} in no example plan · {g.planned} with no written course page
        </span>
      </div>
      <p className="text-xs text-slate-400">
        <span className="mr-4"><Dot fill="#34d399" />green edge and dot: has an example exercise</span>
        <span className="mr-4"><Dot fill="#a78bfa" />violet dot: in an example plan</span>
        <span className="mr-4">grey edge: no example exercise</span>
        <span>dashed edge: no written course page</span>
      </p>

      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60">
        <svg width={WIDTH} height={height} viewBox={`0 0 ${WIDTH} ${height}`} role="group" aria-label={`${path.label} learning path`} className="block">
          <defs>
            <marker id="path-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b" />
            </marker>
            <marker id="path-arrow-lit" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#38bdf8" />
            </marker>
          </defs>
          {LEVEL_ORDER.map((level, i) => (
            <g key={level}>
              <line x1={LABEL_W + i * COL_W} y1={0} x2={LABEL_W + i * COL_W} y2={height} stroke="#1e293b" />
              <text x={LABEL_W + i * COL_W + COL_W / 2} y={20} textAnchor="middle" fontSize={12} fontWeight={600} fill="#cbd5e1">
                {level[0].toUpperCase() + level.slice(1)}
              </text>
            </g>
          ))}
          {lanes.map(({ lane, top, height: h }) => (
            <g key={lane.topic.id}>
              <line x1={0} y1={top} x2={WIDTH} y2={top} stroke="#1e293b" />
              <text x={12} y={top + PAD + 14} fontSize={13} fontWeight={600} fill="#f1f5f9">{lane.topic.label}</text>
              {wrap(lane.topic.desc, 24).map((line, i) => (
                <text key={i} x={12} y={top + PAD + 30 + i * 12} fontSize={10} fill="#64748b">{line}</text>
              ))}
              {lane.topic.lines.map((rung, level) => (
                <g key={level}>
                  <title>{`Questionnaire line ${level}: ${rung}`}</title>
                  {wrap(rung, 40).map((line, i) => (
                    <text key={i} x={LABEL_W + level * COL_W + (COL_W - NODE_W) / 2} y={top + PAD + 9 + i * 11} fontSize={9.5} fontStyle="italic" fill="#94a3b8">{line}</text>
                  ))}
                </g>
              ))}
              {lane.cells.every((cell) => cell.length === 0) && (
                <text x={LABEL_W + 14} y={top + h - PAD - 14} fontSize={11} fill="#fbbf24">No concepts</text>
              )}
            </g>
          ))}
          {path.edges.map(([from, to]) => {
            const on = !!lit && lit.has(from) && lit.has(to);
            return (
              <path
                key={`${from}>${to}`} d={edgePath(boxes.get(from)!, boxes.get(to)!)} fill="none"
                stroke={on ? "#38bdf8" : "#64748b"} strokeWidth={on ? 2 : 1.25} opacity={lit && !on ? 0.15 : 1}
                markerEnd={`url(#${on ? "path-arrow-lit" : "path-arrow"})`}
              />
            );
          })}
          {[...boxes.values()].map((box) => (
            <Node key={box.node.id} box={box} state={stateOf(box.node.id)} onPick={() => setSel(sel === box.node.id ? null : box.node.id)} />
          ))}
        </svg>
      </div>

      {path.outside.length > 0 && (
        <p className="text-sm text-slate-400">
          Builds on another area: {path.outside.map(([from, to]) => `${nodes.get(to)!.label} ← ${nodes.get(from)!.label}`).join(" · ")}
        </p>
      )}
      {selected
        ? <Detail node={selected} nodes={nodes} pick={(id, a) => { setArea(a); setSel(id); }} />
        : <p className="text-sm text-slate-500">No concept picked.</p>}
    </div>
  );
}
