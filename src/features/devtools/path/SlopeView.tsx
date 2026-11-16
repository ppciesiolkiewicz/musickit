"use client";

import { useMemo, useState } from "react";
import { topicById } from "@/features/plan/intake/topics";
import { AREAS, type Area } from "@/features/plan/model/concepts";
import { LEVEL_ORDER } from "@/features/plan/model/outcome";
import { PATH, predecessorsOf, slope, stepAt, type SlopeStep, type Track } from "@/features/plan/model/path";
import { ADDED_AFTER, isAdded, proposedPath } from "../model/slopeProposal";
import type { ConceptProgress, StepState } from "../model/stepProgress";

/*
 * The learning path as a slope (docs/superpowers/specs/2026-11-16-path-slope-design.md): every step of an area placed
 * by its level and by how deep its chain of steps to learn first runs, so the order inside a level shows. Rows are the
 * area's tracks, sorted by where their first step falls. "As it is" draws PATH; "Proposed" draws the same picture with
 * the named prerequisites and the double-stops track (model/slopeProposal.ts), so the two can be flipped between.
 */

const ACCENT: Record<Area, { hue: string; soft: string; text: string }> = {
  guitar: { hue: "#f59e0b", soft: "rgba(245,158,11,0.14)", text: "#fde68a" },
  voice: { hue: "#f472b6", soft: "rgba(244,114,182,0.14)", text: "#fbcfe8" },
  theory: { hue: "#38bdf8", soft: "rgba(56,189,248,0.14)", text: "#bae6fd" },
};
const LEVEL_TINT = ["#34d399", "#38bdf8", "#a78bfa", "#f472b6"];
const ADDED = "#fb923c";
const STATE_RING: Record<StepState, string | null> = { solid: "#34d399", working: "#fbbf24", none: null };
const LABEL_W = 170, X0 = 8, COL_W = 136, PILL_W = 124, PILL_H = 50, ROW_H = 62, HEAD_H = 46, GAP = 14;
const BTN = "inline-flex min-h-8 cursor-pointer items-center rounded-lg border px-3 py-1 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400";
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

type Version = "now" | "proposed";

interface Laid { step: SlopeStep; x: number; y: number }

function closure(start: string, next: (ref: string) => string[]): Set<string> {
  const seen = new Set<string>();
  const walk = (r: string) => next(r).forEach((p) => { if (!seen.has(p)) { seen.add(p); walk(p); } });
  walk(start);
  return seen;
}

const label = (ref: string, tracks: Track[]) => {
  const at = stepAt(ref, tracks);
  return at ? `${at.track.label} ${at.index + 1}: ${at.step.name}` : ref;
};

