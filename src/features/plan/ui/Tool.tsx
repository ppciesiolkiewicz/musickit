"use client";

import dynamic from "next/dynamic";
import { View as ArpeggioNeck } from "@/features/exercises/basics/arpeggio-neck";
import { View as BackingBand } from "@/features/exercises/basics/backing-band";
import { View as ChordShapes } from "@/features/exercises/basics/chord-shapes";
import { View as IntervalSinger } from "@/features/exercises/basics/interval-singer";
import { View as IntervalEars } from "@/features/exercises/basics/interval-ears";
import { View as MelodySinger } from "@/features/exercises/basics/melody-singer";
import { View as NoteFinder } from "@/features/exercises/basics/note-finder";
import { View as RunSinger } from "@/features/exercises/basics/run-singer";
import { View as ScaleNeck } from "@/features/exercises/basics/scale-neck";
import { View as PositionNeck } from "@/features/exercises/basics/position-neck";
import { View as StringSinger } from "@/features/exercises/basics/string-singer";
import { View as Breathwork } from "@/features/exercises/basics/breathwork";
import { View as VoiceHill } from "@/features/exercises/basics/voice-hill";
import { View as LipRoll } from "@/features/exercises/basics/lip-roll";
import { View as Staff } from "@/features/exercises/basics/staff";
import { View as StrumAlong } from "@/features/exercises/basics/strum-along";
import { View as FingerPattern } from "@/features/exercises/basics/finger-pattern";
import { View as LegatoTrill } from "@/features/exercises/basics/legato-trill";
import { View as PickingDrill } from "@/features/exercises/basics/picking-drill";
import { View as Video } from "@/features/exercises/basics/video";
import type { PlanTool } from "../model/tools";
import type { Voice } from "@/features/theory/singing";
import type { ExternalInput } from "@/features/tuner";
import { CoverageTool, useCoverage } from "@/features/guide/useCoverage";

// the guitar play-along carries its own sound engine: loaded only when an exercise shows one
const loading = () => <p className="p-3 text-sm text-slate-500">Loading…</p>;
const PlayAlong = dynamic(() => import("@/features/exercises/play-along/PlayAlong"), { ssr: false, loading });
// so does the backing track (drums, bass and sampled keys)
const BackingTrack = dynamic(() => import("@/features/exercises/basics/backing-track").then((m) => m.View), { ssr: false, loading });

/**
 * One tool as the AI set it up, without the plan store: the plan page and the studio stage both render it. `voice` is the student's
 * voice type: the singer tools use it when the AI set none. `input` is a host's audio input (the studio's): the staff listens to it
 * instead of opening a microphone of its own. Also the /dev/stories canvas.
 * In development the tool registers itself, and what is drawn inside it its levels and hints, for /dev/onboarding
 * (which reads its tour from `TOOL_TOURS`).
 */

export function Tool({ tool, voice, input }: { tool: PlanTool; voice?: Voice; input?: ExternalInput }) {
  useCoverage({}, { kind: "tool", id: tool.type });
  return (
    <CoverageTool type={tool.type}>
      <ToolView tool={tool} voice={voice} input={input} />
    </CoverageTool>
  );
}

function ToolView({ tool, voice, input }: { tool: PlanTool; voice?: Voice; input?: ExternalInput }) {
  switch (tool.type) {
    case "scale-neck":
      return <ScaleNeck slug={tool.scale} pc={tool.key} boxes={tool.boxes} parts={tool.parts} neck={tool.neck} positions={tool.positions} placement={tool.placement} add={tool.add} enable={tool.enable} highlight={tool.highlight} mute={tool.mute} hide={tool.hide} others={tool.others} chords={tool.chords} chordStrings={tool.chordStrings} />;
    case "position-neck":
      return <PositionNeck slug={tool.scale} pc={tool.key} positions={tool.positions} placement={tool.placement} cross={tool.cross} add={tool.add} enable={tool.enable} highlight={tool.highlight} mute={tool.mute} hide={tool.hide} others={tool.others} outside={tool.outside} picker={tool.picker} />;
    case "chord-shapes":
      return <ChordShapes chords={tool.chords} voicing={tool.voicing} />;
    case "staff":
      return <Staff slug={tool.scale} pc={tool.key} voice={tool.voice ?? voice} notes={tool.notes} under={tool.under} enable={tool.enable} highlight={tool.highlight} mute={tool.mute} hide={tool.hide} others={tool.others} mic={tool.mic} drone={tool.drone} click={tool.click} bpm={tool.bpm} labels={tool.labels} external={input} />;
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
      return <StringSinger drill={tool.drill} metronome={tool.metronome} />;
    case "breathwork":
      return <Breathwork drill={tool.drill} from={tool.from} to={tool.to} seconds={tool.seconds} rounds={tool.rounds} />;
    case "voice-hill":
      return <VoiceHill where={tool.where} sound={tool.sound} seconds={tool.seconds} reps={tool.reps} voice={tool.voice ?? voice} />;
    case "lip-roll":
      return <LipRoll shape={tool.shape} speed={tool.speed} play={tool.play} seconds={tool.seconds} plays={tool.plays} voice={tool.voice ?? voice} />;
    case "interval-singer":
      return <IntervalSinger keys={tool.keys ?? [tool.key]} voice={tool.voice ?? voice} intervals={tool.intervals} dir={tool.dir} play={tool.play} dot={tool.dot} picker={tool.picker === true} />;
    case "guitar-play-along":
      return <PlayAlong shape={tool.shape} bpm={tool.bpm} repeats={tool.repeats} view={tool.view} enable={tool.enable} highlight={tool.highlight} others={tool.others} under={tool.under} />;
    case "backing-track":
      return <BackingTrack progression={tool.progression} numerals={tool.numerals} keyPc={tool.key} style={tool.style} bpm={tool.bpm} parts={tool.parts} />;
    case "video":
      return <Video video={tool.video} />;
    case "strum-along":
      return <StrumAlong chords={tool.chords} bpm={tool.bpm} per={tool.per} beats={tool.beats} pattern={tool.pattern} />;
    case "finger-pattern":
      return <FingerPattern fingers={tool.fingers} fret={tool.fret} strings={tool.strings} show={tool.show} bpm={tool.bpm} />;
    case "picking-drill":
      return <PickingDrill strokes={tool.strokes} notesPerString={tool.notesPerString} strings={tool.strings} skip={tool.skip} bpm={tool.bpm} />;
    case "legato-trill":
      return <LegatoTrill fingers={tool.fingers} string={tool.string} fret={tool.fret} bpm={tool.bpm} />;
  }
}
