"use client";

import dynamic from "next/dynamic";
import { View as BackingBand } from "@/features/exercises/basics/backing-band";
import { View as ChordShapes } from "@/features/exercises/basics/chord-shapes";
import { View as IntervalEars } from "@/features/exercises/basics/interval-ears";
import { View as NoteFinder } from "@/features/exercises/basics/note-finder";
import { View as Staff } from "@/features/exercises/basics/staff";
import { View as ScaleNeck } from "@/features/exercises/basics/scale-neck";
import type { PlanTool } from "../model/tools";

// the comp player carries its own sound engine: loaded only when an exercise shows them
const loading = () => <p className="p-3 text-sm text-slate-500">Loading…</p>;
const CompPlayer = dynamic(() => import("@/components/practice/CompPlayer"), { ssr: false, loading });

/** One tool of an exercise, as the AI set it up: the thing to play with and nothing to configure. */
export default function ExerciseTool({ tool }: { tool: PlanTool }) {
  switch (tool.type) {
    case "scale":
      return <ScaleNeck slug={tool.scale} pc={tool.key} boxes={tool.boxes} add={tool.add} highlight={tool.highlight} />;
    case "chords":
      return <ChordShapes chords={tool.chords} />;
    case "sing":
      return <Staff slug={tool.scale} pc={tool.key} voice={tool.voice} notes={tool.notes} highlight={tool.highlight} />;
    case "comp":
      return <CompPlayer chords={tool.chords} patterns={tool.patterns} bpm={tool.bpm} beats={tool.beats} />;
    case "band":
      return <BackingBand bpm={tool.bpm} keyPc={tool.key} parts={tool.parts} />;
    case "notes":
      return <NoteFinder query={tool.query} />;
    case "ears":
      return <IntervalEars query={tool.query} />;
  }
}
