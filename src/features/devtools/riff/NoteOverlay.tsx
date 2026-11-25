"use client";

import { useId } from "react";
import { hzToNote } from "@/features/tuner/pitch";
import { placeNear, STRING_NAMES, type Timed } from "./riff";

/** "A3 · A string, fret 12": the note and where it sits nearest the hand position at fret `pos`. */
export function describe(midi: number, pos: number): string {
  const at = placeNear(midi, pos);
  return at ? `${noteName(midi)} · ${STRING_NAMES[at.string]} string, fret ${at.fret}` : noteName(midi);
}

function noteName(midi: number): string {
  const n = hzToNote(440 * 2 ** ((midi - 69) / 12));
  return `${n.name.replace("#", "♯")}${n.octave}`;
}

/**
 * The riff's own views for the recorder's tool box, beside the tool itself: a tab sliding past a line, one bar at a time
 * with the line moving across it, or the notes sounding now as a chord box. Each fills the box it is drawn in.
 */
export type RiffViewMode = "tab" | "bar" | "box";
export const RIFF_VIEWS: { id: RiffViewMode; label: string }[] = [{ id: "tab", label: "Sliding tab" }, { id: "bar", label: "Bar by bar" }, { id: "box", label: "Chord box" }];

/** How many bars Bar by bar shows at once; the view steps on by that much. */
export const WINDOW_BARS = [1, 1.5, 2] as const;
export type WindowBars = (typeof WINDOW_BARS)[number];

/** The bar grid the riff is timed on: when beat 1 of bar 1 falls (seconds), and how long one window of `bars` 4/4 bars is. */
export interface BarGrid { start: number; len: number; /** one beat, seconds */ beat: number }
export const barGrid = (bpm: number, downbeat = 0, bars: number = 1): BarGrid => ({ start: downbeat, len: (bars * 4 * 60) / bpm, beat: 60 / bpm });

/** seconds of tab shown before and after the line */
const AHEAD = 3, BEHIND = 1;

/**
 * Tab of the notes between `from` and `to` seconds, with the line at `t`. High e on top, as tab is read. Fret numbers sit on
 * the strings like printed tab: played ones fade, the sounding one is lit, the coming ones are white. Faint lines mark the
 * beats, brighter ones the bars; the edges fade so notes slide in and out instead of being cut.
 */
function TabWindow({ notes, t, from, to, grid }: { notes: Timed[]; t: number; from: number; to: number; grid: BarGrid }) {
  // the camera and the take each draw one: ids of their own, so a hidden one never blanks the other's mask
  const id = `tab${useId().replace(/[^\w-]/g, "")}`;
  const W = 320, H = 92, top = 14, gap = 13, left = 22, right = W - 6;
  const x = (s: number) => left + ((s - from) / (to - from)) * (right - left);
  const y = (string: number) => top + (5 - string) * gap;
  const shown = notes.filter((n) => n.end > from - 0.2 && n.start < to + 0.2);
  const beat = grid.beat;
  const beats: { at: number; bar: boolean }[] = [];
  for (let k = Math.ceil((from - grid.start) / beat); grid.start + k * beat <= to; k++) beats.push({ at: grid.start + k * beat, bar: k % 4 === 0 });
  return (
    <div className="pointer-events-none w-full overflow-hidden rounded-lg border border-white/10 bg-slate-950/60 shadow-lg backdrop-blur-sm" aria-hidden>
      <svg viewBox={`0 0 ${W} ${H}`} className="block w-full">
        <defs>
          <linearGradient id={`${id}fade`} x1="0" x2="1">
            <stop offset="0" stopColor="white" stopOpacity="0" /><stop offset="0.08" stopColor="white" /><stop offset="0.9" stopColor="white" /><stop offset="1" stopColor="white" stopOpacity="0" />
          </linearGradient>
          <mask id={`${id}mask`}><rect x={left} y={0} width={right - left} height={H} fill={`url(#${id}fade)`} /></mask>
        </defs>
        {STRING_NAMES.map((name, s) => (
          <text key={s} x={left - 9} y={y(s)} textAnchor="middle" dominantBaseline="central" fontSize={8} fontWeight={600} fill="#64748b">{s === 5 ? "e" : name}</text>
        ))}
        <g mask={`url(#${id}mask)`}>
          {beats.map((b) => <line key={b.at} x1={x(b.at)} x2={x(b.at)} y1={y(5) - 6} y2={y(0) + 6} stroke="white" strokeOpacity={b.bar ? 0.28 : 0.08} strokeWidth={b.bar ? 1.25 : 1} />)}
          {STRING_NAMES.map((_, s) => <line key={s} x1={left} x2={right} y1={y(s)} y2={y(s)} stroke="white" strokeOpacity={0.22} strokeWidth={0.75} />)}
          {shown.map((n, i) => {
            const on = n.start <= t && t < n.end, past = n.end <= t;
            const wide = String(n.fret).length > 1 ? 15 : 11;
            return (
              <g key={i} opacity={past ? 0.3 : 1}>
                {on && <rect x={x(n.start)} y={y(n.string) - 1} width={Math.max(0, x(n.end) - x(n.start) - 3)} height={2} rx={1} fill="#38bdf8" fillOpacity={0.6} />}
                <rect x={x(n.start) - wide / 2} y={y(n.string) - 6} width={wide} height={12} rx={3} fill={on ? "#38bdf8" : "#0b1220"} />
                <text x={x(n.start)} y={y(n.string) + 0.5} textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight={700}
                  fill={on ? "#0b1220" : "#f1f5f9"} style={{ fontVariantNumeric: "tabular-nums" }}>{n.fret}</text>
              </g>
            );
          })}
        </g>
        {t >= from && t <= to && <line x1={x(t)} x2={x(t)} y1={y(5) - 9} y2={y(0) + 9} stroke="#38bdf8" strokeWidth={1.5} strokeLinecap="round" style={{ filter: "drop-shadow(0 0 3px #38bdf8)" }} />}
      </svg>
    </div>
  );
}

