"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { topicById } from "@/features/plan/intake/topics";
import { AREAS, type Area } from "@/features/plan/model/concepts";
import { LEVEL_ORDER } from "@/features/plan/model/outcome";
import { PATH, predecessorsOf, slope, stepAt, type SlopeStep, type Track } from "@/features/plan/model/path";
import { ADDED_AFTER, isAdded, proposedPath, whyOf } from "../model/slopeProposal";
import type { StepReach } from "@/features/plan/model/reach";
import type { ConceptProgress, StepState } from "../model/stepProgress";
import { blockHref } from "../model/stepHref";
import type { GenreMark } from "../model/stepBlocks";
import { GENRES, type Genre } from "@/features/library/seed/genres";

/*
 * The learning path as a slope (docs/superpowers/specs/2026-11-16-path-slope-design.md): every step of an area placed
 * by its level and by how deep its chain of steps to learn first runs, so the order inside a level shows. Rows are the
 * area's tracks, sorted by where their first step falls. "As it is" draws PATH; "Proposed" draws the same picture with
 * the named prerequisites and the double-stops track (model/slopeProposal.ts), so the two can be flipped between.
 */

const ACCENT: Record<Area, { hue: string; soft: string; text: string }> = {
  guitar: { hue: "var(--color-amber-500)", soft: "color-mix(in oklab, var(--color-amber-500) 14%, transparent)", text: "var(--color-amber-200)" },
  voice: { hue: "var(--color-pink-400)", soft: "color-mix(in oklab, var(--color-pink-400) 14%, transparent)", text: "var(--color-pink-200)" },
  theory: { hue: "var(--color-sky-400)", soft: "color-mix(in oklab, var(--color-sky-400) 14%, transparent)", text: "var(--color-sky-200)" },
};
const LEVEL_TINT = ["var(--color-emerald-400)", "var(--color-sky-400)", "var(--color-violet-400)", "var(--color-pink-400)"];
const ADDED = "var(--color-orange-400)";
/** A genre's colour, for its row of dead-end blocks under the tracks. */
const GENRE_HUE: Record<Genre, string> = { blues: "var(--color-blue-400)", rock: "var(--color-red-400)", funk: "var(--color-fuchsia-400)", jazz: "var(--color-emerald-400)" };
const STATE_RING: Record<StepState, string | null> = { solid: "var(--color-emerald-400)", working: "var(--color-amber-400)", none: null };
const LABEL_W = 170, X0 = 8, COL_W = 136, PILL_W = 124, PILL_H = 50, ROW_H = 62, HEAD_H = 46, GAP = 14;
const BTN = "inline-flex min-h-8 cursor-pointer items-center rounded-lg border px-3 py-1 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400";
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

type Version = "now" | "proposed";
interface View { s: number; tx: number; ty: number }
const MIN_S = 0.15, MAX_S = 2, DRAG_PX = 4;
const clampS = (s: number) => Math.min(MAX_S, Math.max(MIN_S, s));

/**
 * Zoom and pan for the slope: drag or scroll to pan, ctrl/⌘ + scroll or a trackpad pinch to zoom around the pointer.
 * A drag only starts past a few pixels, so a click on a step still picks it.
 */
