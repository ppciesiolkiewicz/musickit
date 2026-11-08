"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "@/components/Icon";
import { getAudioContext, getOutputBus, midiToHz, takeAudioFocus, wakeAudio } from "@/features/sound";
import { stepMidi, type DrillStep } from "./drills";

/** A plucked note; `soft` for a hammered or pulled one. */
function pluck(midi: number, soft: boolean) {
  const ctx = getAudioContext();
  const at = ctx.currentTime + 0.02;
  const osc = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  osc.type = "sawtooth";
  osc.frequency.value = midiToHz(midi);
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(soft ? 1400 : 3000, at);
  filter.frequency.exponentialRampToValueAtTime(600, at + 0.5);
  gain.gain.setValueAtTime(0, at);
  gain.gain.linearRampToValueAtTime(soft ? 0.09 : 0.16, at + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, at + 0.6);
  osc.connect(filter).connect(gain).connect(getOutputBus());
  osc.start(at);
  osc.stop(at + 0.65);
}

const STRING_NAMES = ["", "e", "B", "G", "D", "A", "E"];

/**
 * A drill as a row of cells (string, fret, finger, pick stroke) with a play button: the notes sound one per eighth note
 * at `bpm`, round and round, the playing cell lit. `hint` says what to watch for.
 */
function Player({ steps, bpm, hint }: { steps: DrillStep[]; bpm: number; hint: string }) {
  const [playing, setPlaying] = useState(false);
  const [at, setAt] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const release = useRef<(() => void) | null>(null);

  const stop = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    release.current?.();
    release.current = null;
    setPlaying(false);
  };
  useEffect(() => stop, []);

  const start = async () => {
    await wakeAudio();
    release.current = takeAudioFocus(stop);
    let i = 0;
    const tick = () => {
      const s = steps[i % steps.length];
      pluck(stepMidi(s), !s.stroke);
      setAt(i % steps.length);
      i++;
    };
    tick();
    timer.current = setInterval(tick, 30000 / bpm);
    setPlaying(true);
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/40 p-3">
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => (playing ? stop() : void start())} aria-label={playing ? "Stop" : "Play"} title={playing ? "Stop" : "Play"}
          className="rounded-lg border border-sky-400/70 bg-sky-500/20 p-2 text-sky-100">
          <Icon name={playing ? "square" : "play"} size={16} />
        </button>
        <span className="text-xs text-slate-400">{bpm} bpm, one note per half beat · {hint}</span>
      </div>
      <ol className="flex flex-wrap gap-1.5">
        {steps.map((s, i) => (
          <li key={i} className={`flex w-11 flex-col items-center rounded-lg border py-1 text-xs ${playing && i === at ? "border-sky-300 bg-sky-500/30 text-sky-50" : "border-slate-700 text-slate-300"}`}>
            <span className="text-[10px] text-slate-500">{STRING_NAMES[s.string]}</span>
            <span className="text-sm font-semibold">{s.fret}</span>
            <span className="text-[10px] text-slate-400">{s.finger ?? "open"}{s.stroke ? (s.stroke === "D" ? " ↓" : " ↑") : ""}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** The drill player; a new drill or tempo starts it afresh (and stops the old one). */
export const DrillPlayer = (p: { steps: DrillStep[]; bpm: number; hint: string }) => <Player key={`${p.bpm}:${p.steps.map((s) => `${s.string}.${s.fret}`).join()}`} {...p} />;
