"use client";

import { useMemo, useState } from "react";
import { Hint } from "@/components/ui";
import { useToolClock } from "@/components/practice/toolClock";
import { useCoverage } from "@/features/guide/useCoverage";
import { useLevelAtLeast } from "@/features/guide/Tier";
import { useAudioFocus, type Player } from "@/features/sound";
import { useStepPart } from "@/components/practice/exerciseStep";
import { useSpaceKey } from "@/components/practice/toolKeys";
import { parseChordQuery } from "@/lib/chordKit/chordSearch";
import { COMP_PATTERNS, type CompPattern } from "@/lib/practice/comping";
import { chordCues, cuesOf, type Marks } from "../cues/cues";
import { chordShapeFor } from "../cues/voicing";
import { expandShape } from "../shapes";
import { parseDegrees } from "../timeline/degrees";
import { BEATS_PER_BAR, clampTimeline } from "../timeline/timeline";
import type { Timeline } from "../timeline/types";
import type { PlayAlongProps } from "./play-along.props";
import { withBackingSound, type BackingSound } from "./schedule";
import { isSolo, soloTargets } from "./solo";
import { BeatMeter, PlayButton, PlayerCard, TempoControl, pill } from "./PlayerParts";
import { useTimelinePlayer } from "./useTimelinePlayer";
import SoloView from "./views/SoloView";
import NeckView from "./views/NeckView";
import NotesView from "./views/NotesView";
import TabView from "./views/TabView";
import { noteOf } from "./views/common";

type View = "tab" | "notes" | "neck";
const VIEWS: View[] = ["tab", "notes", "neck"];
const MIN_BPM = 30;
const MAX_BPM = 240;

/** The timeline with every chord's backing set to `p` (no change when there is no choice to make). */
const withBacking = (t: Timeline, p: CompPattern | undefined): Timeline =>
  !p ? t : { ...t, events: t.events.map((e) => (e.type === "chord" && e.backing ? { ...e, backing: p } : e)) };

/** No steps to play: the chords themselves are drawn (an old `comp`, a progression only backed). */
const stepless = (t: Timeline) => !t.events.some((e) => e.type === "step");

