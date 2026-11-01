"use client";

import { useCallback, useMemo, useState } from "react";
import { noteState, type Others, type Visibility } from "../../cues/visibility";
import { pickBox, type Placement } from "../../cues/placement";
import { FretboardBase, STRING_NAMES, fretGeometry, type FretGeometry } from "@/components/chordKit/Fretboard";
import { NoteDot } from "@/components/chordKit/NoteDot";
import { cellKey } from "@/components/chordKit/ScaleNeck";
import { useNotePlayer } from "@/components/chordKit/useNotePlayer";
import usePhone from "@/components/usePhone";
import { hoverLabel, noteLabel } from "@/features/theory/labels";
import { degreeColour } from "@/features/theory/scales";
import { useLabelSystem } from "@/features/theory/useLabelSystem";
import { SCALE_NECK_FRETS, type ScaleCell, type ScalePosition } from "@/lib/chordKit/scalePositions";
import { scaleBoxes, shiftPosition } from "../scale-neck/boxes";
import { CROSS_STRING, crossingPath, upAndDown, type Crossing } from "./crossing";

const FRAME = "rgb(56 189 248 / 0.75)";
const CROSS = "var(--color-amber-300)";

export interface PositionNeckViewProps {
  slug: string;
  pc: number;
  /** framed positions, 1-based; absent: position 1 (or the crossing's two, or the placement's) */
  positions?: number[];
  placement?: Placement;
  /** `string`: guitar numbering, 6 is the low E; absent: the G string */
  cross?: { from: number; to: number; string?: number };
  add?: number[];
  enable?: number[];
  highlight?: number[];
  mute?: number[];
  hide?: number[];
  others?: Others;
  /** the notes outside the framed positions (or the crossing): "muted" (default) or "hidden" */
  outside?: "muted" | "hidden";
  /** the row of position thumbnails and crossing buttons under the neck; default on */
  picker?: boolean;
}

/**
 * The whole neck, horizontal, with only some of the scale's positions framed and playable: the rest of the notes are drawn
 * faint (or not at all). A row of thumbnails underneath picks the positions; the buttons between two neighbours show just
 * the way across from one to the other. Tap a note to hear it, ▶ to play what is framed.
 */
export function View(props: PositionNeckViewProps) {
  // the picker's choices start again whenever the exercise's own settings change
  return <Neck key={JSON.stringify(props)} {...props} />;
}

