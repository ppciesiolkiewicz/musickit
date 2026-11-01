"use client";

import { useRef, useState, type PointerEvent } from "react";
import { BEATS_PER_BAR } from "@/features/theory/singingMelody";
import type { PlacedNote } from "@/features/theory/singingMelodies";
import { regionOf, snap, type Region } from "./passes";
import { PLAYED } from "./view";

/** the shortest loop, in beats */
const MIN_BEATS = 1;

/**
 * The whole tune in small, with the loop's two markers on it: drag either to set the loop (snapped to the beat). The
 * markers are just two ends: drag the back one past the front and it becomes the front, so the tune between them is
 * always what loops. A press elsewhere on the strip brings the nearer marker there. `at` marks the bar on the tune.
 */
export default function LoopStrip({ notes, total, region, loop, at, onRegion }: {
  notes: PlacedNote[];
  total: number;
  region: Region;
  loop: boolean;
  at: number | null;
  onRegion: (r: Region) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  // the two markers as dragged, in no order; the region is whichever comes first to whichever comes second
  const [ends, setEnds] = useState<[number, number]>([region.from, region.to]);
  const [held, setHeld] = useState<0 | 1 | null>(null);
  const shown = held === null ? [region.from, region.to] : ends;
  const lo = Math.min(...notes.map((n) => n.midi));
  const hi = Math.max(...notes.map((n) => n.midi));
  const grid = notes.some((n) => n.at % 1 !== 0) ? 0.5 : 1;

  const beatOf = (e: PointerEvent) => {
    const r = box.current!.getBoundingClientRect();
    return snap(((e.clientX - r.left) / r.width) * total, total, grid);
  };
  const move = (which: 0 | 1, beat: number, from: [number, number]) => {
    const next: [number, number] = which === 0 ? [beat, from[1]] : [from[0], beat];
    setEnds(next);
    const r = regionOf(next[0], next[1]);
    if (r && r.to - r.from >= MIN_BEATS) onRegion(r);
  };
  const down = (e: PointerEvent) => {
    if (!loop) return;
    const beat = beatOf(e);
    const from: [number, number] = [region.from, region.to];
    const which = Math.abs(beat - from[0]) <= Math.abs(beat - from[1]) ? 0 : 1;
    e.currentTarget.setPointerCapture(e.pointerId);
    setHeld(which);
    move(which, beat, from);
  };
  const drag = (e: PointerEvent) => {
    if (held !== null) move(held, beatOf(e), ends);
  };
  const up = () => setHeld(null);
  const pct = (b: number) => `${(b / total) * 100}%`;
  const [a, b] = [Math.min(...shown), Math.max(...shown)];

  return (
    <div
      ref={box}
      onPointerDown={down}
      onPointerMove={drag}
      onPointerUp={up}
      onPointerCancel={up}
      className={`relative h-9 touch-none select-none rounded border border-slate-800 bg-slate-950/60 ${loop ? "cursor-ew-resize" : ""}`}
      title={loop ? "Drag the markers to choose the part that loops" : undefined}
    >
      <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 ${total} ${hi - lo + 3}`} preserveAspectRatio="none" aria-hidden>
        {Array.from({ length: Math.floor(total / BEATS_PER_BAR) }, (_, k) => (
          <line key={k} x1={k * BEATS_PER_BAR} x2={k * BEATS_PER_BAR} y1={0} y2={hi - lo + 3} stroke="var(--color-slate-700)" vectorEffect="non-scaling-stroke" />
        ))}
        {notes.map((n, i) => {
          const inLoop = !loop || (n.at + n.beats > a && n.at < b);
          return <rect key={i} x={n.at + 0.04} y={hi - n.midi + 1} width={Math.max(0.1, n.beats - 0.08)} height={1} fill={inLoop ? "var(--color-slate-300)" : "var(--color-slate-600)"} />;
        })}
      </svg>
      {loop && (
        <>
          <div className="pointer-events-none absolute inset-y-0 bg-sky-400/10" style={{ left: pct(a), width: pct(b - a) }} />
          {shown.map((m, k) => (
            <div key={k} className="pointer-events-none absolute inset-y-0 -ml-[5px] flex w-[10px] justify-center" style={{ left: pct(m) }}>
              <div className={`h-full w-[3px] rounded ${held === k ? "bg-sky-200" : "bg-sky-400"}`} />
              <div className={`absolute top-0 h-2.5 w-2.5 rounded-sm ${held === k ? "bg-sky-200" : "bg-sky-400"}`} />
            </div>
          ))}
        </>
      )}
      {at !== null && <div className="pointer-events-none absolute inset-y-0 w-px" style={{ left: pct(at), background: PLAYED }} />}
    </div>
  );
}
