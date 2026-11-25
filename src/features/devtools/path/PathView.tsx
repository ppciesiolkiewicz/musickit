"use client";

import { useMemo, useState } from "react";
import { AREAS, type Area } from "@/features/plan/model/concepts";
import { LEVEL_ORDER } from "@/features/plan/model/outcome";
import { localDate } from "@/features/plan/model/schedule";
import { usePlan } from "@/features/plan/store/usePlan";
import { STAR_LABELS } from "@/features/progress/stars";
import { useProgress } from "@/features/progress/useProgress";
import type { PathNode } from "../model/path";
import { blockHref } from "../model/stepHref";
import { EXAMPLE_STUDENTS, entryProgress, exampleRatings, playerReach, stepProgress, studentReach, weeksBetween, type ConceptProgress, type StepState } from "../model/stepProgress";
import type { SpareSteps, Step } from "../model/steps";
import JourneyView from "./JourneyView";
import KeyStages from "./KeyStages";
import KeysView from "./KeysView";
import SlopeView from "./SlopeView";
import type { GenreMark } from "../model/stepBlocks";

const BTN = "inline-flex min-h-8 cursor-pointer items-center rounded-lg border px-3 py-1 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400";
const H = "mb-1 text-xs font-medium uppercase tracking-wider text-slate-400";

const STATE_COLOR: Record<StepState, string> = { solid: "var(--color-emerald-400)", working: "var(--color-amber-400)", none: "var(--color-slate-600)" };
const STATE_WORD: Record<StepState, string> = { solid: "solid", working: "working on it", none: "not started" };
const stepLine = (s: Step) => (s.holds ? `${s.name}: ${s.holds}` : s.name);

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

/** A step's blocks, opened on /admin/content/block in a new tab; amber "no block" when none practises it. */
export function BlocksLink({ ref_, n }: { ref_: string; n: number }) {
  return (
    <a
      href={blockHref({ step: ref_ })} target="_blank" rel="noreferrer"
      title={n ? `Open the ${n === 1 ? "block" : `${n} blocks`} for this step in a new tab` : "No block practises this step yet: open the step in a new tab"}
      className={`ml-2 rounded border px-1.5 py-0.5 text-xs hover:underline ${n ? "border-sky-500/40 text-sky-300" : "border-amber-400/40 text-amber-300"}`}
    >
      {n ? `${n} block${n === 1 ? "" : "s"} ↗` : "no block ↗"}
    </a>
  );
}

