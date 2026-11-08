"use client";

import dynamic from "next/dynamic";
import DevName from "@/components/DevName";
import { devUi } from "@/features/devtools/gate";
import { View as ArpeggioNeck } from "@/features/exercises/basics/arpeggio-neck";
import { View as BackingBand } from "@/features/exercises/basics/backing-band";
import { View as ChordBacking } from "@/features/exercises/basics/chord-backing";
import { View as ChordShapes } from "@/features/exercises/basics/chord-shapes";
import { View as ClickDrone } from "@/features/exercises/basics/click-drone";
import { View as IntervalSinger } from "@/features/exercises/basics/interval-singer";
import { View as IntervalEars } from "@/features/exercises/basics/interval-ears";
import { View as MelodySinger } from "@/features/exercises/basics/melody-singer";
import { View as NoteFinder } from "@/features/exercises/basics/note-finder";
import { View as RunSinger } from "@/features/exercises/basics/run-singer";
import { View as ScaleNeck } from "@/features/exercises/basics/scale-neck";
import { View as PositionNeck } from "@/features/exercises/basics/position-neck";
import { View as StringSinger } from "@/features/exercises/basics/string-singer";
import { View as TuningEars } from "@/features/exercises/basics/tuning-ears";
import { View as Staff } from "@/features/exercises/basics/staff";
import { View as StrumAlong } from "@/features/exercises/basics/strum-along";
import { View as FingerPattern } from "@/features/exercises/basics/finger-pattern";
import { View as LegatoTrill } from "@/features/exercises/basics/legato-trill";
import { View as PickingDrill } from "@/features/exercises/basics/picking-drill";
import type { PlanTool } from "../model/tools";
import type { Voice } from "@/features/theory/singing";
import { usePlan } from "../store/usePlan";

// the guitar play-along carries its own sound engine: loaded only when an exercise shows one
const loading = () => <p className="p-3 text-sm text-slate-500">Loading…</p>;
const PlayAlong = dynamic(() => import("@/features/exercises/play-along/PlayAlong"), { ssr: false, loading });

/** One tool of an exercise, as the AI set it up: the component and nothing to configure. In development its name shows above it. */
export default function ExerciseTool({ tool }: { tool: PlanTool }) {
  const { state } = usePlan();
  const voice = state.answers?.voice?.type;
  if (!devUi()) return <Tool tool={tool} voice={voice} />;
  return (
    <div className="flex flex-col gap-1">
      <DevName name={tool.type === "guitar-play-along" ? `guitar-play-along · ${tool.shape.shape}` : tool.type} params={params(tool)} />
      <Tool tool={tool} voice={voice} />
    </div>
  );
}

/** The tool's props without its type: what the AI set. */
const params = (tool: PlanTool): object => {
  const { type: _type, ...rest } = tool;
  void _type;
  return rest;
};

/** `voice` is the student's voice type: the singer tools use it when the AI set none. Also the /dev/stories canvas. */
export function Tool({ tool, voice }: { tool: PlanTool; voice?: Voice }) {
  switch (tool.type) {
    case "scale-neck":
      return <ScaleNeck slug={tool.scale} pc={tool.key} boxes={tool.boxes} placement={tool.placement} add={tool.add} enable={tool.enable} highlight={tool.highlight} mute={tool.mute} hide={tool.hide} others={tool.others} />;
    case "position-neck":
      return <PositionNeck slug={tool.scale} pc={tool.key} positions={tool.positions} placement={tool.placement} cross={tool.cross} add={tool.add} enable={tool.enable} highlight={tool.highlight} mute={tool.mute} hide={tool.hide} others={tool.others} outside={tool.outside} picker={tool.picker} />;
    case "chord-shapes":
      return <ChordShapes chords={tool.chords} voicing={tool.voicing} />;
    case "staff":
      return <Staff slug={tool.scale} pc={tool.key} voice={tool.voice ?? voice} notes={tool.notes} under={tool.under} enable={tool.enable} highlight={tool.highlight} mute={tool.mute} hide={tool.hide} others={tool.others} mic={tool.mic} drone={tool.drone} click={tool.click} bpm={tool.bpm} labels={tool.labels} />;
    case "click-drone":
      return <ClickDrone bpm={tool.bpm} keyPc={tool.key} click={tool.click} drone={tool.drone} />;
    case "backing-band":
      return <BackingBand bpm={tool.bpm} keyPc={tool.key} parts={tool.parts} />;
    case "note-finder":
      return <NoteFinder query={tool.query} />;
    case "interval-ears":
      return <IntervalEars query={tool.query} />;
    case "arpeggio-neck":
      return <ArpeggioNeck chord={tool.chord} boxes={tool.boxes} placement={tool.placement} part={tool.part} enable={tool.enable} highlight={tool.highlight} mute={tool.mute} hide={tool.hide} others={tool.others} />;
    case "melody-singer":
      return <MelodySinger tune={tool.tune} pc={tool.key} voice={tool.voice ?? voice} chords={tool.chords} metronome={tool.metronome} />;
    case "run-singer":
      return <RunSinger run={tool.run} voice={tool.voice ?? voice} chords={tool.chords} metronome={tool.metronome} />;
    case "string-singer":
      return <StringSinger drill={tool.drill} voice={tool.voice ?? voice} metronome={tool.metronome} />;
    case "interval-singer":
      return <IntervalSinger pc={tool.key} voice={tool.voice ?? voice} intervals={tool.intervals} dir={tool.dir} dot={tool.dot} />;
    case "tuning-ears":
      return <TuningEars cents={tool.cents} together={tool.together} />;
    case "guitar-play-along":
      return <PlayAlong shape={tool.shape} bpm={tool.bpm} repeats={tool.repeats} view={tool.view} enable={tool.enable} highlight={tool.highlight} others={tool.others} under={tool.under} />;
    case "chord-backing":
      return <ChordBacking chords={tool.chords} bpm={tool.bpm} keyPc={tool.key} backing={tool.backing} />;
    case "strum-along":
      return <StrumAlong chords={tool.chords} bpm={tool.bpm} per={tool.per} beats={tool.beats} pattern={tool.pattern} />;
    case "finger-pattern":
      return <FingerPattern fingers={tool.fingers} fret={tool.fret} strings={tool.strings} bpm={tool.bpm} />;
    case "picking-drill":
      return <PickingDrill strokes={tool.strokes} notesPerString={tool.notesPerString} strings={tool.strings} skip={tool.skip} bpm={tool.bpm} />;
    case "legato-trill":
      return <LegatoTrill fingers={tool.fingers} string={tool.string} fret={tool.fret} bpm={tool.bpm} />;
  }
}
