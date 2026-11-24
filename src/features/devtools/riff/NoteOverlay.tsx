"use client";

import { useEffect, useState } from "react";
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

/** "A3 · A string, fret 12" for a riff note, on the string and fret the riff gives it. */
export const placed = (n: Timed) => `${noteName(n.midi)} · ${STRING_NAMES[n.string]} string, fret ${n.fret}`;

/**
 * How the riff is drawn over the video, in the top right corner: a tab sliding past a line, one bar at a time with
 * the line moving across it, the notes sounding now as a chord box (top right), or nothing.
 */
export type OverlayMode = "tab" | "bar" | "box" | "off";
export const OVERLAY_MODES: { id: OverlayMode; label: string }[] = [{ id: "tab", label: "Sliding tab" }, { id: "bar", label: "Bar by bar" }, { id: "box", label: "Chord box" }, { id: "off", label: "Off" }];

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
  const W = 320, H = 92, top = 14, gap = 13, left = 22, right = W - 6;
  const x = (s: number) => left + ((s - from) / (to - from)) * (right - left);
  const y = (string: number) => top + (5 - string) * gap;
  const shown = notes.filter((n) => n.end > from - 0.2 && n.start < to + 0.2);
  const beat = grid.beat;
  const beats: { at: number; bar: boolean }[] = [];
  for (let k = Math.ceil((from - grid.start) / beat); grid.start + k * beat <= to; k++) beats.push({ at: grid.start + k * beat, bar: k % 4 === 0 });
  return (
    <div className="pointer-events-none absolute right-2 top-2 w-[min(50%,20rem)] overflow-hidden rounded-lg border border-white/10 bg-slate-950/60 shadow-lg backdrop-blur-sm" aria-hidden>
      <svg viewBox={`0 0 ${W} ${H}`} className="block w-full">
        <defs>
          <linearGradient id="tab-fade" x1="0" x2="1">
            <stop offset="0" stopColor="white" stopOpacity="0" /><stop offset="0.08" stopColor="white" /><stop offset="0.9" stopColor="white" /><stop offset="1" stopColor="white" stopOpacity="0" />
          </linearGradient>
          <mask id="tab-mask"><rect x={left} y={0} width={right - left} height={H} fill="url(#tab-fade)" /></mask>
        </defs>
        {STRING_NAMES.map((name, s) => (
          <text key={s} x={left - 9} y={y(s)} textAnchor="middle" dominantBaseline="central" fontSize={8} fontWeight={600} fill="#64748b">{s === 5 ? "e" : name}</text>
        ))}
        <g mask="url(#tab-mask)">
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

/** The notes sounding now as a small chord box in the top right corner, or the next ones, dimmed, while nothing sounds. */
function CornerBox({ notes, t }: { notes: Timed[]; t: number }) {
  let now = notes.filter((n) => n.start <= t && t < n.end);
  const soon = !now.length;
  if (soon) { const next = notes.find((n) => n.start > t); now = next ? notes.filter((n) => n.start === next.start) : []; }
  if (!now.length) return null;
  const fretted = now.map((n) => n.fret).filter((f) => f > 0);
  const lo = fretted.length && Math.max(...fretted) > 4 ? Math.min(...fretted) : 1;
  const ss = 14, fs = 18, left = 22, top = 16, rows = Math.max(4, ...fretted.map((f) => f - lo + 1));
  const w = left + 5 * ss + 10, h = top + rows * fs + 22;
  const label = now.map((n) => noteName(n.midi)).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w * 1.4} className={`pointer-events-none absolute right-2 top-2 rounded bg-slate-950/80 ${soon ? "opacity-50" : ""}`} aria-hidden>
      {Array.from({ length: rows + 1 }, (_, i) => <line key={i} x1={left} x2={left + 5 * ss} y1={top + i * fs} y2={top + i * fs} stroke="#94a3b8" strokeWidth={i === 0 && lo === 1 ? 3 : 1} />)}
      {Array.from({ length: 6 }, (_, i) => <line key={i} x1={left + i * ss} x2={left + i * ss} y1={top} y2={top + rows * fs} stroke="#94a3b8" />)}
      {lo > 1 && <text x={left - 4} y={top + fs / 2} textAnchor="end" dominantBaseline="central" fontSize={9} fill="#cbd5e1">{lo}fr</text>}
      {now.map((n, i) => n.fret === 0
        ? <circle key={i} cx={left + n.string * ss} cy={top - 7} r={4} fill="none" stroke="#38bdf8" strokeWidth={1.5} />
        : (
          <g key={i}>
            <circle cx={left + n.string * ss} cy={top + (n.fret - lo + 0.5) * fs} r={6} fill="#38bdf8" />
            <text x={left + n.string * ss} y={top + (n.fret - lo + 0.5) * fs} textAnchor="middle" dominantBaseline="central" fontSize={8} fontWeight={700} fill="#0f172a">{n.fret}</text>
          </g>
        ))}
      <text x={w / 2} y={h - 7} textAnchor="middle" fontSize={10} fontWeight={600} fill="#e2e8f0">{soon ? `next: ${label}` : label}</text>
    </svg>
  );
}

function Overlay({ notes, t, mode, grid }: { notes: Timed[]; t: number; mode: OverlayMode; grid: BarGrid }) {
  if (mode === "tab") return <SlidingTab notes={notes} t={t} grid={grid} />;
  if (mode === "bar") return <BarByBar notes={notes} t={t} grid={grid} />;
  if (mode === "box") return <CornerBox notes={notes} t={t} />;
  return null;
}

/** Over a saved take: the riff at the video's current time, on the take's beat grid. */
export function TakeNotes({ video, notes, mode, grid }: { video: HTMLVideoElement | null; notes: Timed[]; mode: OverlayMode; grid: BarGrid }) {
  const [t, setT] = useState(0);
  useEffect(() => {
    if (!video || mode === "off") return;
    let id = 0;
    const frame = () => { id = requestAnimationFrame(frame); setT(video.currentTime); };
    id = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(id);
  }, [video, mode]);
  return <Overlay notes={notes} t={t} mode={mode} grid={grid} />;
}

/** Over the live camera while recording to the click: the riff at the beat being played (`t` seconds from beat 1, negative in the count-in). */
export function LiveNote({ notes, t, mode, grid }: { notes: Timed[]; t: number; mode: OverlayMode; grid: BarGrid }) {
  return <Overlay notes={notes} t={t} mode={mode} grid={grid} />;
}
