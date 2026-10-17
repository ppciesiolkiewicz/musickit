"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ChordDiagram from "./ChordDiagram";
import { colourDegrees, degreeName, progressionForDegree } from "@/lib/chordKit/degreeProgressions";
import type { KeyContext } from "@/features/theory/theory";
import { strumShape } from "@/lib/chordKit/playback";
import { Modal } from "@/components/ui";

const BEAT_MS = 1400;

/** A four-chord loop around one chord of the mode that leans on the mode's colour note, voiced so the chords flow into each other, with a button to hear it through. */
export default function ChordProgressionModal({ ctx, degree, onClose }: { ctx: KeyContext; degree: number; onClose: () => void }) {
  const prog = useMemo(() => progressionForDegree(ctx, degree), [ctx, degree]);
  const colourTag = colourDegrees(ctx).map((i) => degreeName(ctx, i)).join(" ");
  const [at, setAt] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const stop = () => {
    timers.current.forEach(clearTimeout);
    timers.current.length = 0;
    setAt(null);
    setRunning(false);
  };
  useEffect(() => {
    const t = timers.current;
    return () => t.forEach(clearTimeout);
  }, []);

  const playOne = (i: number) => {
    const p = prog.chords[i].pick;
    if (p) strumShape(p.shape, p.fret, { gapMs: 45, holdMs: BEAT_MS });
    setAt(i);
  };
  const playAll = () => {
    stop();
    setRunning(true);
    prog.chords.forEach((_, i) => timers.current.push(setTimeout(() => playOne(i), i * BEAT_MS)));
    timers.current.push(setTimeout(stop, prog.chords.length * BEAT_MS));
  };

  return (
    <Modal title={`Progression with ${ctx.chords[degree].seventhName} in ${ctx.names[0]} ${ctx.modeName}`} onClose={() => { stop(); onClose(); }}>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={running ? stop : playAll}
          className="flex items-center gap-2 rounded-full border border-sky-400/60 px-4 py-1.5 text-sm text-sky-200 hover:border-sky-300"
        >
          <span aria-hidden>{running ? "■" : "▶"}</span> {running ? "Stop" : "Play all"}
        </button>
        <p className="min-w-0 flex-1 text-sm text-slate-400">{prog.note}</p>
      </div>
      <ol className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {prog.chords.map((c, i) => (
          <li
            key={i}
            className={`flex flex-col items-center gap-2 rounded-xl border p-3 ${c.degree === degree ? "border-sky-400/70 bg-sky-950/20" : "border-slate-800 bg-slate-900/40"}`}
          >
            <div className="flex w-full items-baseline justify-between text-xs text-slate-500">
              <span className="tabular-nums">{i + 1}</span>
              {c.degree === degree ? <span className="text-sky-300">this chord</span> : c.colour && <span className="text-amber-300/80">{colourTag} colour</span>}
            </div>
            <span className="text-lg font-light text-sky-300">{c.roman}</span>
            <span className="text-base font-medium text-slate-100">{c.name}</span>
            <div className="w-full max-w-[11rem]">
              {c.pick ? (
                <ChordDiagram shape={c.pick.shape} rootFret={c.pick.fret} onPlay={() => playOne(i)} active={at === i} ctx={ctx} />
              ) : (
                <p className="py-6 text-center text-xs text-slate-600">no shape</p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </Modal>
  );
}