/** A ready timeline played along with: click, piano, and a tab / notes / neck view that follow the playhead. */
/** `instrument` plays the part instead of the shared piano (the riff maker's guitar into a NAM amp). */
export function PlayAlongTimeline({ timeline, view = "tab", others = "muted", marks, instrument }: { timeline: Timeline; view?: View; others?: "muted" | "hidden"; marks?: Marks; instrument?: () => Player }) {
  useCoverage({ hints: 2 });
  const choices = timeline.backingChoices ?? [];
  const [pattern, setPattern] = useState<CompPattern | undefined>(choices[0]);
  // switching the view is a Standard control; hidden, the exercise's own view shows
  const views = useLevelAtLeast("standard");
  const [picked, setShown] = useState<View>(view);
  const shown = views ? picked : view;
  const [tempo, setTempoState] = useState(timeline.bpm);
  const played = useMemo(() => withBacking(timeline, choices.length > 1 ? pattern : undefined), [timeline, pattern, choices.length]);
  const player = useTimelinePlayer(played, instrument);
  const group = useStepPart({ kind: "play", on: player.playing, start: player.start, stop: player.stop });
  const focus = useAudioFocus(player.playing, player.stop, group);
  useToolClock(player.beat < 0 ? null : player.beat);
  const cues = useCuesOf(played, marks, others);
  const fellBack = useMemo(() => {
    const names = new Set<string>();
    for (const e of timeline.events) if (e.type === "chord" && e.voicing === "barre" && chordShapeFor(e.name, "barre")?.fellBack) names.add(e.name);
    return [...names];
  }, [timeline]);

  const keyPc = keyOf(timeline);
  const length = timeline.bars * BEATS_PER_BAR;
  const pos = player.beat < 0 ? -1 : player.beat % length;
  const { chordNow, solo, aim, cueText, hint } = nowAt(played, cues, pos, keyPc);
  const playStop = () => (player.playing ? player.stop() : void player.start());
  const { ref: spaceRef, armed: spaceArmed } = useSpaceKey(player.starting ? undefined : playStop, focus);
  const changeTempo = (b: number) => {
    const v = Math.min(MAX_BPM, Math.max(MIN_BPM, b));
    setTempoState(v);
    player.setTempo(v);
  };

  return (
    <PlayerCard ref={spaceRef}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <Hint title={player.playing ? "Stop" : "Play"} description="Starts the backing and the part to play along with. It loops until you stop it.">
          <PlayButton playing={player.playing} disabled={player.starting} onClick={playStop} space={spaceArmed} data-tour="play-along-play" />
        </Hint>
        <TempoControl bpm={tempo} min={MIN_BPM} max={MAX_BPM} step={2} onChange={changeTempo} data-tour="play-along-tempo" />
        <BeatMeter beats={BEATS_PER_BAR} beat={pos < 0 ? null : Math.floor(pos) % BEATS_PER_BAR} />
        {views && (
          <Hint title="View" description="Shows the part as tab, as notes on the staff or on the neck.">
            <div data-tour="play-along-view" className="flex gap-1" role="group" aria-label="View">
              {VIEWS.map((v) => <button key={v} type="button" aria-pressed={v === shown} onClick={() => setShown(v)} className={pill(v === shown)}>{v}</button>)}
            </div>
          </Hint>
        )}
        {choices.length > 1 && (
          <div className="flex flex-wrap gap-1" role="group" aria-label="Backing">
            {choices.map((p) => (
              <button key={p} type="button" aria-pressed={p === pattern} onClick={() => setPattern(p)} title={COMP_PATTERNS.find((x) => x.id === p)?.desc} className={pill(p === pattern)}>
                {COMP_PATTERNS.find((x) => x.id === p)?.label}
              </button>
            ))}
          </div>
        )}
      </div>
      <NowLine chordNow={chordNow} solo={solo} aim={aim} cueText={cueText} hint={hint} />
      <div data-tour="play-along-music">
        <Music shown={shown} solo={solo} cues={cues} pos={pos} length={length} keyPc={keyPc} others={others} marks={marks} />
      </div>
      {fellBack.map((n) => <p key={n} className="text-[11px] text-slate-500">{n}: open chord used, no barre shape.</p>)}
    </PlayerCard>
  );
}

type PlayAlongToolProps = PlayAlongProps & { /** loops, from older plans; absent loops until stopped */ repeats?: number };

/** The tool's shape as a timeline (null when it can't be drawn) and its marks. */
function useTool({ shape, bpm, repeats, enable, highlight, under }: PlayAlongToolProps) {
  const timeline = useMemo(() => {
    const t = expandShape({ ...shape, bpm, ...(repeats !== undefined ? { repeats } : {}) });
    return t && withBackingSound(clampTimeline(t), under as BackingSound | undefined);
  }, [shape, bpm, repeats, under]);
  const marks = useMemo((): Marks => ({ ...(enable ? { enable: parseDegrees(enable) } : {}), ...(highlight ? { highlight: parseDegrees(highlight) } : {}) }), [enable, highlight]);
  return { timeline, marks };
}

/** `guitar-play-along`: a shape expanded to a timeline and played along with, its backing sound set by `under`. */
export default function PlayAlong(props: PlayAlongToolProps) {
  const { timeline, marks } = useTool(props);
  if (!timeline) return <p className="text-xs text-slate-500">This exercise could not be drawn.</p>;
  return <PlayAlongTimeline timeline={timeline} view={props.view} others={props.others} marks={marks} />;
}

/**
 * The tool drawn over a content video (`VideoOverlay`): the part in the exercise's view and the chord line, at `beat`
 * (the beat the tool was on at this moment of the video, counting on through its loops; null: stopped). No buttons, no
 * sound: the video's clock moves it, so a seek moves it too. The backing is the exercise's first.
 */