function Neck({ slug, pc, positions: wanted, placement, cross: crossProp, add, enable, highlight, mute, hide, others, outside = "muted", picker = true }: PositionNeckViewProps) {
  const vis = useMemo((): Visibility => {
    const pcs = (semis?: number[]) => semis?.map((semi) => (pc + semi) % 12);
    return { enable: pcs(enable), highlight: pcs(highlight), mute: pcs(mute), hide: pcs(hide), add, others };
  }, [pc, enable, highlight, mute, hide, add, others]);
  const { title, cells, positions } = useMemo(() => scaleBoxes(slug, pc, add), [slug, pc, add]);
  // a placement picks one position, maybe an octave down
  const placed = useMemo(() => {
    if (wanted?.length || crossProp || !placement || placement.by === "chords") return null;
    const picked = pickBox(positions.map((p) => ({ number: p.number, from: p.from, to: p.to, roots: p.notes.filter((c) => c.semi === 0).map((c) => ({ string: c.string, fret: c.fret })) })), placement);
    return picked && { number: picked.number, shift: picked.shift };
  }, [wanted, crossProp, placement, positions]);
  const numbers = positions.map((p) => p.number);
  const [selected, setSelected] = useState<number[]>(() => {
    const first = wanted?.length ? wanted : crossProp ? [crossProp.from, crossProp.to] : placed ? [placed.number] : [1];
    return first.filter((n) => numbers.includes(n));
  });
  const [cross, setCross] = useState<Crossing | null>(() => (crossProp ? { from: crossProp.from, to: crossProp.to, string: crossProp.string ? 6 - crossProp.string : CROSS_STRING } : null));
  const path = useMemo(() => {
    const a = cross && positions.find((p) => p.number === cross.from), b = cross && positions.find((p) => p.number === cross.to);
    return cross && a && b ? crossingPath(a, b, cross.string) : null;
  }, [cross, positions]);
  const framed = useMemo((): ScalePosition[] => path
    ? [path.lower, path.upper]
    : positions.filter((p) => selected.includes(p.number)).map((p) => (placed && p.number === placed.number ? shiftPosition(p, placed.shift) : p)), [path, positions, selected, placed]);
  const playable = useMemo(() => new Set((path ? path.notes : framed.flatMap((p) => p.notes)).map(cellKey)), [path, framed]);

  const state = useCallback((c: ScaleCell) => (playable.has(cellKey(c)) ? noteState(vis, c.pc) : outside), [playable, vis, outside]);
  const [system] = useLabelSystem();
  const { active, running, play, tap, stop } = useNotePlayer();
  const phone = usePhone();
  const g = phone ? fretGeometry(0, SCALE_NECK_FRETS, 28, 26, 44) : fretGeometry(0, SCALE_NECK_FRETS, 54, 36, 44);
  const r = phone ? 11 : 14;

  const shown = cells.filter((c) => state(c) !== "hidden");
  // faint notes under the playable ones, the playing note last
  shown.sort((a, b) => Number(playable.has(cellKey(a))) - Number(playable.has(cellKey(b))) || Number(active === cellKey(a)) - Number(active === cellKey(b)));
  const toggle = (n: number) => {
    setCross(null);
    setSelected((s) => (s.includes(n) ? s.filter((x) => x !== n) : [...s, n].sort((a, b) => a - b)));
  };
  const crossBetween = (from: number, to: number) => {
    if (cross && cross.from === from && cross.to === to) return setCross(null);
    setCross({ from, to, string: cross?.string ?? CROSS_STRING });
    setSelected([from, to]);
  };
  const run = () => {
    const lines = path ? [path.notes] : [...framed].sort((a, b) => a.from - b.from).map((p) => p.notes);
    play(lines.flatMap((l) => upAndDown(l)).map((n) => ({ key: cellKey(n), midi: n.midi })));
  };
  const caption = path
    ? `crossing from position ${cross!.from} to ${cross!.to} on the ${STRING_NAMES[cross!.string]} string`
    : framed.length ? `position${framed.length > 1 ? "s" : ""} ${framed.map((p) => p.number).join(" & ")}` : "no position picked";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <span>{title} · {caption}</span>
        <button type="button" onClick={running ? stop : run} disabled={!playable.size} className="rounded border border-slate-700 px-2 py-0.5 text-[11px] text-slate-300 hover:border-slate-500 disabled:opacity-40">{running ? "■ Stop" : "▶ Play"}</button>
      </div>
      <div className="min-w-0 overflow-x-auto">
        <svg viewBox={`0 0 ${g.W} ${g.H}`} width="100%" style={{ minWidth: phone ? 480 : undefined }} role="img" aria-label={`${title}, ${caption}`}>
          <FretboardBase g={g} markerSize={phone ? 4 : 6} />
          {merged(framed).map((group) => (
            <Frame key={`f${group.map((p) => p.number).join("-")}`} g={g} notes={group.flatMap((p) => p.notes)} r={r} stroke={FRAME} fill="rgb(56 189 248 / 0.06)" dashed={!!path} />
          ))}
          {framed.map((p) => <PositionLabel key={`l${p.number}`} g={g} p={p} r={r} />)}
          {path && <Frame g={g} notes={path.notes} r={r - 2} stroke={CROSS} fill="rgb(252 211 77 / 0.08)" />}
          {shown.map((c) => {
            const s = state(c);
            const on = playable.has(cellKey(c));
            return (
              <NoteDot
                key={cellKey(c)} c={c} x={g.fx(c.fret)} y={g.sy(c.string)} r={r} ring={!on}
                label={noteLabel(system, { name: c.name, semi: c.semi, degreeText: c.degreeText })}
                hover={hoverLabel(system, { name: c.name, semi: c.semi, degreeText: c.degreeText })}
                active={active === cellKey(c)} dim={s === "muted"} accent={s === "highlighted"}
                onNote={on ? (n) => tap(cellKey(n), n.midi) : () => {}}
              />
            );
          })}
        </svg>
      </div>
      {picker && (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Positions">
            {positions.map((p, i) => {
              const next = positions[i + 1];
              const crossing = !!cross && !!next && cross.from === p.number && cross.to === next.number;
              return (
                <div key={p.number} className="flex items-center gap-1">
                  <button
                    type="button" onClick={() => toggle(p.number)} aria-pressed={selected.includes(p.number)}
                    className={`flex flex-col items-center rounded-lg border px-1.5 pb-1 pt-1.5 text-[11px] transition ${selected.includes(p.number) ? "border-sky-400/80 bg-sky-500/10 text-sky-100" : "border-slate-700 text-slate-400 hover:border-slate-500"}`}
                  >
                    <Thumb p={p} />
                    <span>Position {p.number}</span>
                    <span className="text-[10px] text-slate-500">frets {p.from}–{p.to}</span>
                  </button>
                  {next && (
                    <button
                      type="button" onClick={() => crossBetween(p.number, next.number)} aria-pressed={crossing}
                      title={`The way across from position ${p.number} to ${next.number}`}
                      className={`rounded-full border px-1.5 py-0.5 text-[11px] transition ${crossing ? "border-amber-300 bg-amber-300/15 text-amber-200" : "border-slate-700 text-slate-500 hover:border-slate-500 hover:text-slate-300"}`}
                    >
                      ⇄
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          {cross && (
            <div className="flex items-center gap-1 text-[11px] text-slate-400" role="group" aria-label="Cross on string">
              <span className="mr-1">Cross on</span>
              {[5, 4, 3, 2, 1, 0].map((s) => (
                <button
                  key={s} type="button" onClick={() => setCross({ ...cross, string: s })} aria-pressed={cross.string === s}
                  className={`w-7 rounded border py-0.5 ${cross.string === s ? "border-amber-300 bg-amber-300/15 text-amber-200" : "border-slate-700 hover:border-slate-500"}`}
                >
                  {STRING_NAMES[s]}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Corners of a polygon rounded off by up to `radius`, as an SVG path. */
function rounded(points: [number, number][], radius: number): string {
  const n = points.length;
  const at = (i: number) => points[(i + n) % n];
  let d = "";
  for (let i = 0; i < n; i++) {
    const [px, py] = at(i - 1), [x, y] = at(i), [nx, ny] = at(i + 1);
    const inLen = Math.hypot(x - px, y - py), outLen = Math.hypot(nx - x, ny - y);
    const k = Math.min(radius, inLen / 2, outLen / 2);
    const a: [number, number] = [x + ((px - x) / inLen) * k, y + ((py - y) / inLen) * k];
    const b: [number, number] = [x + ((nx - x) / outLen) * k, y + ((ny - y) / outLen) * k];
    d += `${i ? "L" : "M"}${a[0]},${a[1]} Q${x},${y} ${b[0]},${b[1]} `;
  }
  return d + "Z";
}

/** Positions that share frets, in groups along the neck: each group is framed as one shape. */
function merged(positions: ScalePosition[]): ScalePosition[][] {
  const groups: ScalePosition[][] = [];
  for (const p of [...positions].sort((a, b) => a.from - b.from)) {
    const last = groups[groups.length - 1];
    if (last && p.from <= Math.max(...last.map((q) => q.to))) last.push(p);
    else groups.push([p]);
  }
  return groups;
}

/** "Position N" above the position's notes on the top string. */
function PositionLabel({ g, p, r }: { g: FretGeometry; p: ScalePosition; r: number }) {
  const top = Math.max(...p.notes.map((c) => c.string));
  const frets = p.notes.filter((c) => c.string === top).map((c) => c.fret);
  const x = (g.fx(Math.min(...frets)) + g.fx(Math.max(...frets))) / 2;
  return <text x={x} y={g.sy(top) - r - 12} textAnchor="middle" fontSize={11} fontWeight={600} fill={FRAME} pointerEvents="none">Position {p.number}</text>;
}

/** An outline hugging the notes string by string: the shape of a position (or a crossing) on the neck, stepped where its strings shift. */
function Frame({ g, notes, r, stroke, fill, dashed = false }: { g: FretGeometry; notes: ScaleCell[]; r: number; stroke: string; fill: string; dashed?: boolean }) {
  const pad = r + 5;
  const rows = [5, 4, 3, 2, 1, 0].map((s) => {
    const frets = notes.filter((c) => c.string === s).map((c) => c.fret);
    return frets.length ? { s, lo: g.fx(Math.min(...frets)) - pad, hi: g.fx(Math.max(...frets)) + pad } : null;
  }).filter((x): x is { s: number; lo: number; hi: number } => x !== null);
  if (!rows.length) return null;
  const top = g.sy(rows[0].s) - pad, bottom = g.sy(rows[rows.length - 1].s) + pad;
  // between two strings the edge steps at half way
  const mid = (i: number) => (g.sy(rows[i].s) + g.sy(rows[i + 1].s)) / 2;
  const right: [number, number][] = [[rows[0].hi, top]];
  const left: [number, number][] = [[rows[0].lo, top]];
  rows.forEach((row, i) => {
    if (i === rows.length - 1) return;
    const y = mid(i), nextRow = rows[i + 1];
    if (nextRow.hi !== row.hi) right.push([row.hi, y], [nextRow.hi, y]);
    if (nextRow.lo !== row.lo) left.push([row.lo, y], [nextRow.lo, y]);
  });
  const last = rows[rows.length - 1];
  right.push([last.hi, bottom]);
  left.push([last.lo, bottom]);
  const points = [...right, ...left.reverse()];
  return (
    <g pointerEvents="none">
      <path d={rounded(points, r * 0.7)} fill={fill} stroke={stroke} strokeWidth={2} strokeDasharray={dashed ? "6 4" : undefined} strokeLinejoin="round" />
    </g>
  );
}

/** A position in miniature: its frets, strings and notes, the roots ringed. */
function Thumb({ p }: { p: ScalePosition }) {
  const from = p.from <= 1 ? 0 : p.from;
  const cols = p.to - from + 1, w = 12, h = 7, left = 4, top = 4;
  const W = left * 2 + cols * w, H = top * 2 + 5 * h;
  const x = (f: number) => left + (f - from + 0.5) * w, y = (s: number) => top + (5 - s) * h;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W * 1.4} height={H * 1.4} aria-hidden>
      {Array.from({ length: cols + 1 }, (_, i) => <line key={`f${i}`} x1={left + i * w} x2={left + i * w} y1={top} y2={top + 5 * h} stroke="#3a4a66" strokeWidth={from === 0 && i === 1 ? 2 : 0.8} />)}
      {Array.from({ length: 6 }, (_, s) => <line key={`s${s}`} x1={left} x2={W - left} y1={y(s)} y2={y(s)} stroke="#7a869b" strokeWidth={0.6} />)}
      {p.notes.map((c) => <circle key={cellKey(c)} cx={x(c.fret)} cy={y(c.string)} r={2.6} fill={degreeColour(c.degree)} stroke={c.degree === 0 ? "var(--color-slate-50)" : "none"} strokeWidth={1} />)}
    </svg>
  );
}
