"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { onANote } from "./asks";

/** the width drawn before the box is measured; after, the roll is drawn at its own width in CSS pixels, so its text keeps its size on a phone */
const START_W = 600;
/** narrower than this the rows grow taller, so a phone gets a roll it can read and tap */
const NARROW = 520;
const GUTTER = 44;
/** semitones of room above and below the two notes */
const ROOM = 2;
/** how much of the voice's past the trail keeps, in ms */
const TRAIL_MS = 4000;
const BLACK = new Set([1, 3, 6, 8, 10]);

/**
 * Do and the note to sing as a piano roll: a row a semitone (black keys darker), Do's bar on the left, the target's on
 * the right, shown as an empty "?" box with the interval and its solfège until it is found; tap either to hear it. With `dot` the
 * voice is a dot at the right edge with a line of the last few seconds behind it, green on Do and on the target; without it nothing of the voice shows (the harder way).
 */
export default function IntervalRoll({ doMidi, low, high, target, found, doLabel, targetLabel, targetHint, doName, targetName, pitch, cents, dot, live, onNote }: {
  doMidi: number;
  /** the lowest and highest note any interval of the set reaches, so the roll keeps its size whichever is asked (its height gives nothing away) */
  low: number;
  high: number;
  /** the note to sing; null before the first question */
  target: number | null;
  found: boolean;
  doLabel: string;
  targetLabel: string;
  /** beside the "?" until the note is found: the interval and its solfège ("P5 · Sol") */
  targetHint: string;
  /** Do's and the target's names with their octave as spelled in the key ("B♭3", not "A#3"), for the gutter */
  doName: string;
  targetName: string;
  pitch: RefObject<number | null>;
  cents: number;
  dot: boolean;
  /** the mic is on: the trail runs */
  live: boolean;
  /** tapped: "do" or "target" */
  onNote: (which: "do" | "target") => void;
}) {
  // the box's width, kept up to date: one unit of the drawing is one CSS pixel
  const box = useRef<HTMLDivElement | null>(null);
  const [W, setW] = useState(START_W);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(260, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const ROW_H = W < NARROW ? 20 : 18;
  const mid = GUTTER + (W - GUTTER) / 2;
  const DO_X = [GUTTER + 12, mid - 10];
  const TARGET_X = [mid + 10, W - 40];
  /** the voice is drawn here, the trail running left of it */
  const NOW_X = W - 20;
  const lo = Math.min(doMidi, low) - ROOM;
  const hi = Math.max(doMidi, high) + ROOM;
  const H = (hi - lo + 1) * ROW_H + 1;
  const yOf = (m: number) => (hi - Math.max(lo - 0.5, Math.min(hi + 0.5, m))) * ROW_H + ROW_H / 2;
  const rows = Array.from({ length: hi - lo + 1 }, (_, k) => hi - k);

  // the voice: the readings of the last few seconds, redrawn every frame while the mic is on
  const [frame, setFrame] = useState<{ now: number; trail: { t: number; midi: number | null }[] }>({ now: 0, trail: [] });
  useEffect(() => {
    if (!live || !dot) return;
    let id = 0;
    const step = () => {
      const t = performance.now();
      setFrame((f) => ({ now: t, trail: [...f.trail.filter((p) => t - p.t <= TRAIL_MS), { t, midi: pitch.current }] }));
      id = requestAnimationFrame(step);
    };
    id = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(id);
      setFrame({ now: 0, trail: [] });
    };
  }, [live, dot, pitch]);

  let d = "";
  let pen = false;
  for (const p of frame.trail) {
    if (p.midi === null) {
      pen = false;
      continue;
    }
    const x = NOW_X - ((frame.now - p.t) / TRAIL_MS) * (NOW_X - GUTTER);
    d += `${pen ? "L" : "M"}${x.toFixed(1)},${yOf(p.midi).toFixed(1)}`;
    pen = true;
  }
  const m = frame.trail.at(-1)?.midi ?? null;
  const on = m !== null && onANote(m, target === null ? [doMidi] : [doMidi, target], cents);

  const onDo = m !== null && onANote(m, [doMidi], cents);

  const bar = (midi: number, [x0, x1]: number[], label: string, which: "do" | "target", shown: boolean) => (
    <g role="button" tabIndex={0} aria-label={shown ? `${label}, play it` : `${targetHint}, the note to sing, play it`} className="cursor-pointer" onClick={() => onNote(which)}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onNote(which)}>
      <rect x={x0} y={yOf(midi) - ROW_H / 2 + 1} width={x1 - x0} height={ROW_H - 2} rx={3}
        // Do turns green at once while the voice is on it, and fades back when it leaves
        style={{
          fill: shown ? (which === "do" && !onDo ? "var(--color-sky-500)" : "var(--color-emerald-500)") : "transparent",
          stroke: shown ? (which === "do" && !onDo ? "var(--color-sky-300)" : "var(--color-emerald-300)") : "var(--color-slate-500)",
          transition: onDo ? "fill 100ms, stroke 100ms" : "fill 900ms ease-out, stroke 900ms ease-out",
        }}
        fillOpacity={shown ? 0.55 : 0} strokeDasharray={shown ? undefined : "4 3"} />
      <text x={x0 + 8} y={yOf(midi) + 4} fontSize={11} fontWeight={600} fill={shown ? "var(--color-slate-50)" : "var(--color-slate-400)"}>{shown ? label : `? ${targetHint}`}</text>
    </g>
  );

  return (
    <div ref={box} className="w-full">
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="block w-full h-auto select-none rounded-lg border border-slate-800 bg-slate-950/60" role="img" aria-label={`Piano roll: ${doLabel} and the note to sing`}>
      {rows.map((r) => {
        const y = (hi - r) * ROW_H;
        const black = BLACK.has(((r % 12) + 12) % 12);
        const name = r === doMidi ? doName : found && r === target ? targetName : null;
        return (
          <g key={r}>
            <rect x={GUTTER} y={y} width={W - GUTTER} height={ROW_H} fill={black ? "var(--color-slate-900)" : "var(--color-slate-800)"} fillOpacity={black ? 0.9 : 0.35} />
            <rect x={0} y={y} width={GUTTER - 4} height={ROW_H} fill={black ? "var(--color-slate-700)" : "var(--color-slate-300)"} fillOpacity={black ? 1 : 0.85} />
            {name && <text x={GUTTER - 8} y={y + ROW_H / 2 + 3.5} fontSize={10} textAnchor="end" fill="var(--color-slate-900)" fontWeight={600}>{name}</text>}
            <line x1={GUTTER} x2={W} y1={y + ROW_H} y2={y + ROW_H} stroke="var(--color-slate-700)" strokeOpacity={0.4} />
          </g>
        );
      })}
      {bar(doMidi, DO_X, doLabel, "do", true)}
      {target !== null && bar(target, TARGET_X, targetLabel, "target", found)}
      {d && <path d={d} fill="none" stroke="var(--color-sky-300)" strokeOpacity={0.8} strokeWidth={2} strokeLinejoin="round" />}
      {m !== null && <circle cx={NOW_X} cy={yOf(m)} r={6} fill={on ? "var(--color-emerald-400)" : "var(--color-sky-400)"} stroke="var(--color-slate-950)" strokeWidth={1.5} />}
    </svg>
    </div>
  );
}
