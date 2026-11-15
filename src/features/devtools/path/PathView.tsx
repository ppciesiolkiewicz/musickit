"use client";

import { useMemo, useState, type KeyboardEvent } from "react";
import { AREAS, type Area } from "@/features/plan/model/concepts";
import { LEVEL_ORDER } from "@/features/plan/model/outcome";
import { localDate } from "@/features/plan/model/schedule";
import type { StoredPlan } from "@/features/plan/model/types";
import { usePlan } from "@/features/plan/store/usePlan";
import { STAR_LABELS } from "@/features/progress/stars";
import { useProgress } from "@/features/progress/useProgress";
import { areaPath, chain, gaps, wrap, type PathNode } from "../model/path";
import { EXAMPLE_STUDENTS, exampleRatings, stepProgress, stepRatings, weeksBetween, type ConceptProgress, type StepState } from "../model/stepProgress";
import type { SpareSteps, Step } from "../model/steps";

const LABEL_W = 150, COL_W = 236, NODE_W = 208, NODE_H = 40, GAP = 8, RUNG_H = 32, STEP_H = 12, PAD = 10, HEAD_H = 30;
const WIDTH = LABEL_W + COL_W * LEVEL_ORDER.length;

const BTN = "inline-flex min-h-8 cursor-pointer items-center rounded-lg border px-3 py-1 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400";
const H = "mb-1 text-xs font-medium uppercase tracking-wider text-slate-400";

interface Box { node: PathNode; x: number; y: number; h: number }

/** A concept's box grows by a line for each step inside it. */
const heightOf = (node: PathNode) => NODE_H + (node.steps.length ? node.steps.length * STEP_H + 6 : 0);
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);
const STATE_COLOR: Record<StepState | "not-yet", string> = { solid: "#34d399", working: "#fbbf24", none: "#475569", "not-yet": "#475569" };
const STATE_WORD: Record<StepState, string> = { solid: "solid", working: "working on it", none: "not started" };
/** How long the player has been on the step they are on, in whole weeks; null when they are on none or it is solid. */
const weeksOn = (p: ConceptProgress | undefined, today: string): number | null => {
  const at = p && p.at !== null ? p.steps[p.at] : null;
  return at && at.state === "working" && at.firstOn ? weeksBetween(at.firstOn, today) : null;
};
const stepLine = (s: Step) => (s.holds ? `${s.name}: ${s.holds}` : s.name);

/** Where every lane and node of the area sits in the drawing. */
function layout(path: ReturnType<typeof areaPath>) {
  const boxes = new Map<string, Box>();
  let top = HEAD_H;
  const lanes = path.lanes.map((lane) => {
    let tallest = NODE_H;
    lane.cells.forEach((cell, level) => {
      let y = top + PAD + RUNG_H;
      for (const node of cell) {
        const h = heightOf(node);
        boxes.set(node.id, { node, x: LABEL_W + level * COL_W + (COL_W - NODE_W) / 2, y, h });
        y += h + GAP;
      }
      tallest = Math.max(tallest, y - GAP - (top + PAD + RUNG_H));
    });
    const height = PAD + RUNG_H + tallest + PAD;
    const out = { lane, top, height };
    top += height;
    return out;
  });
  return { lanes, boxes, height: top };
}

/** An arrow from the right of `a` to the left of `b`; within one column it bows out and comes back to the right side. */
function edgePath(a: Box, b: Box): string {
  const y1 = a.y + NODE_H / 2, y2 = b.y + NODE_H / 2, x1 = a.x + NODE_W; // at the label, whatever the box's height
  if (a.x === b.x) return `M ${x1} ${y1} C ${x1 + 26} ${y1}, ${x1 + 26} ${y2}, ${x1 + 5} ${y2}`;
  const x2 = b.x - 5, s = Math.sign(y2 - y1), r = 10, gx = x1 + (COL_W - NODE_W) / 2;
  // past the next column: down the gutter beside `a`, then along b's row, so it doesn't cut across other lanes' concepts
  if (b.x - a.x > COL_W && Math.abs(y2 - y1) > 2 * r) {
    return `M ${x1} ${y1} L ${gx - r} ${y1} Q ${gx} ${y1} ${gx} ${y1 + s * r} L ${gx} ${y2 - s * r} Q ${gx} ${y2} ${gx + r} ${y2} L ${x2} ${y2}`;
  }
  const bend = Math.min(60, (x2 - x1) / 2);
  return `M ${x1} ${y1} C ${x1 + bend} ${y1}, ${x2 - bend} ${y2}, ${x2} ${y2}`;
}

