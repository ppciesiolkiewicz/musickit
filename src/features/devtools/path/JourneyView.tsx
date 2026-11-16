"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { topicsFor } from "@/features/plan/intake/topics";
import { AREAS, type Area } from "@/features/plan/model/concepts";
import { LEVEL_ORDER } from "@/features/plan/model/outcome";
import type { PathNode } from "../model/path";
import type { ConceptProgress, StepState } from "../model/stepProgress";

/*
 * The learning path as a journey (NEW13): an area's topics down, the four levels across, and every track a row of its
 * own with a block in each level its steps reach, holding that level's steps. A ribbon runs under the blocks from the
 * track's first level to its last, so a skill that grows over several levels reads as one line. Picking a track lights
 * what it builds on and what builds on it.
 */

const ACCENT: Record<Area, { hue: string; soft: string; ring: string; text: string }> = {
  guitar: { hue: "#f59e0b", soft: "rgba(245,158,11,0.14)", ring: "rgba(245,158,11,0.55)", text: "#fde68a" },
  voice: { hue: "#f472b6", soft: "rgba(244,114,182,0.14)", ring: "rgba(244,114,182,0.55)", text: "#fbcfe8" },
  theory: { hue: "#38bdf8", soft: "rgba(56,189,248,0.14)", ring: "rgba(56,189,248,0.55)", text: "#bae6fd" },
};
const LEVEL_TINT = ["#34d399", "#38bdf8", "#a78bfa", "#f472b6"];
const STATE_FILL: Record<StepState, string> = { solid: "#34d399", working: "#fbbf24", none: "transparent" };
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

type Mark = "sel" | "before" | "after" | "dim" | "plain";

function StepDot({ planned, state }: { planned: boolean; state?: StepState }) {
  if (state) {
    return (
      <span
        aria-hidden className="mt-[3px] inline-block size-2.5 shrink-0 rounded-[3px] border"
        style={{ background: planned ? "transparent" : STATE_FILL[state], borderColor: planned ? "#475569" : state === "none" ? "#64748b" : STATE_FILL[state], borderStyle: planned ? "dashed" : "solid" }}
      />
    );
  }
  return (
    <span
      aria-hidden className="mt-[3px] inline-block size-2.5 shrink-0 rounded-full border"
      style={planned ? { borderColor: "#64748b", borderStyle: "dashed" } : { background: "currentColor", borderColor: "currentColor" }}
    />
  );
}

function TrackRow({ node, mark, progress, onPick, onHover }: {
  node: PathNode; mark: Mark; progress?: ConceptProgress; onPick: () => void; onHover: (on: boolean) => void;
}) {
  const a = ACCENT[node.area];
  const byLevel = LEVEL_ORDER.map((level) => node.steps.map((s, i) => ({ s, i })).filter(({ s }) => s.level === level));
  const lit = mark === "sel" || mark === "before" || mark === "after";
  const ring = mark === "sel" ? "#e9d5ff" : mark === "before" ? "#7dd3fc" : mark === "after" ? "#c4b5fd" : a.ring;
  const solid = progress?.state === "solid", working = progress?.state === "working";
  return (
    <div
      className="relative grid grid-cols-4 gap-3 py-1.5 transition-opacity duration-200"
      style={{ opacity: mark === "dim" ? 0.22 : 1 }}
    >
      {/* the ribbon from the first level to the last */}
      <div
        aria-hidden className="pointer-events-none absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full"
        style={{
          left: `calc(${(node.level / 4) * 100}% + 1.5rem)`, right: `calc(${((3 - node.to) / 4) * 100}% + 1.5rem)`,
          background: `linear-gradient(90deg, ${a.hue}, ${a.hue}55)`, boxShadow: lit ? `0 0 14px ${a.hue}` : undefined,
        }}
      />
      {byLevel.map((steps, col) => {
        if (col < node.level || col > node.to) return <div key={col} />;
        if (!steps.length) {
          return (
            <div key={col} className="relative flex items-center justify-center">
              <span className="rounded-full border border-slate-700 bg-slate-950 px-2 py-0.5 text-[10px] text-slate-500">keeps going</span>
            </div>
          );
        }
        const first = col === node.level;
        return (
          <button
            key={col} type="button" onClick={onPick} aria-pressed={mark === "sel"}
            onMouseEnter={() => onHover(true)} onMouseLeave={() => onHover(false)} onFocus={() => onHover(true)} onBlur={() => onHover(false)}
            aria-label={`${node.label}, ${LEVEL_ORDER[col]}: steps ${steps.map(({ i }) => i + 1).join(", ")} of ${node.steps.length}`}
            className="relative cursor-pointer rounded-xl border p-2.5 text-left transition-all duration-200 hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400"
            style={{
              borderColor: progress ? (solid ? "#34d399" : working ? "#fbbf24" : "#334155") : ring,
              boxShadow: lit ? `0 0 0 1px ${ring}, 0 8px 28px -8px ${a.hue}` : `0 6px 18px -12px ${a.hue}`,
              background: `linear-gradient(160deg, ${a.soft}, transparent 60%), #020617`,
            } as CSSProperties}
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className={`text-[13px] font-semibold leading-tight ${first ? "" : "opacity-70"}`} style={{ color: a.text }}>
                {node.label}{!first && <span className="ml-1 text-[10px] font-normal text-slate-500">cont.</span>}
              </span>
              <span className="shrink-0 font-mono text-[10px] text-slate-500">{steps[0].i + 1}{steps.length > 1 ? `–${steps[steps.length - 1].i + 1}` : ""}/{node.steps.length}</span>
            </div>
            <ol className="mt-1.5 space-y-1">
              {steps.map(({ s, i }) => {
                const st = progress?.steps[i];
                const here = progress?.at === i;
                return (
                  <li key={i} className="flex gap-1.5 text-[11.5px] leading-snug" style={{ color: s.planned ? "#94a3b8" : a.text }}>
                    <StepDot planned={s.planned} state={st?.state} />
                    <span className={here ? "font-bold text-white" : ""}>
                      {s.name}{s.holds && <span className="text-slate-500">: {s.holds}</span>}
                    </span>
                  </li>
                );
              })}
            </ol>
          </button>
        );
      })}
    </div>
  );
}