/** `progress`: a student laid over the path, keyed by track id; a step's ring is its state, the step they are on is bold. */
export default function SlopeView({ area, progress }: { area: Area; progress: Record<string, ConceptProgress> | null }) {
  const [version, setVersion] = useState<Version>("proposed");
  const [pick, setPick] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const proposed = useMemo(() => proposedPath(), []);
  const tracks = version === "proposed" ? proposed : PATH;
  const all = useMemo(() => slope(tracks), [tracks]);
  const nowDepth = useMemo(() => new Map(slope(PATH).map((s) => [s.ref, s.depth])), []);
  const order = useMemo(() => new Map(all.map((s, i) => [s.ref, i])), [all]);

  const { laid, rows, bands, width, height } = useMemo(() => {
    const own = all.filter((s) => s.track.area === area);
    const depthsAt = LEVEL_ORDER.map((lv) => [...new Set(own.filter((s) => s.level === lv).map((s) => s.depth))].sort((a, b) => a - b));
    const offset = depthsAt.map((_, i) => depthsAt.slice(0, i).reduce((n, d) => n + d.length, 0));
    const rows = [...new Map(own.map((s) => [s.track.id, s.track])).values()]
      .sort((a, b) => order.get(`${a.id}:1`)! - order.get(`${b.id}:1`)!);
    const rowOf = new Map(rows.map((t, i) => [t.id, i]));
    const laid = new Map<string, Laid>(own.map((step) => {
      const li = LEVEL_ORDER.indexOf(step.level);
      const col = offset[li] + depthsAt[li].indexOf(step.depth);
      return [step.ref, { step, x: X0 + col * COL_W, y: HEAD_H + rowOf.get(step.track.id)! * ROW_H }];
    }));
    const cols = offset[3] + depthsAt[3].length;
    const bands = LEVEL_ORDER.map((lv, i) => ({ level: lv, x: X0 + offset[i] * COL_W, w: depthsAt[i].length * COL_W, cols: depthsAt[i].length }));
    return { laid, rows, bands, width: X0 + cols * COL_W + GAP, height: HEAD_H + rows.length * ROW_H };
  }, [all, area, order]);

  const successors = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const s of all) for (const p of predecessorsOf(s.ref, tracks)) m.set(p, [...(m.get(p) ?? []), s.ref]);
    return m;
  }, [all, tracks]);

  const focus = hover ?? pick;
  const lit = useMemo(() => focus ? {
    before: closure(focus, (r) => predecessorsOf(r, tracks)),
    after: closure(focus, (r) => successors.get(r) ?? []),
  } : null, [focus, tracks, successors]);

  const edges = [...laid.values()].flatMap(({ step, x, y }) => predecessorsOf(step.ref, tracks).flatMap((p) => {
    const from = laid.get(p);
    if (!from) return [];
    const sameTrack = stepAt(p, tracks)!.track.id === step.track.id;
    const added = version === "proposed" && isAdded(step.ref, p);
    const on = lit && (step.ref === focus || lit.before.has(step.ref) || lit.after.has(step.ref)) && (p === focus || lit.before.has(p) || lit.after.has(p));
    const x1 = from.x + PILL_W, y1 = from.y + PILL_H / 2, x2 = x, y2 = y + PILL_H / 2;
    const mid = Math.max(24, (x2 - x1) / 2);
    return [{ key: `${p}>${step.ref}`, d: `M${x1},${y1} C${x1 + mid},${y1} ${x2 - mid},${y2} ${x2},${y2}`, sameTrack, added, on }];
  }));

  const a = ACCENT[area];
  const own = [...laid.values()];
  const moved = version === "proposed" ? own.filter(({ step }) => nowDepth.has(step.ref) && nowDepth.get(step.ref) !== step.depth) : [];
  const fresh = version === "proposed" ? own.filter(({ step }) => !nowDepth.has(step.ref)) : [];
  const addedHere = version === "proposed" ? Object.entries(ADDED_AFTER).filter(([r]) => stepAt(r, tracks)?.track.area === area).reduce((n, [, l]) => n + l.length, 0) : 0;
  const deepest = Math.max(0, ...own.map(({ step }) => step.depth));
  const focused = focus ? stepAt(focus, tracks) : undefined;
  const areaLabel = AREAS.find((x) => x.id === area)!.label;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Which path">
        {([["now", "As it is"], ["proposed", "Proposed"]] as const).map(([id, text]) => (
          <button
            key={id} type="button" aria-pressed={version === id} onClick={() => setVersion(id)}
            className={`${BTN} ${version === id ? "border-orange-400 bg-orange-500/20 text-orange-100" : "border-slate-700 text-slate-300 hover:border-slate-400"}`}
          >
            {text}
          </button>
        ))}
        <span className="text-sm text-slate-400">Flip between the two to see what the new prerequisites move.</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        {[
          [own.length, "steps", `in ${areaLabel}`],
          [bands.reduce((n, b) => n + b.cols, 0), "columns", "a column is one depth inside a level"],
          [deepest, "deepest chain", "steps to learn before the last one"],
          version === "proposed" ? [addedHere + fresh.length, "changes", `${plural(addedHere, "new link")}, ${plural(fresh.length, "new step")}, ${plural(moved.length, "step")} moved`] : [edges.filter((e) => !e.sameTrack).length, "links across tracks", "drawn as blue curves"],
        ].map(([n, what, hint]) => (
          <div key={what as string} className="rounded-2xl border border-slate-800 p-4" style={{ background: `linear-gradient(150deg, ${a.soft}, transparent 70%)` }}>
            <p className="text-3xl font-semibold tabular-nums" style={{ color: a.text }}>{n}</p>
            <p className="text-sm font-medium text-slate-200">{what}</p>
            <p className="text-xs text-slate-500">{hint}</p>
          </div>
        ))}
      </div>

      <div className="flex rounded-2xl border border-slate-800 bg-slate-950/70" onMouseLeave={() => setHover(null)}>
        <div className="relative shrink-0 border-r border-slate-800 p-3" style={{ width: LABEL_W + 24, height: height + 24 }}>
          <p className="absolute left-3 top-4 text-xs font-medium uppercase tracking-wider text-slate-500">{areaLabel}</p>
          {rows.map((t, i) => (
            <div key={t.id} className="absolute left-3 pr-3" style={{ top: 12 + HEAD_H + i * ROW_H, width: LABEL_W, height: PILL_H }}>
              <p className={`text-[13px] font-semibold leading-tight ${version === "proposed" && t.id === "double-stops" ? "text-orange-300" : "text-slate-100"}`}>{t.label}</p>
              <p className="text-[11px] text-slate-500">{topicById(t.topic)?.label ?? t.topic} · {t.steps.length} steps</p>
            </div>
          ))}
        </div>
        <div className="min-w-0 flex-1 overflow-x-auto">
        <div className="relative p-3" style={{ width: width + 24, height: height + 24 }}>
          <div className="relative" style={{ width, height }}>
            {bands.map((b, i) => b.cols > 0 && (
              <div key={b.level} className="absolute top-0 rounded-lg border border-slate-800/80" style={{ left: b.x - 6, width: b.w - 2, height, background: i % 2 ? "rgba(15,23,42,0.5)" : "transparent" }}>
                <div className="h-0.5 rounded-t-lg" style={{ background: LEVEL_TINT[i] }} />
                <p className="px-2 pt-1 text-sm font-semibold text-slate-100">{cap(b.level)} <span className="text-[11px] font-normal text-slate-500">{b.cols} column{b.cols === 1 ? "" : "s"}</span></p>
              </div>
            ))}
            <svg className="pointer-events-none absolute inset-0" width={width} height={height} aria-hidden>
              {edges.map((e) => (
                <path
                  key={e.key} d={e.d} fill="none"
                  stroke={e.added ? ADDED : e.sameTrack ? a.hue : "#7dd3fc"}
                  strokeOpacity={lit ? (e.on ? 0.95 : 0.06) : e.sameTrack ? 0.35 : 0.55}
                  strokeWidth={e.on ? 2.5 : e.sameTrack ? 3 : 1.5}
                  strokeDasharray={e.added ? "5 4" : undefined}
                />
              ))}
            </svg>
            {own.map(({ step, x, y }) => {
              const st = step.track.steps[step.index];
              const mark = !lit ? "plain" : step.ref === focus ? "sel" : lit.before.has(step.ref) ? "before" : lit.after.has(step.ref) ? "after" : "dim";
              const was = nowDepth.get(step.ref);
              const isNew = version === "proposed" && was === undefined;
              const shift = version === "proposed" && was !== undefined && was !== step.depth ? step.depth - was : 0;
              const mine = progress?.[step.track.id];
              const state = mine?.steps[step.index]?.state;
              const here = mine?.at === step.index;
              const ring = mark === "sel" ? "#e9d5ff" : mark === "before" ? "#7dd3fc" : mark === "after" ? "#c4b5fd" : (state && STATE_RING[state]) || (progress ? "#334155" : isNew || shift ? ADDED : "#334155");
              return (
                <button
                  key={step.ref} type="button"
                  aria-pressed={pick === step.ref}
                  aria-label={`${step.track.label}, step ${step.index + 1}: ${st.name}. ${cap(step.level)}, depth ${step.depth}, number ${order.get(step.ref)! + 1} on the path`}
                  onClick={() => setPick(pick === step.ref ? null : step.ref)}
                  onMouseEnter={() => setHover(step.ref)} onFocus={() => setHover(step.ref)} onBlur={() => setHover(null)}
                  className="absolute cursor-pointer rounded-lg border px-2 py-1 text-left transition-opacity duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400"
                  style={{
                    left: x, top: y, width: PILL_W, height: PILL_H, borderColor: ring,
                    opacity: mark === "dim" ? 0.25 : 1,
                    background: `linear-gradient(160deg, ${a.soft}, transparent 70%), #020617`,
                    boxShadow: mark === "sel" ? `0 0 0 1px ${ring}, 0 6px 20px -6px ${a.hue}` : undefined,
                  }}
                >
                  <span className="flex items-baseline justify-between gap-1 text-[10px] text-slate-500">
                    <span>{step.index + 1}/{step.track.steps.length}</span>
                    <span className="font-mono">
                      d{step.depth}
                      {shift !== 0 && <span className="ml-1 text-orange-300">{shift > 0 ? `+${shift}` : shift}</span>}
                      {isNew && <span className="ml-1 text-orange-300">new</span>}
                    </span>
                  </span>
                  <span className={`line-clamp-2 block text-[11.5px] leading-tight ${here ? "font-bold text-white" : "font-medium"}`} style={here ? undefined : { color: a.text }}>{st.name}</span>
                </button>
              );
            })}
          </div>
        </div>
        </div>
      </div>

      <p className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-400">
        <span>dN: how many steps deep its chain of steps to learn first runs</span>
        <span style={{ color: a.text }}>solid line: the step before, in its own track</span>
        <span className="text-sky-300">blue curve: a step in another track to learn first</span>
        {version === "proposed" && <span className="text-orange-300">orange: a new link, a new step, or a step that moved (+N deeper than now)</span>}
        {progress && <span><span className="text-emerald-300">green ring: solid</span> · <span className="text-amber-300">amber ring: working on it</span> · <b className="text-white">bold: the step the student is on</b> · a rating with no step shows on no step</span>}
        <span>Hover or pick a step: blue ring learn first, violet ring comes after</span>
      </p>

      {focused ? (
        <div className="rounded-2xl border border-slate-800 p-4 text-sm">
          <p className="font-semibold text-slate-100">{focused.track.label}, step {focused.index + 1}: {focused.step.name}</p>
          {focused.step.holds && <p className="text-slate-400">{focused.step.holds}</p>}
          <p className="mt-1 text-slate-400">
            {cap(focused.step.level)} · depth {all[order.get(focus!)!].depth} · number {order.get(focus!)! + 1} of {all.length} on the whole path
            {version === "proposed" && nowDepth.has(focus!) && nowDepth.get(focus!) !== all[order.get(focus!)!].depth && <span className="text-orange-300"> · depth {nowDepth.get(focus!)} as it is</span>}
          </p>
          {lit && lit.before.size > 0 && (() => {
            const chain = [...lit.before].map((r) => stepAt(r, tracks)!.track);
            const names = [...new Set(chain.map((t) => t.label))];
            return <p className="text-slate-400">Whole chain under it: {plural(lit.before.size, "step")} in {plural(names.length, "track")} ({names.join(", ")}).</p>;
          })()}
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-sky-300">Learn first</p>
              <ul className="mt-1 space-y-0.5 text-slate-300">
                {predecessorsOf(focus!, tracks).map((p) => (
                  <li key={p}>
                    {label(p, tracks)}
                    {stepAt(p, tracks)!.track.area !== area && <span className="text-slate-500"> ({AREAS.find((x) => x.id === stepAt(p, tracks)!.track.area)!.label})</span>}
                    {version === "proposed" && isAdded(focus!, p) && <span className="text-orange-300"> new</span>}
                  </li>
                ))}
                {!predecessorsOf(focus!, tracks).length && <li className="text-slate-500">Nothing: a place to start.</li>}
              </ul>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-violet-300">Opens</p>
              <ul className="mt-1 space-y-0.5 text-slate-300">
                {(successors.get(focus!) ?? []).map((s) => <li key={s}>{label(s, tracks)}</li>)}
                {!(successors.get(focus!) ?? []).length && <li className="text-slate-500">Nothing after it yet.</li>}
              </ul>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-sm text-slate-500">Pick a step to see what it needs first and what it opens.</p>
      )}
    </div>
  );
}