function Detail({ node, nodes, pick, progress, today, blocks }: { node: PathNode; nodes: Map<string, PathNode>; pick: (id: string, area: Area) => void; progress?: ConceptProgress; today: string; blocks: Record<string, number> }) {
  const go = (id: string) => pick(id, nodes.get(id)!.area);
  const list = (ids: string[]) => ids.length
    ? <ul className="space-y-0.5 font-mono text-xs text-slate-300">{ids.map((id) => <li key={id}>{id}</li>)}</ul>
    : <p className="text-sm text-amber-300">None</p>;
  return (
    <section className="rounded-xl border border-violet-500/30 bg-slate-900/60 p-4">
      <h3 className="text-lg font-semibold text-violet-100">{node.label}</h3>
      <p className="text-sm text-slate-400">
        <span className="font-mono text-xs">{node.id}</span> · {LEVEL_ORDER[node.level]}{node.to > node.level && ` to ${LEVEL_ORDER[node.to]}`} · {node.topic}
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
        <div><h4 className={H}>Seed blocks</h4>{list(node.exercises)}</div>
        <div><h4 className={H}>Seed plans</h4>{list(node.plans)}</div>
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
                <BlocksLink ref_={`${node.id}:${i + 1}`} n={blocks[`${node.id}:${i + 1}`] ?? 0} />
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

/** The learning path of one area, in four views: Path (skills by topic and level), Slope (steps by what they need
 * first), Keys (the keys each level adds); a student can be laid over the first two. */
export default function PathView({ nodes: list, spare, blocks = {}, genres = {}, initial }: { nodes: PathNode[]; spare: SpareSteps[]; /** the genre blocks hung off each step ref, from model/stepBlocks.ts */ genres?: Record<string, GenreMark[]>; /** blocks per step ref, from model/stepBlocks.ts */ blocks?: Record<string, number>; /** a concept to open on */ initial?: string }) {
  const nodes = useMemo(() => new Map(list.map((n) => [n.id, n])), [list]);
  const start = initial ? list.find((n) => n.id === initial) : undefined;
  const [area, setArea] = useState<Area>(start?.area ?? "guitar");
  const [sel, setSel] = useState<string | null>(start?.id ?? null);
  const [who, setWho] = useState("none");
  const [view, setView] = useState<"journey" | "slope" | "keys">("journey");
  const [today] = useState(() => localDate());
  const { state: planState, loaded: planLoaded } = usePlan();
  const { answers } = planState;
  const { entries, loaded: entriesLoaded } = useProgress();
  const progress = useMemo(() => {
    if (who === "none") return null;
    if (who === "me") {
      if (!planLoaded || !entriesLoaded) return null;
      // the composer's rule: the steps the ratings name, solid as `solidRatedAt` has them
      return entryProgress(entries);
    }
    const student = EXAMPLE_STUDENTS.find((s) => s.id === who);
    return student ? stepProgress(exampleRatings(student, today), today) : null;
  }, [who, today, planLoaded, entries, entriesLoaded]);
  // the reach marks: for the player in this browser the composer's own inputs (their answers raised by their ratings,
  // `solidRatedAt`), for an example its topics and its made-up progress
  const reachMarks = useMemo(() => {
    if (!progress) return null;
    if (who === "me") return playerReach(answers?.topics ?? {}, entries, today);
    return studentReach(EXAMPLE_STUDENTS.find((s) => s.id === who)?.topics ?? {}, progress);
  }, [progress, who, answers, entries, today]);
  const own = useMemo(() => list.filter((n) => n.area === area), [list, area]);
  const areaLabel = AREAS.find((a) => a.id === area)!.label;
  const selected = sel ? nodes.get(sel) : undefined;
  const pickArea = (id: Area) => {
    setArea(id);
    setSel(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Which view">
        {([["journey", "Path"], ["slope", "Slope"], ["keys", "Keys"]] as const).map(([id, label]) => (
          <button
            key={id} type="button" aria-pressed={view === id} onClick={() => setView(id)}
            className={`${BTN} ${view === id ? "border-violet-400 bg-violet-500/20 text-violet-100" : "border-slate-700 text-slate-300 hover:border-slate-400"}`}
          >
            {label}
          </button>
        ))}
        <span className="mx-1 h-6 w-px bg-slate-800" aria-hidden />
        {AREAS.map((a) => (
          <button
            key={a.id} type="button" aria-pressed={a.id === area} onClick={() => pickArea(a.id)}
            className={`${BTN} ${a.id === area ? "border-sky-400 bg-sky-500/20 text-sky-100" : "border-slate-700 text-slate-300 hover:border-slate-400"}`}
          >
            {a.label}
          </button>
        ))}
      </div>
      {view !== "keys" && (
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="path-student" className="text-sm text-slate-300">Student on the path</label>
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
                const mine = own.map((node) => ({ node, p: progress[node.id] }));
                const tracked = mine.flatMap(({ node, p }) => p.steps.filter((_, i) => !node.steps[i].planned));
                return `${mine.filter((x) => x.p.state === "solid").length} skills solid · ${mine.filter((x) => x.p.state === "working").length} working · ${tracked.filter((s) => s.state === "solid").length} of ${tracked.length} tracked steps solid · ${mine.reduce((n, x) => n + x.p.ratings, 0)} ratings in ${areaLabel}`;
              })()}
            </span>
          )}
        </div>
      )}
      {view === "keys" && <KeysView area={area} />}
      {view === "slope" && <SlopeView area={area} progress={progress} reach={reachMarks} blocks={blocks} genres={genres} />}
      {view === "journey" && (
        <>
          <JourneyView area={area} nodes={nodes} progress={progress} selected={sel} onPick={setSel} />
          <KeyStages area={area} entries={who === "me" && entriesLoaded ? entries : null} selected={sel} />
          {selected
            ? <Detail node={selected} nodes={nodes} progress={progress?.[selected.id]} today={today} blocks={blocks} pick={(id, a) => { setArea(a); setSel(id); }} />
            : <p className="text-sm text-slate-500">Pick a skill to see its steps, what it builds on and its seed blocks and plans.</p>}
          {spare.length > 0 && (
            <details className="rounded-xl border border-slate-800 p-4">
              <summary className="cursor-pointer text-sm text-slate-300">
                Ladder steps in the code that no skill has ({spare.reduce((n, s) => n + s.steps.length, 0)})
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
        </>
      )}
    </div>
  );
}
