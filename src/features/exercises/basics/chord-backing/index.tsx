"use client";

import { useMemo, useState } from "react";
import Icon from "@/components/Icon";
import { Hint, sbtn } from "@/components/ui";
import { useCoverage } from "@/features/guide/useCoverage";
import { useAudioFocus } from "@/features/sound";
import { useStepPart } from "@/components/practice/exerciseStep";
import { keySlug } from "@/features/theory/keySlug";
import { parseChordQuery } from "@/lib/chordKit/chordSearch";
import { COMP_PATTERNS, type CompPattern } from "@/lib/practice/comping";
import { useTimelinePlayer } from "../../play-along/useTimelinePlayer";
import { progression } from "../../shapes";
import { BEATS_PER_BAR } from "../../timeline/timeline";
import { stripAt } from "./strip";

const MIN_BPM = 30;
const MAX_BPM = 240;
const show = (c: string) => c.replace("#", "♯");

/**
 * The chords played for a singer: piano and click on the play-along's clock, one chord a bar, looping. A row of chord
 * boxes shows the bar playing (lit, its beat marked) and the one coming next (outlined); before Play, the first is next.
 * `keyPc` is the key (absent: the first chord's root); `backing` the comping patterns, the first playing first.
 */
export function View({ chords, bpm, keyPc, backing = ["block"] }: { chords: string[]; bpm: number; keyPc?: number; backing?: CompPattern[] }) {
  useCoverage({ hints: 1 });
  const choices = backing.length ? backing : (["block"] as CompPattern[]);
  const [pattern, setPattern] = useState<CompPattern>(choices[0]);
  const [tempo, setTempo] = useState(bpm);
  const key = keyPc ?? parseChordQuery(chords[0])?.rootPc ?? 0;
  const timeline = useMemo(
    () => progression({ key: keySlug(key), chords, bars: chords.length, backing: [pattern], bpm }),
    [key, chords, pattern, bpm],
  );
  if (!timeline) return <p className="text-xs text-slate-500">These chords could not be played.</p>;
  return <Strip timeline={timeline} chords={chords} tempo={tempo} setTempo={setTempo} choices={choices} pattern={pattern} setPattern={setPattern} />;
}

function Strip({ timeline, chords, tempo, setTempo, choices, pattern, setPattern }: {
  timeline: NonNullable<ReturnType<typeof progression>>; chords: string[]; tempo: number; setTempo(b: number): void;
  choices: CompPattern[]; pattern: CompPattern; setPattern(p: CompPattern): void;
}) {
  const player = useTimelinePlayer(timeline);
  const group = useStepPart({ kind: "chords", on: player.playing, start: player.start, stop: player.stop });
  const focus = useAudioFocus(player.playing, player.stop, group);
  const at = stripAt(player.beat, chords.length);
  const next = at ? at.next : 0;
  const changeTempo = (b: number) => {
    const v = Math.min(MAX_BPM, Math.max(MIN_BPM, b));
    setTempo(v);
    player.setTempo(v);
  };
  const pill = (on: boolean) => `rounded-full border px-2.5 py-0.5 text-[11px] transition ${on ? "border-sky-400/70 bg-sky-500/15 text-sky-100" : "border-slate-700 text-slate-500 hover:border-slate-500"}`;

  return (
    <div ref={focus} className="flex flex-col gap-2.5 rounded-xl border border-slate-800 bg-slate-950/40 p-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <Hint title={player.playing ? "Stop" : "Play"} description="Plays the chords, one a bar, round and round.">
          <button type="button" data-tour="chord-backing-play" disabled={player.starting} onClick={() => (player.playing ? player.stop() : void player.start())} aria-pressed={player.playing}
            className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition ${player.playing ? "border-emerald-400/70 bg-emerald-500/20 text-emerald-100" : "border-sky-400/60 bg-sky-500/15 text-sky-50 hover:bg-sky-500/25"}`}>
            <Icon name={player.playing ? "square" : "play"} size={14} fill />{player.playing ? "Stop" : "Play"}
          </button>
        </Hint>
        {choices.length > 1 && (
          <div className="flex flex-wrap gap-1" role="group" aria-label="Backing">
            {choices.map((p) => (
              <button key={p} type="button" aria-pressed={p === pattern} onClick={() => setPattern(p)} title={COMP_PATTERNS.find((x) => x.id === p)?.desc} className={pill(p === pattern)}>
                {COMP_PATTERNS.find((x) => x.id === p)?.label}
              </button>
            ))}
          </div>
        )}
        <span data-tour="chord-backing-tempo" className="ml-auto flex items-center gap-1 text-xs text-slate-300">
          <button type="button" className={sbtn} disabled={tempo <= MIN_BPM} onClick={() => changeTempo(tempo - 2)} aria-label="Slower">−</button>
          <span className="w-14 text-center tabular-nums">{tempo} <span className="text-[10px] text-slate-500">bpm</span></span>
          <button type="button" className={sbtn} disabled={tempo >= MAX_BPM} onClick={() => changeTempo(tempo + 2)} aria-label="Faster">+</button>
        </span>
      </div>
      <div className="flex min-h-5 flex-wrap items-baseline gap-2 text-xs" aria-live="polite">
        {at ? <><b className="text-amber-100">{show(chords[at.now])}</b><span className="text-slate-400">next</span><span className="text-sky-200">{show(chords[at.next])}</span></>
          : <span className="text-slate-400">One chord a bar, looping. First: <span className="text-sky-200">{show(chords[0])}</span></span>}
      </div>
      <div data-tour="chord-backing-chords" className="flex flex-wrap gap-1.5" role="list" aria-label="Chords">
        {chords.map((c, i) => {
          const lit = at?.now === i;
          const soon = !lit && next === i;
          return (
            <span key={i} role="listitem" aria-current={lit || undefined}
              className={`flex min-w-16 flex-col gap-1.5 rounded-xl border px-2 py-1.5 transition-colors duration-75 ${lit ? "border-amber-400/80 bg-amber-500/10" : soon ? "border-dashed border-sky-400/70" : "border-slate-700 bg-slate-900/40"}`}>
              <span className={`text-base font-semibold leading-none ${lit ? "text-amber-50" : soon ? "text-sky-100" : "text-slate-200"}`}>{show(c)}</span>
              <span className="flex gap-1" aria-hidden>
                {Array.from({ length: BEATS_PER_BAR }, (_, b) => (
                  <span key={b} className={`h-1.5 w-1.5 rounded-full ${lit && at!.beat === b ? (b === 0 ? "bg-amber-300" : "bg-sky-300") : lit && at!.beat > b ? "bg-slate-500" : "bg-slate-700"}`} />
                ))}
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