/** The riff as tab moving right to left past a fixed line; a note is under the line while it sounds. */
const SlidingTab = ({ notes, t, grid }: { notes: Timed[]; t: number; grid: BarGrid }) => <TabWindow notes={notes} t={t} from={t - BEHIND} to={t + AHEAD} grid={grid} />;

/** One window (1, 1½ or 2 bars) at a time, standing still, with the line moving across it; the next replaces it when the line reaches its end. The count-in shows the first. */
function BarByBar({ notes, t, grid }: { notes: Timed[]; t: number; grid: BarGrid }) {
  const bar = Math.max(0, Math.floor((t - grid.start) / grid.len));
  const from = grid.start + bar * grid.len;
  return <TabWindow notes={notes} t={t} from={from} to={from + grid.len} grid={grid} />;
}

/** The notes sounding now as a small chord box, or the next ones, dimmed, while nothing sounds. */
function CornerBox({ notes, t }: { notes: Timed[]; t: number }) {
  let now = notes.filter((n) => n.start <= t && t < n.end);
  const soon = !now.length;
  if (soon) { const next = notes.find((n) => n.start > t); now = next ? notes.filter((n) => n.start === next.start) : []; }
  if (!now.length) return null;
  const fretted = now.map((n) => n.fret).filter((f) => f > 0);
  const lo = fretted.length && Math.max(...fretted) > 4 ? Math.min(...fretted) : 1;
  const ss = 16, fs = 20, left = 26, top = 34, rows = Math.max(4, ...fretted.map((f) => f - lo + 1));
  const w = left + 5 * ss + 18, h = top + rows * fs + 20;
  const sx = (s: number) => left + s * ss;
  const played = new Set(now.map((n) => n.string));
  const label = now.map((n) => noteName(n.midi)).join(" ");
  const accent = soon ? "#94a3b8" : "#38bdf8";
  return (
    <div className="pointer-events-none mx-auto w-full max-w-[60%] overflow-hidden rounded-lg border border-white/10 bg-slate-950/60 shadow-lg backdrop-blur-sm" aria-hidden>
      <svg viewBox={`0 0 ${w} ${h}`} className="block w-full">
        <text x={w / 2} y={12} textAnchor="middle" fontSize={11} fontWeight={700} fill={soon ? "#94a3b8" : "#f1f5f9"}>{label}</text>
        {soon && <text x={w / 2} y={23} textAnchor="middle" fontSize={7} fontWeight={600} letterSpacing={1} fill="#64748b">NEXT</text>}
        {Array.from({ length: rows + 1 }, (_, i) => <line key={i} x1={left} x2={sx(5)} y1={top + i * fs} y2={top + i * fs} stroke="white" strokeOpacity={i === 0 && lo === 1 ? 0.9 : 0.25} strokeWidth={i === 0 && lo === 1 ? 3 : 1} />)}
        {STRING_NAMES.map((_, s) => <line key={s} x1={sx(s)} x2={sx(s)} y1={top} y2={top + rows * fs} stroke="white" strokeOpacity={played.has(s) ? 0.6 : 0.3} strokeWidth={0.75 + (5 - s) * 0.15} />)}
        {lo > 1 && <text x={left - 6} y={top + fs / 2} textAnchor="end" dominantBaseline="central" fontSize={9} fontWeight={600} fill="#cbd5e1">{lo}fr</text>}
        {now.length > 1 && STRING_NAMES.map((_, s) => !played.has(s) && (
          <text key={s} x={sx(s)} y={top - 7} textAnchor="middle" dominantBaseline="central" fontSize={8} fill="#64748b">×</text>
        ))}
        {now.map((n, i) => n.fret === 0
          ? <circle key={i} cx={sx(n.string)} cy={top - 7} r={4} fill="none" stroke={accent} strokeWidth={1.5} />
          : (
            <g key={i}>
              <circle cx={sx(n.string)} cy={top + (n.fret - lo + 0.5) * fs} r={7} fill={soon ? "#0b1220" : accent} stroke={accent} strokeWidth={1.5} />
              <text x={sx(n.string)} y={top + (n.fret - lo + 0.5) * fs + 0.5} textAnchor="middle" dominantBaseline="central" fontSize={9} fontWeight={700}
                fill={soon ? "#cbd5e1" : "#0b1220"} style={{ fontVariantNumeric: "tabular-nums" }}>{n.fret}</text>
            </g>
          ))}
        {STRING_NAMES.map((name, s) => (
          <text key={s} x={sx(s)} y={h - 8} textAnchor="middle" dominantBaseline="central" fontSize={8} fontWeight={600} fill={played.has(s) ? "#cbd5e1" : "#64748b"}>{s === 5 ? "e" : name}</text>
        ))}
      </svg>
    </div>
  );
}

/** The riff at `t` seconds from beat 1 (negative in the count-in), drawn as `mode` on the bar grid `grid`. */
export function RiffView({ notes, t, mode, grid }: { notes: Timed[]; t: number; mode: RiffViewMode; grid: BarGrid }) {
  if (mode === "tab") return <SlidingTab notes={notes} t={t} grid={grid} />;
  if (mode === "bar") return <BarByBar notes={notes} t={t} grid={grid} />;
  return <CornerBox notes={notes} t={t} />;
}