function useZoomPan() {
  const pane = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>({ s: 1, tx: 0, ty: 0 });
  const drag = useRef<{ id: number; x: number; y: number; tx: number; ty: number; on: boolean } | null>(null);
  const dragged = useRef(false);

  const zoomAt = useCallback((factor: number, px?: number, py?: number) => setView((v) => {
    const r = pane.current?.getBoundingClientRect();
    const x = px ?? (r ? r.width / 2 : 0), y = py ?? (r ? r.height / 2 : 0);
    const s = clampS(v.s * factor), k = s / v.s;
    return { s, tx: x - (x - v.tx) * k, ty: y - (y - v.ty) * k };
  }), []);

  useEffect(() => {
    const el = pane.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      if (e.ctrlKey || e.metaKey) zoomAt(Math.exp(-e.deltaY * 0.01), e.clientX - r.left, e.clientY - r.top);
      else setView((v) => ({ ...v, tx: v.tx - (e.shiftKey ? e.deltaY : e.deltaX), ty: v.ty - (e.shiftKey ? 0 : e.deltaY) }));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  const handlers = {
    onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      dragged.current = false;
      drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, tx: view.tx, ty: view.ty, on: false };
    },
    onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => {
      const d = drag.current;
      if (!d || d.id !== e.pointerId) return;
      const dx = e.clientX - d.x, dy = e.clientY - d.y;
      if (!d.on && Math.hypot(dx, dy) < DRAG_PX) return;
      if (!d.on) { d.on = true; dragged.current = true; e.currentTarget.setPointerCapture(e.pointerId); }
      setView((v) => ({ ...v, tx: d.tx + dx, ty: d.ty + dy }));
    },
    onPointerUp: () => { drag.current = null; },
    onPointerCancel: () => { drag.current = null; },
    // A drag that ends on a step is not a pick.
    onClickCapture: (e: React.MouseEvent) => { if (dragged.current) { e.stopPropagation(); e.preventDefault(); dragged.current = false; } },
  };
  return { pane, view, setView, zoomAt, handlers, dragging: () => drag.current?.on ?? false };
}

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

/**
 * `progress`: a student laid over the path, keyed by track id; a step's ring is its state, the step they are on is bold.
 * `reach`: the same student's steps marked known, within reach or ahead (plan/model/reach.ts).
 */
