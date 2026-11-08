"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "@/components/Icon";
import { getAudioContext, getOutputBus, midiToHz, takeAudioFocus, wakeAudio } from "@/features/sound";
import { useWidth } from "../play-along/views/common";
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

const STRING_NAMES = ["e", "B", "G", "D", "A", "E"];
const LEFT = 44, COL = 28, ROW = 16, TOP = 12;

/**
 * The drill as six-line tab (high e on top), one column per note, wrapped to the width; under the staff the fretting
 * finger and the pick stroke of each note. A bar line every `group` notes; rows break on a group.
 */
function DrillTab({ steps, at, group }: { steps: DrillStep[]; at: number; group: number }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const fit = Math.max(1, Math.floor((width - LEFT - 10) / COL));
  const perRow = fit >= group ? fit - (fit % group) : fit;
  const showFinger = steps.some((s) => s.finger);
  const showStroke = steps.some((s) => s.stroke);
  const staffBottom = TOP + 5 * ROW;
  const fingerY = staffBottom + 18, strokeY = fingerY + (showFinger ? 16 : 0);
  const H = (showStroke ? strokeY : showFinger ? fingerY : staffBottom) + 12;
  const rows = Array.from({ length: Math.ceil(steps.length / perRow) }, (_, r) => r * perRow);

  return (
    <div ref={ref} className="flex w-full flex-col gap-2">
      {rows.map((first) => {
        const row = steps.slice(first, first + perRow);
        const W = LEFT + row.length * COL + 10;
        const x = (i: number) => LEFT + i * COL + COL / 2;
        return (
          <svg key={first} viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label="Tab" className="max-w-full font-mono">
            {STRING_NAMES.map((nm, i) => (
              <g key={nm + i}>
                <text x={LEFT - 10} y={TOP + i * ROW} textAnchor="end" dominantBaseline="central" fontSize={11} fill="var(--color-slate-500)">{nm}</text>
                <line x1={LEFT} x2={W - 10} y1={TOP + i * ROW} y2={TOP + i * ROW} stroke="var(--color-slate-700)" />
              </g>
            ))}
            {row.map((_, i) => ((first + i) % group === 0 ? <line key={`b${i}`} x1={LEFT + i * COL} x2={LEFT + i * COL} y1={TOP} y2={staffBottom} stroke="var(--color-slate-600)" /> : null))}
            <line x1={W - 10} x2={W - 10} y1={TOP} y2={staffBottom} stroke="var(--color-slate-600)" />
            {showFinger && <text x={LEFT - 10} y={fingerY} textAnchor="end" dominantBaseline="central" fontSize={9} fill="var(--color-slate-500)">finger</text>}
            {showStroke && <text x={LEFT - 10} y={strokeY} textAnchor="end" dominantBaseline="central" fontSize={9} fill="var(--color-slate-500)">pick</text>}
            {row.map((s, i) => {
              const now = first + i === at;
              const y = TOP + (s.string - 1) * ROW;
              return (
                <g key={i}>
                  {now && <rect x={x(i) - COL / 2 + 2} y={TOP - 8} width={COL - 4} height={H - TOP} rx={4} fill="var(--color-sky-500)" fillOpacity={0.2} />}
                  <rect x={x(i) - 8} y={y - 7} width={16} height={14} rx={3} fill="var(--color-slate-950)" />
                  <text x={x(i)} y={y} textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={600} fill={now ? "var(--color-sky-200)" : "var(--color-slate-100)"}>{s.fret}</text>
                  {showFinger && s.finger && <text x={x(i)} y={fingerY} textAnchor="middle" dominantBaseline="central" fontSize={11} fill={now ? "var(--color-sky-200)" : "var(--color-amber-300)"}>{s.finger}</text>}
                  {showStroke && s.stroke && <text x={x(i)} y={strokeY} textAnchor="middle" dominantBaseline="central" fontSize={11} fill={now ? "var(--color-sky-200)" : "var(--color-slate-400)"}>{s.stroke === "D" ? "↓" : "↑"}</text>}
                </g>
              );
            })}
          </svg>
        );
      })}
    </div>
  );
}

/**
 * A drill as tab (fret on its string, the finger and pick stroke under it) with a play button: the notes sound one per eighth note
 * at `bpm`, round and round, the playing cell lit. `hint` says what to watch for.
 */
function Player({ steps, bpm, hint, group = 4 }: { steps: DrillStep[]; bpm: number; hint: string; group?: number }) {
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
      <DrillTab steps={steps} at={playing ? at : -1} group={group} />
    </div>
  );
}

/** The drill player; a new drill or tempo starts it afresh (and stops the old one). */
export const DrillPlayer = (p: { steps: DrillStep[]; bpm: number; hint: string; group?: number }) => <Player key={`${p.bpm}:${p.steps.map((s) => `${s.string}.${s.fret}`).join()}`} {...p} />;