export function VideoOverlay({ beat, ...props }: PlayAlongToolProps & { beat: number | null }) {
  const { timeline, marks } = useTool(props);
  const others = props.others ?? "muted";
  const cues = useCuesOf(timeline, marks, others);
  if (!timeline) return null;
  const length = timeline.bars * BEATS_PER_BAR;
  const pos = beat === null || beat < 0 ? -1 : beat % length;
  const keyPc = keyOf(timeline);
  const { chordNow, solo, aim, cueText, hint } = nowAt(timeline, cues, pos, keyPc);
  return (
    <div className="flex flex-col gap-1">
      <NowLine chordNow={chordNow} solo={solo} aim={aim} cueText={cueText} hint={hint} />
      <Music shown={props.view ?? "tab"} solo={solo} cues={cues} pos={pos} length={length} keyPc={keyPc} others={others} marks={marks} />
    </div>
  );
}

/** The cues drawn: the backing left out, and with `others` hidden only the notes switched on. */
function useCuesOf(played: Timeline | null, marks: Marks | undefined, others: "muted" | "hidden") {
  return useMemo(
    () => (!played ? [] : (stepless(played) ? chordCues : cuesOf)(played, marks).filter((c) => c.kind !== "backing" && (others !== "hidden" || c.enabled))),
    [played, marks, others],
  );
}

const keyOf = (t: Timeline): number | undefined => {
  const s = t.events.find((e) => e.type === "scale");
  return s?.type === "scale" ? s.key : undefined;
};

type Cues = ReturnType<typeof cuesOf>;
type Solo = ReturnType<typeof soloTargets> | null;

/** What the line over the music says at `pos` (-1: stopped): the chord now, a solo's scale and aim, the cue and the hint. */
function nowAt(played: Timeline, cues: Cues, pos: number, keyPc: number | undefined) {
  const now = pos < 0 ? undefined : cues.find((c) => pos >= c.at && pos < c.at + c.beats);
  const cueText = pos < 0 ? undefined : [...cues].reverse().find((c) => c.cue && c.at <= pos)?.cue;
  const solo: Solo = isSolo(played) ? soloTargets(played, pos) : null;
  const chordNow = now?.chord ?? (pos >= 0 ? solo?.chord : undefined);
  const aim = solo?.targets.length ? `land on ${solo.targets.map((pc) => noteOf(pc, parseChordQuery(solo.chord)?.rootPc ?? keyPc ?? 0).name).join(" or ")}` : undefined;
  const hint = pos < 0 ? played.hints?.[0]?.text : [...(played.hints ?? [])].reverse().find((h) => h.at <= pos)?.text;
  return { chordNow, solo, aim, cueText, hint };
}

function NowLine({ chordNow, solo, aim, cueText, hint }: ReturnType<typeof nowAt>) {
  return (
    <div className="flex min-h-5 flex-wrap items-baseline gap-2 text-xs">
      {chordNow && <b className="text-slate-100">{chordNow}</b>}
      {solo?.scale && <span className="text-slate-300">{solo.scale}</span>}
      {aim && <span className="text-sky-200">{aim}</span>}
      {cueText && <span className="text-sky-200">{cueText}</span>}
      {hint && <span className="text-slate-400">{hint}</span>}
    </div>
  );
}

function Music({ shown, solo, cues, pos, length, keyPc, others, marks }: { shown: View; solo: Solo; cues: Cues; pos: number; length: number; keyPc: number | undefined; others: "muted" | "hidden"; marks?: Marks }) {
  if (solo) return <SoloView targets={solo} mode={shown} others={others} keyPc={keyPc} />;
  return <>
    {shown === "tab" && <TabView cues={cues} pos={pos} length={length} keyPc={keyPc} />}
    {shown === "notes" && <NotesView cues={cues} pos={pos} length={length} keyPc={keyPc} />}
    {shown === "neck" && <NeckView cues={cues} pos={pos} length={length} keyPc={keyPc} marks={marks} />}
  </>;
}
