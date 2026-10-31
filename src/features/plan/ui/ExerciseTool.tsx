"use client";

import dynamic from "next/dynamic";
import DevName from "@/components/DevName";
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
import { View as FingerPattern } from "@/features/exercises/basics/finger-pattern";
import { View as LegatoTrill } from "@/features/exercises/basics/legato-trill";
import { View as PickingDrill } from "@/features/exercises/basics/picking-drill";
import type { PlanTool } from "../model/tools";

// the play-along carries its own sound engine: loaded only when an exercise shows one
const loading = () => <p className="p-3 text-sm text-slate-500">Loading…</p>;
const PlayAlong = dynamic(() => import("@/features/exercises/play-along/PlayAlong"), { ssr: false, loading });

/** One tool of an exercise, as the AI set it up: the component and nothing to configure. In development its name shows above it. */
export default function ExerciseTool({ tool }: { tool: PlanTool }) {
  if (process.env.NODE_ENV === "production") return <Tool tool={tool} />;
  return (
    <div className="flex flex-col gap-1">
      <DevName name={tool.type === "play-along" ? `play-along · ${tool.shape.shape}` : tool.type} params={params(tool)} />
      <Tool tool={tool} />
    </div>
  );
}

/** The tool's props without its type: what the AI set. */
const params = (tool: PlanTool): object => {
  const { type: _type, ...rest } = tool;
  void _type;
  return rest;
};

function Tool({ tool }: { tool: PlanTool }) {
  switch (tool.type) {
    case "scale-neck":
      return <ScaleNeck slug={tool.scale} pc={tool.key} boxes={tool.boxes} placement={tool.placement} add={tool.add} highlight={tool.highlight} mute={tool.mute} hide={tool.hide} others={tool.others} />;
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
      return <ArpeggioNeck chord={tool.chord} boxes={tool.boxes} placement={tool.placement} part={tool.part} highlight={tool.highlight} mute={tool.mute} hide={tool.hide} others={tool.others} />;
    case "melody-singer":
      return <MelodySinger tune={tool.tune} pc={tool.key} voice={tool.voice} />;
    case "run-singer":
      return <RunSinger run={tool.run} pc={tool.key} voice={tool.voice} />;
    case "play-along":
      return <PlayAlong shape={tool.shape} bpm={tool.bpm} repeats={tool.repeats} view={tool.view} highlight={tool.highlight} others={tool.others} under={tool.under} />;
    case "finger-pattern":
      return <FingerPattern fingers={tool.fingers} fret={tool.fret} strings={tool.strings} bpm={tool.bpm} />;
    case "picking-drill":
      return <PickingDrill strokes={tool.strokes} notesPerString={tool.notesPerString} strings={tool.strings} skip={tool.skip} bpm={tool.bpm} />;
    case "legato-trill":
      return <LegatoTrill fingers={tool.fingers} string={tool.string} fret={tool.fret} bpm={tool.bpm} />;
  }
}
