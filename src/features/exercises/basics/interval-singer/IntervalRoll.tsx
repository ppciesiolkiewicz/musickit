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
/** the tallest row full screen, so a short set of intervals doesn't turn into slabs */
const MAX_ROW_H = 44;
const BLACK = new Set([1, 3, 6, 8, 10]);

/**
 * Do and the note to sing as a piano roll: a row a semitone (black keys darker), Do's bar on the left, the target's on
 * the right, shown as an empty "?" box with the interval and its solfège until it is found; tap either to hear it. With `dot` the
 * voice is a dot at the right edge with a line of the last few seconds behind it, green on Do and on the target; without it nothing of the voice shows (the harder way).
 */
export default function IntervalRoll({ doMidi, low, high, target, found, doLabel, targetLabel, targetHint, doName, targetName, pitch, cents, dot, live, onNote, hold, fill = false }: {
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
  /** how long the voice has held the target, 0 to 1, read every frame: it fills the "?" box from the left (with `dot` only) */
  hold?: RefObject<number>;
  /** full screen: the rows grow to fill the box's height (the box needs one), the text with them */
  fill?: boolean;
}) {
  // the box's width, kept up to date: one unit of the drawing is one CSS pixel
  const box = useRef<HTMLDivElement | null>(null);
  const [W, setW] = useState(START_W);
  const [boxH, setBoxH] = useState(0);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      setW(Math.max(260, Math.round(e.contentRect.width)));
      setBoxH(Math.round(e.contentRect.height));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const lo = Math.min(doMidi, low) - ROOM;
  const hi = Math.max(doMidi, high) + ROOM;
  const base = W < NARROW ? 20 : 18;
  const ROW_H = fill && boxH > 0 ? Math.max(base, Math.min(MAX_ROW_H, Math.floor((boxH - 2) / (hi - lo + 1)))) : base;
  /** the text grows with the rows, a little slower */
  const k = 1 + (ROW_H / base - 1) * 0.6;
  const mid = GUTTER + (W - GUTTER) / 2;
  const DO_X = [GUTTER + 12, mid - 10];
  const TARGET_X = [mid + 10, W - 40];
  /** the voice is drawn here, the trail running left of it */
  const NOW_X = W - 20;
  const H = (hi - lo + 1) * ROW_H + 1;
  const yOf = (m: number) => (hi - Math.max(lo - 0.5, Math.min(hi + 0.5, m))) * ROW_H + ROW_H / 2;
  const rows = Array.from({ length: hi - lo + 1 }, (_, k) => hi - k);

  // the voice: the readings of the last few seconds, redrawn every frame while the mic is on
  const [frame, setFrame] = useState<{ now: number; held: number; trail: { t: number; midi: number | null }[] }>({ now: 0, held: 0, trail: [] });
  useEffect(() => {
    if (!live || !dot) return;
    let id = 0;
    const step = () => {
      const t = performance.now();
      setFrame((f) => ({ now: t, held: hold?.current ?? 0, trail: [...f.trail.filter((p) => t - p.t <= TRAIL_MS), { t, midi: pitch.current }] }));
      id = requestAnimationFrame(step);
    };
    id = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(id);
      setFrame({ now: 0, held: 0, trail: [] });
    };
  }, [live, dot, pitch, hold]);

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
      // a click plays the note but leaves focus where it was: a focused note would take Space, which is Restart's key
      onMouseDown={(e) => e.preventDefault()}
      onKeyDown={(e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        e.preventDefault(); // an svg button has no Space of its own: left alone, Space scrolls the page
        onNote(which);
      }}>
      <rect x={x0} y={yOf(midi) - ROW_H / 2 + 1} width={x1 - x0} height={ROW_H - 2} rx={3}
        // Do turns green at once while the voice is on it, and fades back when it leaves
        style={{
          fill: shown ? (which === "do" && !onDo ? "var(--color-sky-500)" : "var(--color-emerald-500)") : "transparent",
          stroke: shown ? (which === "do" && !onDo ? "var(--color-sky-300)" : "var(--color-emerald-300)") : "var(--color-slate-500)",
          transition: onDo ? "fill 100ms, stroke 100ms" : "fill 900ms ease-out, stroke 900ms ease-out",
        }}
        fillOpacity={shown ? 0.55 : 0} strokeDasharray={shown ? undefined : "4 3"} />
      {/* the hold so far, filling the "?" box from the left */}
      {!shown && frame.held > 0 && <rect x={x0} y={yOf(midi) - ROW_H / 2 + 1} width={(x1 - x0) * frame.held} height={ROW_H - 2} rx={3} fill="var(--color-emerald-500)" fillOpacity={0.45} pointerEvents="none" />}
      <text x={x0 + 8 * k} y={yOf(midi) + 4 * k} fontSize={11 * k} fontWeight={600} fill={shown ? "var(--color-slate-50)" : "var(--color-slate-400)"}>{shown ? label : `? ${targetHint}`}</text>
    </g>
  );

  return (
    <div ref={box} className={fill ? "flex h-full w-full items-center" : "w-full"}>
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="block w-full h-auto select-none rounded-lg border border-slate-800 bg-slate-950/60" role="img" aria-label={`Piano roll: ${doLabel} and the note to sing`}>
      {rows.map((r) => {
        const y = (hi - r) * ROW_H;
        const black = BLACK.has(((r % 12) + 12) % 12);
        const name = r === doMidi ? doName : found && r === target ? targetName : null;
        return (
          <g key={r}>
            <rect x={GUTTER} y={y} width={W - GUTTER} height={ROW_H} fill={black ? "var(--color-slate-900)" : "var(--color-slate-800)"} fillOpacity={black ? 0.9 : 0.35} />
            <rect x={0} y={y} width={GUTTER - 4} height={ROW_H} fill={black ? "var(--color-slate-700)" : "var(--color-slate-300)"} fillOpacity={black ? 1 : 0.85} />
            {name && <text x={GUTTER - 8} y={y + ROW_H / 2 + 3.5 * Math.min(k, 1.4)} fontSize={10 * Math.min(k, 1.4)} textAnchor="end" fill="var(--color-slate-900)" fontWeight={600}>{name}</text>}
            <line x1={GUTTER} x2={W} y1={y + ROW_H} y2={y + ROW_H} stroke="var(--color-slate-700)" strokeOpacity={0.4} />
          </g>
        );
      })}
      {bar(doMidi, DO_X, doLabel, "do", true)}
      {target !== null && bar(target, TARGET_X, targetLabel, "target", found)}
      {d && <path d={d} fill="none" stroke="var(--color-sky-300)" strokeOpacity={0.8} strokeWidth={2} strokeLinejoin="round" />}
      {m !== null && <circle cx={NOW_X} cy={yOf(m)} r={6 * k} fill={on ? "var(--color-emerald-400)" : "var(--color-sky-400)"} stroke="var(--color-slate-950)" strokeWidth={1.5} />}
    </svg>
    </div>
  );
}
