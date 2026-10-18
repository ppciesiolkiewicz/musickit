"use client";

import { useState } from "react";
import ChordDiagram from "@/components/chordKit/ChordDiagram";
import NoteNeck from "./NoteNeck";
import ScaleWheel from "./ScaleWheel";
import CircleOfFifths from "./CircleOfFifths";
import { strumShape } from "@/lib/chordKit/playback";
import { playMelody } from "@/features/sound";
import { degreeLabels } from "@/features/theory/scales";
import { MAJOR, DEFAULT_KEY_PC } from "@/features/theory/theory";
import type { CircleKey } from "@/features/theory";
import { lessonShape, type Visual } from "@/features/theory/course/visuals";

function Legend({ items }: { items: { label: string; colour: string }[] }) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-400">
      {items.map((i) => (
        <span key={i.label} className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full" style={{ background: i.colour }} />{i.label}</span>
      ))}
    </div>
  );
}

/** One track's picture on a stage page: playable chord boxes, a coloured neck, the circle of fifths or mode wheels. */
export default function TrackVisual({ visual }: { visual: Visual }) {
  const [key, setKey] = useState<CircleKey | null>({ pc: DEFAULT_KEY_PC, minor: false });
  const [wheel, setWheel] = useState<number | null>(null);
  return (
    <figure className="flex min-w-0 flex-col gap-3">
      {visual.kind === "chords" && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {visual.chords.map((c) => {
            const choice = lessonShape(c.name, c.prefer);
            if (!choice) return null;
            return (
              <div key={c.name} className="min-w-0 rounded-xl border border-slate-800 bg-slate-950/60 p-2">
                <div className="mb-1 flex items-baseline justify-between gap-1">
                  <b className="text-sm text-slate-100">{c.name}</b>
                  {c.tag && <span className="truncate text-[11px] text-slate-500">{c.tag}</span>}
                </div>
                <ChordDiagram shape={choice.shape} rootFret={choice.fret} rootName={c.name.replace(/(m|maj|add|sus|5|7|9).*$/, "")} onPlay={() => strumShape(choice.shape, choice.fret)} />
              </div>
            );
          })}
        </div>
      )}
      {visual.kind === "neck" && (
        <>
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60 p-2">
            <NoteNeck from={visual.from} to={visual.to} dots={visual.dots} window={visual.window} />
          </div>
          <Legend items={visual.legend} />
        </>
      )}
      {visual.kind === "circle" && <CircleOfFifths value={key} onChange={setKey} />}
      {visual.kind === "wheels" && (
        <div className="grid gap-3 sm:grid-cols-3">
          {visual.wheels.map((w, i) => (
            <button
              key={w.name}
              type="button"
              onClick={() => { setWheel(i); playMelody([...w.steps, 12].map((s) => 60 + s), 260); }}
              className={`cursor-sound flex flex-col items-center rounded-xl border p-3 text-center transition ${wheel === i ? "border-sky-500/60 bg-sky-500/10" : "border-slate-800 bg-slate-950/60 hover:border-slate-600"}`}
            >
              <ScaleWheel steps={w.steps} labels={degreeLabels(w.steps)} compare={MAJOR} size={170} />
              <b className="mt-1 text-sm text-slate-100">{w.name}</b>
              <span className="text-xs text-slate-400">{w.mood} · tap to hear</span>
            </button>
          ))}
        </div>
      )}
      <figcaption className="text-xs text-slate-400">{visual.caption}</figcaption>
    </figure>
  );
}
