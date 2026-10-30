"use client";

import { useMemo, useState } from "react";
import Icon from "@/components/Icon";
import { sbtn } from "@/components/ui";
import { COMP_PATTERNS, type CompPattern } from "@/lib/practice/comping";
import { cuesOf } from "../cues/cues";
import { chordShapeFor } from "../cues/voicing";
import { expandShape } from "../shapes";
import { parseDegrees } from "../timeline/degrees";
import { BEATS_PER_BAR, clampTimeline } from "../timeline/timeline";
import type { Timeline } from "../timeline/types";
import type { PlayAlongProps } from "./play-along.props";
import { useTimelinePlayer } from "./useTimelinePlayer";
import NeckView from "./views/NeckView";
import NotesView from "./views/NotesView";
import TabView from "./views/TabView";

type View = "tab" | "notes" | "neck";
const VIEWS: View[] = ["tab", "notes", "neck"];
const MIN_BPM = 30;
const MAX_BPM = 240;

/** The timeline with every chord's backing set to `p` (no change when there is no choice to make). */
const withBacking = (t: Timeline, p: CompPattern | undefined): Timeline =>
  !p ? t : { ...t, events: t.events.map((e) => (e.type === "chord" && e.backing ? { ...e, backing: p } : e)) };

/** A ready timeline played along with: click, piano, and a tab / notes / neck view that follow the playhead. */
export function PlayAlongTimeline({ timeline, view = "tab", others = "dimmed", highlight }: { timeline: Timeline; view?: View; others?: "dimmed" | "hidden"; highlight?: number[] }) {
  const choices = timeline.backingChoices ?? [];
  const [pattern, setPattern] = useState<CompPattern | undefined>(choices[0]);
  const [shown, setShown] = useState<View>(view);
  const [tempo, setTempoState] = useState(timeline.bpm);
  const played = useMemo(() => withBacking(timeline, choices.length > 1 ? pattern : undefined), [timeline, pattern, choices.length]);
  const player = useTimelinePlayer(played);
  const cues = useMemo(
    () => cuesOf(played, highlight ? { highlight } : {}).filter((c) => c.kind !== "backing" && (others !== "hidden" || c.highlighted)),
    [played, highlight, others],
  );
  const fellBack = useMemo(() => {
    const names = new Set<string>();
    for (const e of timeline.events) if (e.type === "chord" && e.voicing === "barre" && chordShapeFor(e.name, "barre")?.fellBack) names.add(e.name);
    return [...names];
  }, [timeline]);

  const length = timeline.bars * BEATS_PER_BAR;
  const pos = player.beat < 0 ? -1 : player.beat % length;
  const now = pos < 0 ? undefined : cues.find((c) => pos >= c.at && pos < c.at + c.beats);
  const cueText = pos < 0 ? undefined : [...cues].reverse().find((c) => c.cue && c.at <= pos)?.cue;
  const hint = pos < 0 ? timeline.hints?.[0]?.text : [...(timeline.hints ?? [])].reverse().find((h) => h.at <= pos)?.text;
  const changeTempo = (b: number) => {
    const v = Math.min(MAX_BPM, Math.max(MIN_BPM, b));
    setTempoState(v);
    player.setTempo(v);
  };
  const pill = (on: boolean) => `rounded-full border px-2.5 py-0.5 text-[11px] transition ${on ? "border-sky-400/70 bg-sky-500/15 text-sky-100" : "border-slate-700 text-slate-500 hover:border-slate-500"}`;

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-950/40 p-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" disabled={player.starting} onClick={() => (player.playing ? player.stop() : void player.start())} aria-pressed={player.playing}
          className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition ${player.playing ? "border-emerald-400/70 bg-emerald-500/20 text-emerald-100" : "border-sky-400/60 bg-sky-500/15 text-sky-50 hover:bg-sky-500/25"}`}>
          <Icon name={player.playing ? "square" : "play"} size={14} fill />{player.playing ? "Stop" : "Play"}
        </button>
        <div className="flex gap-1" role="group" aria-label="View">
          {VIEWS.map((v) => <button key={v} type="button" aria-pressed={v === shown} onClick={() => setShown(v)} className={pill(v === shown)}>{v}</button>)}
        </div>
        {choices.length > 1 && (
          <div className="flex flex-wrap gap-1" role="group" aria-label="Backing">
            {choices.map((p) => (
              <button key={p} type="button" aria-pressed={p === pattern} onClick={() => setPattern(p)} title={COMP_PATTERNS.find((x) => x.id === p)?.desc} className={pill(p === pattern)}>
                {COMP_PATTERNS.find((x) => x.id === p)?.label}
              </button>
            ))}
          </div>
        )}
        <span className="ml-auto flex items-center gap-1 text-xs text-slate-300">
          <button type="button" className={sbtn} disabled={tempo <= MIN_BPM} onClick={() => changeTempo(tempo - 2)} aria-label="Slower">−</button>
          <span className="w-14 text-center tabular-nums">{tempo} <span className="text-[10px] text-slate-500">bpm</span></span>
          <button type="button" className={sbtn} disabled={tempo >= MAX_BPM} onClick={() => changeTempo(tempo + 2)} aria-label="Faster">+</button>
        </span>
      </div>
      <div className="flex min-h-5 flex-wrap items-baseline gap-2 text-xs">
        {now?.chord && <b className="text-slate-100">{now.chord}</b>}
        {cueText && <span className="text-sky-200">{cueText}</span>}
        {hint && <span className="text-slate-400">{hint}</span>}
      </div>
      {shown === "tab" && <TabView cues={cues} pos={pos} length={length} />}
      {shown === "notes" && <NotesView cues={cues} pos={pos} length={length} />}
      {shown === "neck" && <NeckView cues={cues} pos={pos} length={length} />}
      {fellBack.map((n) => <p key={n} className="text-[11px] text-slate-500">{n}: open chord used, no barre shape.</p>)}
    </div>
  );
}

/** `play-along`: a shape expanded to a timeline and played along with. */
export default function PlayAlong({ shape, bpm, repeats, view, highlight, others }: PlayAlongProps) {
  const timeline = useMemo(() => {
    const t = expandShape({ ...shape, bpm, ...(repeats !== undefined ? { repeats } : {}) });
    return t && clampTimeline(t);
  }, [shape, bpm, repeats]);
  const lit = useMemo(() => (highlight ? parseDegrees(highlight) : undefined), [highlight]);
  if (!timeline) return <p className="text-xs text-slate-500">This exercise could not be drawn.</p>;
  return <PlayAlongTimeline timeline={timeline} view={view} others={others} highlight={lit} />;
}
