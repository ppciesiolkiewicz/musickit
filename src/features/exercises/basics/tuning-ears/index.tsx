"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import { getAudioContext, getOutputBus, midiToHz, wakeAudio } from "@/features/sound";
import { clampCents, describeRound, makeRound, verdictOf, type Round, type Verdict } from "./rounds";

const LABEL: Record<Verdict, string> = { flat: "Flat", "in-tune": "In tune", sharp: "Sharp" };

/** A plucked string: a filtered saw, `cents` off the note, fading over `secs`. */
function pluck(midi: number, cents: number, at: number, secs: number) {
  const ctx = getAudioContext();
  const osc = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  osc.type = "sawtooth";
  osc.frequency.value = midiToHz(midi);
  osc.detune.value = cents;
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(3000, at);
  filter.frequency.exponentialRampToValueAtTime(700, at + secs);
  gain.gain.setValueAtTime(0, at);
  gain.gain.linearRampToValueAtTime(0.18, at + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, at + secs);
  osc.connect(filter).connect(gain).connect(getOutputBus());
  osc.start(at);
  osc.stop(at + secs + 0.05);
}

/**
 * Tuning by ear as a game: the reference (the lower string at the 5th fret) and the next open string, one after the
 * other or together (listen for the beats); the student says whether the open string is flat, sharp or in tune.
 */
export function View({ cents, together = false }: { cents?: number; together?: boolean }) {
  const off = clampCents(cents);
  const [round, setRound] = useState<Round | null>(null);
  const [answer, setAnswer] = useState<Verdict | null>(null);
  const [score, setScore] = useState({ right: 0, asked: 0 });
  const play = async (r: Round) => {
    await wakeAudio();
    const t = getAudioContext().currentTime + 0.05;
    if (together) {
      pluck(r.midi, 0, t, 3.5);
      pluck(r.midi, r.off, t, 3.5);
    } else {
      pluck(r.midi, 0, t, 1.6);
      pluck(r.midi, r.off, t + 1.7, 1.6);
    }
  };
  const next = () => {
    const r = makeRound(off);
    setRound(r);
    setAnswer(null);
    void play(r);
  };
  const say = (v: Verdict) => {
    if (!round || answer) return;
    setAnswer(v);
    setScore((s) => ({ right: s.right + (v === verdictOf(round) ? 1 : 0), asked: s.asked + 1 }));
  };
  const right = round && answer ? answer === verdictOf(round) : null;
  const btn = "rounded-lg border px-3 py-1.5 text-sm transition disabled:opacity-40";

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/40 p-3">
      <p className="text-xs text-slate-400">
        {together ? "Both notes ring together: in tune they blend, out of tune they wobble (beat); the faster the wobble, the further out." : "The reference, then the open string: is the open string flat, sharp or in tune?"} {off} cents out when not in tune.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={next} className={`${btn} border-sky-400/70 bg-sky-500/20 text-sky-100`}>
          {round && !answer ? "Skip" : round ? "Next" : "Start"}
        </button>
        <button type="button" disabled={!round} onClick={() => round && void play(round)} title="Hear it again" aria-label="Hear it again" className={`${btn} border-slate-700 text-slate-300 hover:border-slate-500`}>
          <Icon name="repeat" size={15} />
        </button>
        {(["flat", "in-tune", "sharp"] as Verdict[]).map((v) => (
          <button key={v} type="button" disabled={!round || !!answer} onClick={() => say(v)}
            className={`${btn} ${answer && round && verdictOf(round) === v ? "border-emerald-400/70 bg-emerald-500/25 text-emerald-100" : answer === v ? "border-rose-400/70 bg-rose-500/20 text-rose-100" : "border-slate-700 text-slate-200 hover:border-slate-500"}`}>
            {LABEL[v]}
          </button>
        ))}
        <span className="ml-auto text-xs text-slate-400">{score.right} / {score.asked}</span>
      </div>
      {round && (
        <p className="text-sm text-slate-300">
          {describeRound(round)}
          {answer && <> · <span className={right ? "text-emerald-300" : "text-rose-300"}>{right ? "Right" : "Not quite"}: {round.off === 0 ? "in tune" : `${Math.abs(round.off)} cents ${round.off < 0 ? "flat, tune it up" : "sharp, tune it down"}`}</span></>}
        </p>
      )}
    </div>
  );
}