/** One area's path as a journey; `progress` lays a student over it. */
export default function JourneyView({ area, nodes, progress, selected, onPick }: {
  area: Area; nodes: Map<string, PathNode>; progress: Record<string, ConceptProgress> | null; selected: string | null; onPick: (id: string | null) => void;
}) {
  const [hover, setHover] = useState<string | null>(null);
  const own = useMemo(() => [...nodes.values()].filter((n) => n.area === area), [nodes, area]);
  const focus = hover ?? selected;
  const marks = useMemo(() => {
    if (!focus || !nodes.get(focus)) return null;
    const n = nodes.get(focus)!;
    return { before: new Set(n.buildsOn), after: new Set(n.leadsTo) };
  }, [focus, nodes]);
  const markOf = (id: string): Mark => (!marks ? "plain" : id === focus ? "sel" : marks.before.has(id) ? "before" : marks.after.has(id) ? "after" : "dim");
  const steps = own.reduce((n, x) => n + x.steps.length, 0);
  const built = own.reduce((n, x) => n + x.steps.filter((s) => !s.planned).length, 0);
  const spanning = own.filter((n) => n.to > n.level).length;
  const a = ACCENT[area];
  const label = AREAS.find((x) => x.id === area)!.label;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-4">
        {[
          [own.length, "skills", `each one a track through the levels`],
          [steps, "steps", "easiest first, each at its own level"],
          [spanning, "span levels", "a skill grows over two levels or more"],
          [built, "steps read from the tools", `the app knows which one a player is on`],
        ].map(([n, what, hint]) => (
          <div key={what as string} className="rounded-2xl border border-slate-800 p-4" style={{ background: `linear-gradient(150deg, ${a.soft}, transparent 70%)` }}>
            <p className="text-3xl font-semibold tabular-nums" style={{ color: a.text }}>{n}</p>
            <p className="text-sm font-medium text-slate-200">{what}</p>
            <p className="text-xs text-slate-500">{hint}</p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/70">
        <div className="min-w-[1100px] p-4">
          <div className="sticky top-0 z-10 grid grid-cols-[180px_1fr] gap-4 pb-3">
            <div className="self-end text-xs font-medium uppercase tracking-wider text-slate-500">{label}</div>
            <div className="grid grid-cols-4 gap-3">
              {LEVEL_ORDER.map((level, i) => (
                <div key={level} className="relative overflow-hidden rounded-xl border border-slate-800 px-3 py-2">
                  <div aria-hidden className="absolute inset-x-0 top-0 h-0.5" style={{ background: LEVEL_TINT[i] }} />
                  <p className="text-sm font-semibold text-slate-100">{cap(level)}</p>
                  <p className="text-[11px] text-slate-500">level {i + 1} of 4</p>
                </div>
              ))}
            </div>
          </div>
          {topicsFor(area).map((topic) => {
            const tracks = own.filter((n) => n.topic === topic.id);
            return (
              <section key={topic.id} className="grid grid-cols-[180px_1fr] gap-4 border-t border-slate-800/80 py-3" aria-label={topic.label}>
                <div className="pr-2">
                  <p className="text-sm font-semibold text-slate-100">{topic.label}</p>
                  <p className="mt-0.5 text-[11px] leading-snug text-slate-500">{topic.desc}</p>
                  <p className="mt-2 text-[11px] text-slate-500">{tracks.length} skill{tracks.length === 1 ? "" : "s"} · {tracks.reduce((n, t) => n + t.steps.length, 0)} steps</p>
                </div>
                <div>
                  {tracks.map((node) => (
                    <TrackRow
                      key={node.id} node={node} mark={markOf(node.id)} progress={progress?.[node.id]}
                      onPick={() => onPick(selected === node.id ? null : node.id)} onHover={(on) => setHover(on ? node.id : null)}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>

      <p className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-400">
        {progress ? (
          <>
            <span><StepDot planned={false} state="solid" /> solid</span>
            <span><StepDot planned={false} state="working" /> working on it</span>
            <span><StepDot planned={false} state="none" /> not started</span>
            <span><StepDot planned state="none" /> not tracked yet</span>
            <span className="font-bold text-slate-200">bold: the step the student is on</span>
          </>
        ) : (
          <>
            <span className="inline-flex gap-1" style={{ color: a.text }}><StepDot planned={false} /> a tool knows this step</span>
            <span className="inline-flex gap-1"><StepDot planned /> no tool level for it yet</span>
            <span className="text-sky-300">blue ring: learn it first</span>
            <span className="text-violet-300">violet ring: comes after it</span>
          </>
        )}
      </p>
    </div>
  );
}