export default function SlopeView({ area, progress, reach = null, blocks = {}, genres = {} }: { area: Area; /** the genre blocks hung off each step ref: each a dead-end block in its genre's row, joined to the step it comes out of */ genres?: Record<string, GenreMark[]>; progress: Record<string, ConceptProgress> | null; reach?: Map<string, StepReach> | null; /** blocks per step ref (model/stepBlocks.ts): a badge on each step opens them on /admin/content/block */ blocks?: Record<string, number> }) {
  const [version, setVersion] = useState<Version>("proposed");
  const [pick, setPick] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const proposed = useMemo(() => proposedPath(), []);
  const tracks = version === "proposed" ? proposed : PATH;
  const all = useMemo(() => slope(tracks), [tracks]);
  const nowDepth = useMemo(() => new Map(slope(PATH).map((s) => [s.ref, s.depth])), []);
  const order = useMemo(() => new Map(all.map((s, i) => [s.ref, i])), [all]);
  const box = useRef<HTMLDivElement>(null);
  const { pane, view, setView, zoomAt, handlers } = useZoomPan();

  const { laid, rows, bands, width, height, ends, genreRows } = useMemo(() => {
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
    // a genre's blocks: dead ends, one row a genre under the tracks, each block one column after the step it comes out of
    // (a second lane when two of a genre would share a column)
    const ends: { g: GenreMark; ref: string; from: Laid; x: number; y: number }[] = [];
    const genreRows: { genre: Genre; row: number; count: number }[] = [];
    let row = rows.length;
    for (const genre of GENRES) {
      const mine = Object.entries(genres)
        .flatMap(([ref, list]) => { const from = laid.get(ref); return from ? list.filter((g) => g.genre === genre).map((g) => ({ g, ref, from })) : []; })
        .sort((p, q) => p.from.x - q.from.x || p.from.y - q.from.y);
      if (!mine.length) continue;
      const lanes: Set<number>[] = [];
      for (const m of mine) {
        const col = Math.round((m.from.x - X0) / COL_W) + 1;
        let lane = lanes.findIndex((taken) => !taken.has(col));
        if (lane < 0) lane = lanes.push(new Set()) - 1;
        lanes[lane].add(col);
        ends.push({ ...m, x: X0 + col * COL_W, y: HEAD_H + (row + lane) * ROW_H });
      }
      genreRows.push({ genre, row, count: mine.length });
      row += lanes.length;
    }
    const cols = Math.max(offset[3] + depthsAt[3].length, ...ends.map((e) => Math.round((e.x - X0) / COL_W) + 1));
    const bands = LEVEL_ORDER.map((lv, i) => ({ level: lv, x: X0 + offset[i] * COL_W, w: depthsAt[i].length * COL_W, cols: depthsAt[i].length }));
    return { laid, rows, bands, width: X0 + cols * COL_W + GAP, height: HEAD_H + row * ROW_H, ends, genreRows };
  }, [all, area, order, genres]);

  const contentW = width + 24, contentH = height + 24, labelsW = LABEL_W + 24;
  const fit = () => {
    const r = box.current?.getBoundingClientRect();
    if (!r) return;
    setView({ s: clampS(Math.min(1, r.width / (labelsW + contentW), r.height / contentH)), tx: 0, ty: 0 });
  };

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
            className={`${BTN} ${version === id ? "border-amber-400 bg-amber-500/20 text-amber-100" : "border-slate-700 text-slate-300 hover:border-slate-400"}`}
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

      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Zoom">
        <button type="button" onClick={() => zoomAt(1 / 1.25)} className={`${BTN} border-slate-700 text-slate-300 hover:border-slate-400`} aria-label="Zoom out">−</button>
        <span className="w-12 text-center text-sm tabular-nums text-slate-300">{Math.round(view.s * 100)}%</span>
        <button type="button" onClick={() => zoomAt(1.25)} className={`${BTN} border-slate-700 text-slate-300 hover:border-slate-400`} aria-label="Zoom in">+</button>
        <button type="button" onClick={fit} className={`${BTN} border-slate-700 text-slate-300 hover:border-slate-400`}>Fit</button>
        <button type="button" onClick={() => setView({ s: 1, tx: 0, ty: 0 })} className={`${BTN} border-slate-700 text-slate-300 hover:border-slate-400`}>100%</button>
        <span className="text-sm text-slate-400">Drag or scroll to move around; ctrl or ⌘ + scroll, or pinch, to zoom.</span>
      </div>

      <div ref={box} className="flex overflow-clip rounded-2xl border border-slate-800 bg-slate-950/70" style={{ height: `min(75vh, ${contentH}px)` }} onMouseLeave={() => setHover(null)}>
        <div className="relative shrink-0 overflow-clip border-r border-slate-800" style={{ width: labelsW * view.s }}>
        <div className="relative p-3" style={{ width: labelsW, height: contentH, transform: `translateY(${view.ty}px) scale(${view.s})`, transformOrigin: "0 0" }}>
          <p className="absolute left-3 top-4 text-xs font-medium uppercase tracking-wider text-slate-500">{areaLabel}</p>
          {rows.map((t, i) => (
            <div key={t.id} className="absolute left-3 pr-3" style={{ top: 12 + HEAD_H + i * ROW_H, width: LABEL_W, height: PILL_H }}>
              <p className={`text-[13px] font-semibold leading-tight ${version === "proposed" && t.id === "double-stops" ? "text-orange-300" : "text-slate-100"}`}>{t.label}</p>
              <p className="text-[11px] text-slate-500">{topicById(t.topic)?.label ?? t.topic} · {t.steps.length} steps</p>
            </div>
          ))}
          {genreRows.map((r) => (
            <div key={r.genre} className="absolute left-3 pr-3" style={{ top: 12 + HEAD_H + r.row * ROW_H, width: LABEL_W, height: PILL_H }}>
              <p className="text-[13px] font-semibold leading-tight" style={{ color: GENRE_HUE[r.genre] }}>{cap(r.genre)}</p>
              <p className="text-[11px] text-slate-500">Genre · {plural(r.count, "dead-end block")}</p>
            </div>
          ))}
        </div>
        </div>
        <div ref={pane} className="relative min-w-0 flex-1 cursor-grab touch-none select-none overflow-clip active:cursor-grabbing" {...handlers}>
        <div className="absolute left-0 top-0 p-3" style={{ width: contentW, height: contentH, transform: `translate(${view.tx}px, ${view.ty}px) scale(${view.s})`, transformOrigin: "0 0" }}>
          <div className="relative" style={{ width, height }}>
            {bands.map((b, i) => b.cols > 0 && (
              <div key={b.level} className="absolute top-0 rounded-lg border border-slate-800/80" style={{ left: b.x - 6, width: b.w - 2, height, background: i % 2 ? "color-mix(in oklab, var(--color-slate-900) 50%, transparent)" : "transparent" }}>
                <div className="h-0.5 rounded-t-lg" style={{ background: LEVEL_TINT[i] }} />
                <p className="px-2 pt-1 text-sm font-semibold text-slate-100">{cap(b.level)} <span className="text-[11px] font-normal text-slate-500">{b.cols} column{b.cols === 1 ? "" : "s"}</span></p>
              </div>
            ))}
            <svg className="pointer-events-none absolute inset-0" width={width} height={height} aria-hidden>
              {edges.map((e) => (
                <path
                  key={e.key} d={e.d} fill="none"
                  stroke={e.added ? ADDED : e.sameTrack ? a.hue : "var(--color-sky-300)"}
                  strokeOpacity={lit ? (e.on ? 0.95 : 0.2) : e.sameTrack ? 0.35 : 0.55}
                  strokeWidth={e.on ? 2.5 : e.sameTrack ? 3 : 1.5}
                  strokeDasharray={e.added ? "5 4" : undefined}
                />
              ))}
              {ends.map((e) => {
                const x1 = e.from.x + PILL_W, y1 = e.from.y + PILL_H / 2, x2 = e.x, y2 = e.y + PILL_H / 2;
                const on = !lit || focus === e.ref;
                return <path key={`g:${e.ref}>${e.g.id}`} d={`M${x1},${y1} C${x1 + 40},${y1} ${x2 - 40},${y2} ${x2},${y2}`} fill="none" stroke={GENRE_HUE[e.g.genre]} strokeOpacity={on ? 0.8 : 0.2} strokeWidth={focus === e.ref ? 2.5 : 1.5} strokeDasharray={e.g.draft ? "5 4" : undefined} />;
              })}
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
              const r = reach?.get(step.ref);
              const next = r?.mark === "reach";
              const ahead = r?.mark === "ahead" && !r.open;
              const ring = mark === "sel" ? "var(--color-violet-200)" : mark === "before" ? "var(--color-sky-300)" : mark === "after" ? "var(--color-violet-300)" : (state && STATE_RING[state]) || (next ? "var(--color-sky-400)" : progress ? "var(--color-slate-700)" : isNew || shift ? ADDED : "var(--color-slate-700)");
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
                    borderStyle: next && !state ? "dashed" : undefined,
                    opacity: mark === "dim" ? 0.55 : ahead && mark === "plain" ? 0.4 : 1,
                    background: `linear-gradient(160deg, ${a.soft}, transparent 70%), var(--color-slate-950)`,
                    boxShadow: mark === "sel" ? `0 0 0 1px ${ring}, 0 6px 20px -6px ${a.hue}` : undefined,
                  }}
                >
                  <span className="flex items-baseline justify-between gap-1 text-[10px] text-slate-500">
                    <span>
                      {step.index + 1}/{step.track.steps.length}
                      {next && <span className="ml-1 font-semibold text-sky-300">{r!.start ? "start" : "next"}</span>}
                      {r?.mark === "known" && state !== "solid" && <span className="ml-1 text-emerald-300/80">known</span>}
                    </span>
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
            {ends.map((e) => {
              const hue = GENRE_HUE[e.g.genre];
              return (
                <a
                  key={`g:${e.ref}:${e.g.id}`} href={blockHref({ id: e.g.id })} target="_blank" rel="noreferrer"
                  onPointerDown={(ev) => ev.stopPropagation()}
                  onMouseEnter={() => setHover(e.ref)} onFocus={() => setHover(e.ref)} onBlur={() => setHover(null)}
                  title={`${cap(e.g.genre)} block, a dead end out of ${label(e.ref, tracks)}${e.g.draft ? ". Switched off" : ""}. Opens the block in a new tab`}
                  aria-label={`${cap(e.g.genre)} block out of ${label(e.ref, tracks)}: ${e.g.title}${e.g.draft ? ", switched off" : ""}, in a new tab`}
                  className="absolute rounded-lg border px-2 py-1 text-left transition-opacity duration-150 hover:brightness-125 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400"
                  style={{ left: e.x, top: e.y, width: PILL_W, height: PILL_H, borderColor: hue, borderStyle: e.g.draft ? "dashed" : "solid", opacity: lit && focus !== e.ref ? 0.55 : 1, background: `linear-gradient(160deg, color-mix(in oklab, ${hue} 22%, transparent), transparent 75%), var(--color-slate-950)` }}
                >
                  <span className="flex items-baseline justify-between gap-1 text-[10px]" style={{ color: hue }}>
                    <span className="font-semibold">{e.g.genre}</span>
                    <span className="text-slate-500">{e.g.draft ? "off" : "dead end"}</span>
                  </span>
                  <span className="line-clamp-2 block text-[11.5px] font-medium leading-tight text-slate-200">{e.g.title}</span>
                </a>
              );
            })}
            {own.map(({ step, x, y }) => {
              const n = blocks[step.ref] ?? 0;
              return (
                <a
                  key={`b:${step.ref}`} href={blockHref({ step: step.ref })} target="_blank" rel="noreferrer"
                  onPointerDown={(e) => e.stopPropagation()}
                  title={n ? `Open the ${n === 1 ? "block" : `${n} blocks`} for this step in a new tab` : "No block practices this step yet"}
                  aria-label={`${step.track.label} step ${step.index + 1}: ${n ? `open ${n === 1 ? "its block" : `its ${n} blocks`}` : "no block yet"}, in a new tab`}
                  className={`absolute rounded-full border px-1.5 text-[10px] font-semibold leading-4 tabular-nums hover:brightness-125 focus-visible:outline-2 focus-visible:outline-sky-400 ${n ? "border-sky-500/60 bg-slate-950 text-sky-200" : "border-amber-400/70 bg-amber-950 text-amber-200"}`}
                  style={{ left: x + PILL_W - 22, top: y + PILL_H - 9 }}
                >
                  {n || "!"}
                </a>
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
        {reach && <span><span className="text-sky-300">dashed blue, &quot;next&quot;: within reach</span> · &quot;start&quot;: where the questionnaire puts them · &quot;known&quot;: placed below their start, or needed by a solid step · faded: ahead</span>}
        {Object.keys(genres).length > 0 && (
          <span>
            coloured block in a genre&apos;s row: a block of that genre, a dead end that comes out of a step and that no step waits for ({GENRES.map((g, i) => <span key={g}>{i > 0 && " · "}<span style={{ color: GENRE_HUE[g] }}>{g}</span></span>)}); dashed: switched off
          </span>
        )}
        <span>Hover or pick a step: blue ring learn first, violet ring comes after</span>
        <span><span className="text-sky-300">badge: its blocks, opened in a new tab</span> · <span className="text-amber-300">! no block yet</span> ({own.filter(({ step }) => !blocks[step.ref]).length} in {areaLabel})</span>
      </p>

      {focused ? (
        <div className="rounded-2xl border border-slate-800 p-4 text-sm">
          <p className="font-semibold text-slate-100">
            {focused.track.label}, step {focused.index + 1}: {focused.step.name}
            <a href={blockHref({ step: focus! })} target="_blank" rel="noreferrer" className={`ml-3 text-sm font-normal hover:underline ${blocks[focus!] ? "text-sky-300" : "text-amber-300"}`}>
              {blocks[focus!] ? `Open its ${blocks[focus!] === 1 ? "block" : `${blocks[focus!]} blocks`} ↗` : "No block yet: a gap to seed ↗"}
            </a>
          </p>
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
                    {version === "proposed" && isAdded(focus!, p) && <span className="text-orange-300"> new{whyOf(focus!, p) ? `: ${whyOf(focus!, p)}` : ""}</span>}
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
