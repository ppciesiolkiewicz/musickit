"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Hint } from "@/components/ui";
import { useCoverage } from "@/features/guide/useCoverage";
import { CLICK_MAX_BPM, CLICK_MIN_BPM, ClickTrack, clampClick } from "@/features/instruments/model";
import { getAudioContext, getOutputBus, wakeAudio } from "@/features/sound";
import { BeatMeter, ChordCard, PlayButton, PlayerCard, TempoControl, chordHues } from "../../play-along/PlayerParts";
import { strumAt, strumBars, strumCounts, strumPattern, type Stroke, type StrumPer, type StrumPos } from "./blocks";

const MAX_BPM = Math.min(240, CLICK_MAX_BPM);
const VOLUME = 0.6;

const ARROW: Record<Stroke, string> = { D: "↓", U: "↑", ".": "·" };
const SAY: Record<Stroke, string> = { D: "down", U: "up", ".": "miss" };

/**
 * A metronome and the chords as cards (each chord keeps one colour), the playing one lit in it: one bar of count-in, then the boxes loop. Each chord box holds
 * its beats, each beat box its strums (`pattern`, a down a beat by default), the strum due now lit. Tempo −/+ live.
 * Its own `ClickTrack` on the app's output, read every frame for the beat and how far into it.
 */
export function View({ chords, bpm: initial, per = "bar", beats = 4, pattern }: { chords: string[]; bpm: number; per?: StrumPer; beats?: number; pattern?: string }) {
  useCoverage({ hints: 1 });
  const [bpm, setBpm] = useState(initial);
  const [playing, setPlaying] = useState(false);
  const [at, setAt] = useState<StrumPos | null>(null);
  const [step, setStep] = useState(0);
  const track = useRef<ClickTrack | null>(null);
  const strokes = useMemo(() => strumPattern(pattern, beats) ?? strumPattern(undefined, beats)!, [pattern, beats]);
  const perBeat = strokes[0].length;
  const params = (tempo: number) => clampClick({ bpm: tempo, beatsPerBar: beats, volume: VOLUME });

  useEffect(() => () => track.current?.dispose(), []);
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = "";
    const tick = () => {
      const now = track.current?.beat();
      const index = now?.index ?? -1;
      const sub = now ? Math.min(perBeat - 1, Math.floor(now.phase * perBeat)) : 0;
      const key = `${index}:${sub}`;
      if (key !== last) {
        last = key;
        setAt(index < 0 ? null : strumAt(index, chords.length, per, beats));
        setStep(sub);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, chords.length, per, beats, perBeat]);

  const toggle = async () => {
    if (playing) {
      track.current?.stop();
      setPlaying(false);
      setAt(null);
      return;
    }
    await wakeAudio();
    track.current ??= new ClickTrack(getAudioContext(), getOutputBus());
    track.current.start(params(bpm));
    setPlaying(true);
  };
  const tempo = (next: number) => {
    setBpm(next);
    track.current?.set(params(next));
  };

  const block = at && "block" in at ? at : null;
  const countIn = at && "countIn" in at ? at.countIn : null;
  const beatNow = block ? block.beat : countIn !== null ? countIn - 1 : null;
  const spoken = strokes.flat().join(" ");
  const hues = useMemo(() => chordHues(chords), [chords]);
  return (
    <PlayerCard>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <Hint title={playing ? "Stop" : "Play"} description="Starts the metronome with a count-in, and lights each strum as it comes.">
          <PlayButton playing={playing} onClick={() => void toggle()} data-tour="strum-along-play" />
        </Hint>
        <TempoControl bpm={bpm} min={CLICK_MIN_BPM} max={MAX_BPM} onChange={tempo} data-tour="strum-along-tempo" />
        <BeatMeter beats={beats} beat={beatNow} />
        <span className="text-xs text-slate-400" aria-live="polite">
          {countIn !== null ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/50 bg-amber-500/15 px-2.5 py-1 font-medium text-amber-100">
              Count-in <b className="tabular-nums text-amber-50">{countIn}</b>
            </span>
          ) : playing ? null : `${beats} beats a bar, a chord ${per === "bar" ? "a bar" : "a beat"}`}
        </span>
      </div>
      <div data-tour="strum-along-bars" className="flex flex-wrap items-stretch gap-x-2 gap-y-2" role="list" aria-label={`Chords, strum ${spoken}`}>
        {strumBars(chords.length, per, beats).map((bar, bi) => (
          <Fragment key={bi}>
            {bi > 0 && per === "beat" && <span className="w-px self-stretch bg-slate-700/80" aria-hidden />}
            <span className="flex max-w-full flex-wrap gap-1.5">
              {bar.map((i, j) => {
                const lit = block?.block === i;
                const next = countIn !== null && i === 0;
                const inBox = per === "bar" ? strokes.map((_, b) => b) : [j];
                return (
                  <ChordCard key={i} name={chords[i]} hue={hues[i]} lit={lit} next={next}>
                    <span className="flex flex-wrap gap-1" aria-hidden>
                      {inBox.map((b) => (
                        <Beat key={b} beat={b} strokes={strokes[b]} now={lit && block!.beat === b} step={step} />
                      ))}
                    </span>
                  </ChordCard>
                );
              })}
            </span>
          </Fragment>
        ))}
      </div>
    </PlayerCard>
  );
}

/** One beat: a box of its strums, arrows over the count, the one due now lit while the beat sounds. */
function Beat({ beat, strokes, now, step }: { beat: number; strokes: Stroke[]; now: boolean; step: number }) {
  const counts = strumCounts(beat, strokes.length);
  return (
    <span title={strokes.map((s) => SAY[s]).join(", ")}
      className={`flex rounded-md border px-0.5 py-0.5 transition-colors duration-75 ${now ? "border-white/40 bg-white/10" : "border-slate-700/70 bg-slate-950/60"}`}>
      {strokes.map((s, k) => {
        const hit = now && step === k;
        return (
          <span key={k} className={`flex ${strokes.length === 4 ? "w-4" : "w-5"} flex-col items-center rounded leading-none ${hit ? (s === "." ? "bg-slate-500/30" : "bg-white/25") : ""}`}>
            <span className={`text-base font-bold ${s === "." ? "text-slate-600" : hit ? "text-white" : s === "D" ? "text-slate-100" : "text-sky-200"}`}>{ARROW[s]}</span>
            <span className={`pb-0.5 text-[9px] tabular-nums ${k === 0 ? "text-slate-300" : "text-slate-500"}`}>{counts[k]}</span>
          </span>
        );
      })}
    </span>
  );
}
