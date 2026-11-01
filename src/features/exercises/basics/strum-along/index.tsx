"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import Icon from "@/components/Icon";
import { sbtn } from "@/components/ui";
import { CLICK_MAX_BPM, CLICK_MIN_BPM, ClickTrack, clampClick } from "@/features/instruments/model";
import { getAudioContext, getOutputBus, wakeAudio } from "@/features/sound";
import { strumAt, strumBars, type StrumPer, type StrumPos } from "./blocks";

const MAX_BPM = Math.min(240, CLICK_MAX_BPM);
const VOLUME = 0.6;

/**
 * A metronome and the chords as blocks, the playing one lit: one bar of count-in, then the blocks loop. Tempo −/+ live.
 * Its own `ClickTrack` on the app's output, read every frame for the beat.
 */
export function View({ chords, bpm: initial, per = "bar", beats = 4 }: { chords: string[]; bpm: number; per?: StrumPer; beats?: number }) {
  const [bpm, setBpm] = useState(initial);
  const [playing, setPlaying] = useState(false);
  const [at, setAt] = useState<StrumPos | null>(null);
  const track = useRef<ClickTrack | null>(null);
  const params = (tempo: number) => clampClick({ bpm: tempo, beatsPerBar: beats, volume: VOLUME });

  useEffect(() => () => track.current?.dispose(), []);
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = -2;
    const tick = () => {
      const index = track.current?.beat()?.index ?? -1;
      if (index !== last) {
        last = index;
        setAt(index < 0 ? null : strumAt(index, chords.length, per, beats));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, chords.length, per, beats]);

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
      <div className="flex flex-wrap items-center gap-x-2 gap-y-2" role="list" aria-label="Chords">
        {strumBars(chords.length, per, beats).map((bar, bi) => (
          <Fragment key={bi}>
            {bi > 0 && <span className="text-lg text-slate-600" aria-hidden>|</span>}
            <span className="flex gap-1.5">
              {bar.map((i) => {
                const lit = block?.block === i;
                const next = countIn !== null && i === 0;
                return (
                  <span key={i} role="listitem" aria-current={lit || undefined}
                    className={`flex min-w-14 flex-col items-center gap-1 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors duration-75 ${lit ? "border-amber-400 bg-amber-500/20 text-amber-50" : next ? "border-dashed border-sky-400/70 text-sky-100" : "border-slate-700 text-slate-300"}`}>
                    {chords[i].replace("#", "♯")}
                    {per === "bar" && (
                      <span className="flex gap-1" aria-hidden>
                        {Array.from({ length: beats }, (_, b) => (
                          <span key={b} className={`h-1.5 w-1.5 rounded-full ${lit && block!.beat === b ? (b === 0 ? "bg-amber-300" : "bg-sky-300") : "bg-slate-700"}`} />
                        ))}
                      </span>
                    )}
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