function Node({ box, state, onPick, progress, today }: { box: Box; state: "sel" | "chain" | "dim" | "plain"; onPick: () => void; progress?: ConceptProgress; today: string }) {
  const { node, x, y, h } = box;
  const lines = wrap(node.label, 27);
  const has = node.exercises.length > 0;
  // with a student on the diagram the edge says how they stand on the concept, not whether it has an example
  const stroke = state === "sel" ? "#a78bfa" : state === "chain" ? "#38bdf8" : progress ? STATE_COLOR[progress.state] : has ? "#34d399" : "#475569";
  const weeks = weeksOn(progress, today);
  const key = (e: KeyboardEvent) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    onPick();
  };
  return (
    <g
      role="button" tabIndex={0} aria-pressed={state === "sel"} onClick={onPick} onKeyDown={key}
      aria-label={progress
        ? `${node.label}: ${progress.state}, ${progress.ratings} ratings${progress.at !== null ? `, on step ${progress.at + 1} of ${node.steps.length}` : ""}`
        : `${node.label}: ${node.steps.length} steps, ${node.exercises.length} example exercises, ${node.plans.length} example plans`}
      opacity={state === "dim" ? 0.25 : 1} className="cursor-pointer outline-none [&:focus-visible>rect]:stroke-sky-300"
    >
      <rect
        x={x} y={y} width={NODE_W} height={h} rx={8}
        fill={state === "sel" ? "#2e1065" : "#0f172a"} stroke={stroke} strokeWidth={state === "plain" || state === "dim" ? 1 : 2}
        strokeDasharray={progress || node.courseState === "written" ? undefined : "4 3"}
      />
      {lines.map((line, i) => (
        <text key={i} x={x + 10} y={y + (lines.length === 1 ? 24 : 17 + i * 14)} fontSize={11.5} fill="#e2e8f0">{line}</text>
      ))}
      {node.steps.map((s, i) => {
        const sy = y + NODE_H + 6 + i * STEP_H;
        if (!progress) {
          return (
            <text key={i} x={x + 10} y={sy} fontSize={9.5} fill={s.planned ? "#fbbf24" : "#7dd3fc"} fontStyle={s.planned ? "italic" : undefined}>
              <title>{`${stepLine(s)}${s.planned ? " (not implemented)" : ""}`}</title>
              {`${i + 1} ${clip(stepLine(s), 36)}`}
            </text>
          );
        }
        const st = progress.steps[i], here = progress.at === i;
        const tail = here && weeks ? ` · ${weeks} wk` : "";
        return (
          <g key={i}>
            <title>{`${stepLine(s)}: ${s.planned ? "not implemented, so not tracked" : STATE_WORD[st.state]}${st.ratings ? `, ${st.ratings} ratings, latest ${st.stars} stars` : ""}`}</title>
            <rect
              x={x + 10} y={sy - 7.5} width={8} height={8} rx={2} strokeWidth={1.2} stroke={s.planned ? "#475569" : STATE_COLOR[st.state]}
              fill={st.state === "solid" ? "#34d399" : st.state === "working" ? "#78350f" : "none"} strokeDasharray={s.planned ? "2 2" : undefined}
            />
            <text x={x + 23} y={sy} fontSize={9.5} fontWeight={here ? 700 : 400} fill={s.planned ? "#64748b" : st.state === "none" ? "#94a3b8" : "#e2e8f0"} fontStyle={s.planned ? "italic" : undefined}>
              {`${clip(stepLine(s), 33 - tail.length)}${tail}`}
            </text>
          </g>
        );
      })}
      {progress && progress.ratings > 0 && (
        <text x={x + NODE_W - 8} y={y + 13} textAnchor="end" fontSize={9} fill="#94a3b8">
          <title>{`${progress.ratings} ratings of this concept`}</title>
          {`${progress.ratings}×`}
        </text>
      )}
      {!progress && has && <circle cx={x + NODE_W - 22} cy={y + 9} r={3.5} fill="#34d399" />}
      {!progress && node.plans.length > 0 && <circle cx={x + NODE_W - 11} cy={y + 9} r={3.5} fill="#a78bfa" />}
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

function Detail({ node, nodes, pick, progress, today }: { node: PathNode; nodes: Map<string, PathNode>; pick: (id: string, area: Area) => void; progress?: ConceptProgress; today: string }) {
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
      <h4 className={`${H} mt-5`}>Steps inside it</h4>
      {node.steps.length === 0
        ? <p className="text-sm text-amber-300">None: nothing in the code says what its levels hold</p>
        : (
          <ol className="space-y-0.5 text-sm">
            {node.steps.map((s, i) => (
              <li key={i} className={s.planned ? "text-slate-400" : "text-slate-200"}>
                <span className="mr-2 font-mono text-xs text-slate-500">{i + 1}</span>
                <span className="font-medium">{s.name}</span>{s.holds && `: ${s.holds}`}
                {s.planned && <span className="ml-2 rounded border border-amber-400/40 px-1.5 py-0.5 text-xs text-amber-300">not implemented</span>}
              </li>
            ))}
          </ol>
        )}
      {node.stepsFrom && <p className="mt-2 text-xs text-slate-500">Read from {node.stepsFrom}</p>}
      {progress && (
        <>
          <h4 className={`${H} mt-5`}>This student</h4>
          <p className="text-sm text-slate-200">
            {progress.ratings === 0
              ? "No rating of this concept yet."
              : `${progress.state === "solid" ? "Solid" : "Working on it"}: ${progress.ratings} ratings, the newest on ${progress.lastOn}.`}
            {progress.noStep > 0 && node.steps.some((s) => !s.planned) && ` ${progress.noStep} of them on exercises whose tools name no step.`}
          </p>
          {node.steps.some((s) => !s.planned) && (
            <div className="mt-2 overflow-x-auto">
              <table className="border-collapse text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-slate-400">
                    {["Step", "State", "Ratings", "Newest", "First on", "Last on", "On it for"].map((h) => <th key={h} className="py-1 pr-5 font-medium">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {node.steps.map((s, i) => {
                    const st = progress.steps[i];
                    if (s.planned) return null;
                    return (
                      <tr key={i} className={`border-t border-slate-800 ${progress.at === i ? "text-slate-100" : "text-slate-400"}`}>
                        <td className="py-1 pr-5">{i + 1} {s.name}</td>
                        <td className="py-1 pr-5" style={{ color: st.state === "none" ? undefined : STATE_COLOR[st.state] }}>{STATE_WORD[st.state]}</td>
                        <td className="py-1 pr-5 tabular-nums">{st.ratings || "—"}</td>
                        <td className="py-1 pr-5">{st.stars ? `${st.stars} · ${STAR_LABELS[st.stars]}` : "—"}</td>
                        <td className="py-1 pr-5 tabular-nums">{st.firstOn ?? "—"}</td>
                        <td className="py-1 pr-5 tabular-nums">{st.lastOn ?? "—"}</td>
                        <td className="py-1 pr-5 tabular-nums">{st.firstOn && st.state === "working" ? `${weeksBetween(st.firstOn, today)} wk` : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {!node.steps.some((s) => !s.planned) && <p className="mt-1 text-sm text-amber-300">No step can be tracked here: the concept has no ladder in the code.</p>}
        </>
      )}
    </section>
  );
}

/** The learning path of one area as a diagram: topics down, levels across, an arrow for every "builds on". */
export default function PathView({ nodes: list, spare }: { nodes: PathNode[]; spare: SpareSteps[] }) {
  const nodes = useMemo(() => new Map(list.map((n) => [n.id, n])), [list]);
  const [area, setArea] = useState<Area>("guitar");
  const [sel, setSel] = useState<string | null>(null);
  const [who, setWho] = useState("none");
  const [today] = useState(() => localDate());
  const { state: { current, history }, loaded: planLoaded } = usePlan();
  const { entries, loaded: entriesLoaded } = useProgress();
  const progress = useMemo(() => {
    if (who === "none") return null;
    if (who === "me") {
      if (!planLoaded || !entriesLoaded) return null;
      return stepProgress(stepRatings(entries, [current, ...history].filter((p): p is StoredPlan => p !== null)), today);
    }
    const student = EXAMPLE_STUDENTS.find((s) => s.id === who);
    return student ? stepProgress(exampleRatings(student, today), today) : null;
  }, [who, today, current, history, planLoaded, entries, entriesLoaded]);
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
          {g.concepts} concepts · {g.noExercise} with no example exercise · {g.noPlan} in no example plan · {g.planned} with no written course page · {g.noSteps} with no steps inside · {g.stepsPlanned} steps not implemented
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="path-student" className="text-sm text-slate-300">Student on the diagram</label>
        <select
          id="path-student" value={who} onChange={(e) => setWho(e.target.value)}
          className="min-h-8 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400"
        >
          <option value="none">None: the path itself</option>
          <option value="me">The player in this browser</option>
          {EXAMPLE_STUDENTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
        {who !== "none" && (
          <span className="text-sm text-slate-400">
            {!progress ? "Loading…" : (() => {
              const own = [...boxes.values()].map((b) => ({ node: b.node, p: progress[b.node.id] }));
              const tracked = own.flatMap(({ node, p }) => p.steps.filter((_, i) => !node.steps[i].planned));
              return `${own.filter((x) => x.p.state === "solid").length} concepts solid · ${own.filter((x) => x.p.state === "working").length} working · ${tracked.filter((s) => s.state === "solid").length} of ${tracked.length} tracked steps solid · ${own.reduce((n, x) => n + x.p.ratings, 0)} ratings in ${path.label}`;
            })()}
          </span>
        )}
      </div>
      {progress && (
        <p className="text-xs text-slate-400">
          <span className="mr-4"><Dot fill="#34d399" />green: solid (the newest rating is Solid or Easy now)</span>
          <span className="mr-4"><Dot fill="#fbbf24" />amber: working on it</span>
          <span className="mr-4">grey: no rating yet</span>
          <span className="mr-4">bold step: the one the student is on, with the weeks on it</span>
          <span>dashed square: a step not implemented, so not tracked</span>
        </p>
      )}
      <p className="text-xs text-slate-400" hidden={!!progress}>
        <span className="mr-4"><Dot fill="#34d399" />green edge and dot: has an example exercise</span>
        <span className="mr-4"><Dot fill="#a78bfa" />violet dot: in an example plan</span>
        <span className="mr-4">grey edge: no example exercise</span>
        <span>dashed edge: no written course page</span>
      </p>
      <p className="text-xs text-slate-400" hidden={!!progress}>
        The numbered lines in a concept are the steps inside it, easiest first.{" "}
        <span className="mr-4 text-sky-300">Blue: read from a ladder in the code (a tool&apos;s levels, a book&apos;s stages).</span>
        <span className="italic text-amber-300">Amber: not implemented, only written down in model/steps.ts.</span>
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
            <Node key={box.node.id} box={box} state={stateOf(box.node.id)} progress={progress?.[box.node.id]} today={today} onPick={() => setSel(sel === box.node.id ? null : box.node.id)} />
          ))}
        </svg>
      </div>

      {path.outside.length > 0 && (
        <p className="text-sm text-slate-400">
          Builds on another area: {path.outside.map(([from, to]) => `${nodes.get(to)!.label} ← ${nodes.get(from)!.label}`).join(" · ")}
        </p>
      )}
      {spare.length > 0 && (
        <details className="rounded-xl border border-slate-800 p-4">
          <summary className="cursor-pointer text-sm text-slate-300">
            Ladder steps in the code that no concept has ({spare.reduce((n, s) => n + s.steps.length, 0)})
          </summary>
          <div className="mt-3 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {spare.map(({ ladder, steps }) => (
              <div key={ladder.id}>
                <h4 className={H}>{ladder.label}</h4>
                <ol className="space-y-0.5 text-xs text-slate-300">{steps.map((s, i) => <li key={i}>{stepLine(s)}</li>)}</ol>
              </div>
            ))}
          </div>
        </details>
      )}
      {selected
        ? <Detail node={selected} nodes={nodes} progress={progress?.[selected.id]} today={today} pick={(id, a) => { setArea(a); setSel(id); }} />
        : <p className="text-sm text-slate-500">No concept picked.</p>}
    </div>
  );
}
