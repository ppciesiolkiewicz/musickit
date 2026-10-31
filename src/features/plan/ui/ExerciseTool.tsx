"use client";

import dynamic from "next/dynamic";
import { View as ArpeggioNeck } from "@/features/exercises/basics/arpeggio-neck";
import { View as BackingBand } from "@/features/exercises/basics/backing-band";
import { View as ChordShapes } from "@/features/exercises/basics/chord-shapes";
import { View as ClickDrone } from "@/features/exercises/basics/click-drone";
import { View as IntervalEars } from "@/features/exercises/basics/interval-ears";
import { View as MelodySinger } from "@/features/exercises/basics/melody-singer";
import { View as NoteFinder } from "@/features/exercises/basics/note-finder";
import { View as RunSinger } from "@/features/exercises/basics/run-singer";
import { View as ScaleNeck } from "@/features/exercises/basics/scale-neck";
import { View as Staff } from "@/features/exercises/basics/staff";
import type { PlanTool } from "../model/tools";

// the play-along carries its own sound engine: loaded only when an exercise shows one
const loading = () => <p className="p-3 text-sm text-slate-500">Loading…</p>;
const PlayAlong = dynamic(() => import("@/features/exercises/play-along/PlayAlong"), { ssr: false, loading });

/** One tool of an exercise, as the AI set it up: the component and nothing to configure. */
export default function ExerciseTool({ tool }: { tool: PlanTool }) {
  switch (tool.type) {
    case "scale-neck":
      return <ScaleNeck slug={tool.scale} pc={tool.key} boxes={tool.boxes} add={tool.add} highlight={tool.highlight} mute={tool.mute} hide={tool.hide} others={tool.others} />;
    case "chord-shapes":
      return <ChordShapes chords={tool.chords} voicing={tool.voicing} />;
    case "staff":
      return <Staff slug={tool.scale} pc={tool.key} voice={tool.voice} notes={tool.notes} highlight={tool.highlight} mute={tool.mute} hide={tool.hide} others={tool.others} mic={tool.mic} />;
    case "click-drone":
      return <ClickDrone bpm={tool.bpm} keyPc={tool.key} click={tool.click} drone={tool.drone} />;
    case "backing-band":
      return <BackingBand bpm={tool.bpm} keyPc={tool.key} parts={tool.parts} />;
    case "note-finder":
      return <NoteFinder query={tool.query} />;
    case "interval-ears":
      return <IntervalEars query={tool.query} />;
    case "arpeggio-neck":
      return <ArpeggioNeck chord={tool.chord} boxes={tool.boxes} part={tool.part} highlight={tool.highlight} mute={tool.mute} hide={tool.hide} others={tool.others} />;
    case "melody-singer":
      return <MelodySinger tune={tool.tune} pc={tool.key} voice={tool.voice} />;
    case "run-singer":
      return <RunSinger run={tool.run} pc={tool.key} voice={tool.voice} />;
    case "play-along":
      return <PlayAlong shape={tool.shape} bpm={tool.bpm} repeats={tool.repeats} view={tool.view} highlight={tool.highlight} others={tool.others} />;
  }
}
