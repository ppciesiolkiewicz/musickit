"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import Icon from "@/components/Icon";
import { sbtn } from "@/components/ui";
import { CLICK_MAX_BPM, CLICK_MIN_BPM, ClickTrack, clampClick } from "@/features/instruments/model";
import { getAudioContext, getOutputBus, wakeAudio } from "@/features/sound";
import { strumAt, strumBars, strumCounts, strumPattern, type Stroke, type StrumPer, type StrumPos } from "./blocks";

const MAX_BPM = Math.min(240, CLICK_MAX_BPM);
const VOLUME = 0.6;

const ARROW: Record<Stroke, string> = { D: "↓", U: "↑", ".": "·" };
const SAY: Record<Stroke, string> = { D: "down", U: "up", ".": "miss" };

/**
 * A metronome and the chords as boxes, the playing one lit: one bar of count-in, then the boxes loop. Each chord box holds
 * its beats, each beat box its strums (`pattern`, a down a beat by default), the strum due now lit. Tempo −/+ live.
 * Its own `ClickTrack` on the app's output, read every frame for the beat and how far into it.
 */
export function View({ chords, bpm: initial, per = "bar", beats = 4, pattern }: { chords: string[]; bpm: number; per?: StrumPer; beats?: number; pattern?: string }) {
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
  const spoken = strokes.flat().join(" ");
  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-slate-800 bg-slate-950/40 p-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => void toggle()} aria-pressed={playing}
          className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition ${playing ? "border-emerald-400/70 bg-emerald-500/20 text-emerald-100" : "border-sky-400/60 bg-sky-500/15 text-sky-50 hover:bg-sky-500/25"}`}>
          <Icon name={playing ? "square" : "play"} size={14} fill />{playing ? "Stop" : "Play"}
        </button>
        <span className="flex items-center gap-1 text-xs text-slate-300">
          <button type="button" className={sbtn} disabled={bpm <= CLICK_MIN_BPM} onClick={() => tempo(bpm - 1)} aria-label="Slower">−</button>
          <span className="w-14 text-center tabular-nums">{bpm} <span className="text-[10px] text-slate-500">bpm</span></span>
          <button type="button" className={sbtn} disabled={bpm >= MAX_BPM} onClick={() => tempo(bpm + 1)} aria-label="Faster">+</button>
        </span>
        <span className="text-xs text-slate-400" aria-live="polite">
          {countIn !== null ? <>Count-in <b className="tabular-nums text-amber-200">{countIn}</b></> : playing ? null : `${beats} beats a bar, a chord ${per === "bar" ? "a bar" : "a beat"}`}
        </span>
      </div>
      <div className="flex flex-wrap items-stretch gap-x-2 gap-y-2" role="list" aria-label={`Chords, strum ${spoken}`}>
        {strumBars(chords.length, per, beats).map((bar, bi) => (
          <Fragment key={bi}>
            {bi > 0 && per === "beat" && <span className="self-center text-lg text-slate-600" aria-hidden>|</span>}
            <span className="flex max-w-full flex-wrap gap-1.5">
              {bar.map((i, j) => {
                const lit = block?.block === i;
                const next = countIn !== null && i === 0;
                const inBox = per === "bar" ? strokes.map((_, b) => b) : [j];
                return (
                  <span key={i} role="listitem" aria-current={lit || undefined}
                    className={`flex max-w-full flex-col gap-1.5 rounded-xl border p-1.5 transition-colors duration-75 ${lit ? "border-amber-400/80 bg-amber-500/10" : next ? "border-dashed border-sky-400/70" : "border-slate-700 bg-slate-900/40"}`}>
                    <span className={`px-1 text-sm font-semibold leading-none ${lit ? "text-amber-50" : next ? "text-sky-100" : "text-slate-200"}`}>{chords[i].replace("#", "♯")}</span>
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
      className={`flex rounded-md border px-0.5 py-0.5 transition-colors duration-75 ${now ? (beat === 0 ? "border-amber-300/80 bg-amber-400/15" : "border-sky-300/70 bg-sky-400/10") : "border-slate-700/80 bg-slate-950/50"}`}>
      {strokes.map((s, k) => {
        const hit = now && step === k;
        return (
          <span key={k} className={`flex ${strokes.length === 4 ? "w-4" : "w-5"} flex-col items-center rounded leading-none ${hit ? (s === "." ? "bg-slate-600/40" : "bg-amber-400/30") : ""}`}>
            <span className={`text-base font-bold ${s === "." ? "text-slate-600" : hit ? "text-amber-100" : s === "D" ? "text-slate-100" : "text-sky-200"}`}>{ARROW[s]}</span>
            <span className={`pb-0.5 text-[9px] tabular-nums ${k === 0 ? "text-slate-300" : "text-slate-500"}`}>{counts[k]}</span>
          </span>
        );
      })}
    </span>
  );
}
