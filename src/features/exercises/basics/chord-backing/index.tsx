"use client";

import { useMemo, useState } from "react";
import { Hint } from "@/components/ui";
import { useCoverage } from "@/features/guide/useCoverage";
import { useAudioFocus } from "@/features/sound";
import { useStepPart } from "@/components/practice/exerciseStep";
import { keySlug } from "@/features/theory/keySlug";
import { parseChordQuery } from "@/lib/chordKit/chordSearch";
import { COMP_PATTERNS, type CompPattern } from "@/lib/practice/comping";
import { BeatMeter, ChordCard, PlayButton, PlayerCard, TempoControl, chordHues, pill } from "../../play-along/PlayerParts";
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
  const hues = useMemo(() => chordHues(chords), [chords]);

  return (
    <PlayerCard ref={focus}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <Hint title={player.playing ? "Stop" : "Play"} description="Plays the chords, one a bar, round and round.">
          <PlayButton playing={player.playing} disabled={player.starting} onClick={() => (player.playing ? player.stop() : void player.start())} data-tour="chord-backing-play" />
        </Hint>
        <TempoControl bpm={tempo} min={MIN_BPM} max={MAX_BPM} step={2} onChange={changeTempo} data-tour="chord-backing-tempo" />
        <BeatMeter beats={BEATS_PER_BAR} beat={at ? at.beat : null} />
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
      <div className="flex min-h-5 flex-wrap items-baseline gap-2 text-xs" aria-live="polite">
        {at ? <><b className="text-slate-50">{show(chords[at.now])}</b><span className="text-slate-500">next</span><span className="text-slate-200">{show(chords[at.next])}</span></>
          : <span className="text-slate-400">One chord a bar, looping. First: <span className="text-slate-200">{show(chords[0])}</span></span>}
      </div>
      <div data-tour="chord-backing-chords" className="flex flex-wrap gap-1.5" role="list" aria-label="Chords">
        {chords.map((c, i) => {
          const lit = at?.now === i;
          return (
            <ChordCard key={i} name={c} hue={hues[i]} lit={lit} next={!lit && next === i} className="min-w-16">
              <span className="flex gap-1 px-1" aria-hidden>
                {Array.from({ length: BEATS_PER_BAR }, (_, b) => (
                  <span key={b} className={`h-1.5 w-1.5 rounded-full ${lit && at!.beat === b ? "bg-white" : lit && at!.beat > b ? "bg-white/45" : "bg-slate-700"}`} />
                ))}
              </span>
            </ChordCard>
          );
        })}
      </div>
    </PlayerCard>
  );
}
