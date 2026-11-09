"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import Icon from "@/components/Icon";
import { Button, HUE_TONES, Hint, hueAt, type Hue } from "@/components/ui";
import { useCoverage } from "@/features/guide/useCoverage";
import { CLICK_MAX_BPM, CLICK_MIN_BPM, ClickTrack, clampClick } from "@/features/instruments/model";
import { getAudioContext, getOutputBus, wakeAudio } from "@/features/sound";
import { strumAt, strumBars, strumCounts, strumPattern, type Stroke, type StrumPer, type StrumPos } from "./blocks";

const MAX_BPM = Math.min(240, CLICK_MAX_BPM);
const VOLUME = 0.6;

const ARROW: Record<Stroke, string> = { D: "↓", U: "↑", ".": "·" };
/** The hue as a solid stripe across a chord card's top. */
const STRIPE: Record<Hue, string> = {
  sky: "bg-sky-400", teal: "bg-teal-400", violet: "bg-violet-400", emerald: "bg-emerald-400",
  amber: "bg-amber-400", pink: "bg-pink-400", rose: "bg-rose-400", red: "bg-red-400",
};
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
  const hues = useMemo(() => {
    const seen = new Map<string, Hue>();
    return chords.map((c) => {
      if (!seen.has(c)) seen.set(c, hueAt(seen.size));
      return seen.get(c)!;
    });
  }, [chords]);
  return (
    <div className="relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-slate-700/70 bg-linear-to-b from-sky-500/[0.07] via-slate-900/70 to-slate-900/70 p-3 shadow-lg shadow-black/20 sm:p-4">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-sky-400/60 to-transparent" />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <Hint title={playing ? "Stop" : "Play"} description="Starts the metronome with a count-in, and lights each strum as it comes.">
          <button type="button" data-tour="strum-along-play" onClick={() => void toggle()} aria-pressed={playing} aria-label={playing ? "Stop" : "Play"}
            className={`relative grid h-12 w-12 shrink-0 place-items-center rounded-full text-slate-950 shadow-lg transition active:scale-95 ${playing ? "bg-emerald-400 shadow-emerald-500/40 hover:bg-emerald-300" : "bg-sky-400 shadow-sky-500/40 hover:bg-sky-300"}`}>
            {playing && <span aria-hidden className="absolute inset-0 animate-ping rounded-full bg-emerald-400/30 [animation-duration:1.6s]" />}
            <Icon name={playing ? "square" : "play"} size={20} fill className={playing ? "" : "translate-x-0.5"} />
          </button>
        </Hint>
        <span data-tour="strum-along-tempo" className="flex items-center gap-2 text-sm text-slate-300">
          <span className="mr-0.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Tempo</span>
          <Button size="icon-sm" disabled={bpm <= CLICK_MIN_BPM} onClick={() => tempo(bpm - 1)} aria-label="Slower" title="Slower"><Icon name="minus" size={14} /></Button>
          <span className="min-w-8 text-center text-base font-semibold tabular-nums text-slate-100">{bpm}</span>
          <Button size="icon-sm" disabled={bpm >= MAX_BPM} onClick={() => tempo(bpm + 1)} aria-label="Faster" title="Faster"><Icon name="plus" size={14} /></Button>
          <span className="text-slate-500">bpm</span>
        </span>
        <span className="flex h-9 items-end gap-1.5 rounded-xl border border-slate-700/60 bg-slate-950/50 px-3 py-2" aria-hidden>
          {Array.from({ length: beats }, (_, i) => {
            const on = beatNow === i;
            const down = i === 0;
            return <span key={i} className={`w-2 rounded-full transition-all duration-75 ${down ? "h-5" : "h-3.5"} ${down ? (on ? "bg-amber-300 shadow-[0_0_10px] shadow-amber-400/80" : "bg-amber-400/30") : on ? "bg-sky-300 shadow-[0_0_10px] shadow-sky-400/80" : "bg-sky-400/25"}`} />;
          })}
        </span>
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
                const hue = hues[i];
                const inBox = per === "bar" ? strokes.map((_, b) => b) : [j];
                return (
                  <span key={i} role="listitem" aria-current={lit || undefined}
                    className={`relative flex max-w-full flex-col gap-1.5 overflow-hidden rounded-xl border px-1.5 pb-1.5 pt-2.5 transition duration-100 ${lit ? `${HUE_TONES[hue].on} -translate-y-0.5` : next ? "border-dashed border-slate-400/70 bg-slate-950/40" : "border-slate-700/70 bg-slate-950/40"}`}>
                    <span aria-hidden className={`absolute inset-x-0 top-0 h-1 ${STRIPE[hue]} ${lit ? "" : "opacity-60"}`} />
                    <span className={`px-1 text-base font-semibold leading-none tracking-tight ${lit ? "text-white" : "text-slate-100"}`}>{chords[i].replace("#", "♯")}</span>
                    <span className="flex flex-wrap gap-1" aria-hidden>
                      {inBox.map((b) => (
                        <Beat key={b} beat={b} strokes={strokes[b]} now={lit && block!.beat === b} step={step} />
                      ))}
                    </span>
                  </span>
                );
              })}
            </span>
          </Fragment>
        ))}
      </div>
    </div>
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
