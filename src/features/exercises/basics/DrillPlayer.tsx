"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "@/components/Icon";
import { Hint } from "@/components/ui";
import { useCoverage } from "@/features/guide/useCoverage";
import { clickAt } from "@/features/instruments/click/click";
import { getAudioContext, getOutputBus, midiToHz, takeAudioFocus, wakeAudio } from "@/features/sound";
import { useWidth } from "../play-along/views/common";
import { stepMidi, type DrillStep } from "./drills";

/** A plucked note on a metronome click (accented on the first note of a group); `soft` for a hammered or pulled one. */
function pluck(midi: number, soft: boolean, accent: boolean) {
  const ctx = getAudioContext();
  const at = ctx.currentTime + 0.02;
  clickAt(ctx, getOutputBus(), at, accent);
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
const LEFT = 54, COL = 36, ROW = 24, TOP = 16;

/** The row under the tab: the fretting finger or the pick stroke. */
export type Under = "finger" | "pick";

/**
 * The drill as six-line tab (high e on top), one column per note, wrapped to the width; under the staff the fretting
 * finger and the pick stroke of each note, or only the `under` one. A bar line every `group` notes; rows break on a group.
 */
function DrillTab({ steps, at, group, under }: { steps: DrillStep[]; at: number; group: number; under?: Under }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const fit = Math.max(1, Math.floor((width - LEFT - 10) / COL));
  const perRow = fit >= group ? fit - (fit % group) : fit;
  const showFinger = under !== "pick" && steps.some((s) => s.finger);
  const showStroke = under !== "finger" && steps.some((s) => s.stroke);
  const staffBottom = TOP + 5 * ROW;
  const fingerY = staffBottom + 24, strokeY = fingerY + (showFinger ? 22 : 0);
  const H = (showStroke ? strokeY : showFinger ? fingerY : staffBottom) + 16;
  const first = steps[0];
  const stringName = first ? ["high e", "B", "G", "D", "A", "low E"][first.string - 1] : "";
  const rows = Array.from({ length: Math.ceil(steps.length / perRow) }, (_, r) => r * perRow);

  return (
    <div ref={ref} className="flex w-full flex-col gap-4">
      <div aria-label="Legend" className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-slate-400">
        <span className="flex items-center gap-2">
          <span className="inline-flex h-5 min-w-[22px] items-center justify-center rounded bg-slate-950 px-1 font-mono text-[15px] font-semibold text-slate-100 ring-1 ring-slate-700">{first?.fret}</span>
          {first?.fret ? `fret ${first.fret} on the ${stringName} string` : `the open ${stringName} string`}
        </span>
        {showFinger && first?.finger && (
          <span className="flex items-center gap-2">
            <span className="font-mono text-[15px] font-semibold text-amber-300">{first.finger}</span>
            {`press it with finger ${first.finger}`}
          </span>
        )}
        {showStroke && first?.stroke && (
          <span className="flex items-center gap-2">
            <span className="font-mono text-[15px] text-slate-300">{first.stroke === "D" ? "↓" : "↑"}</span>
            {first.stroke === "D" ? "pick down (↑ up)" : "pick up (↓ down)"}
          </span>
        )}
      </div>
      {rows.map((first) => {
        const row = steps.slice(first, first + perRow);
        const W = LEFT + row.length * COL + 10;
        const x = (i: number) => LEFT + i * COL + COL / 2;
        return (
          <svg key={first} viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label="Tab" className="max-w-full font-mono">
            {STRING_NAMES.map((nm, i) => (
              <g key={nm + i}>
                <text x={LEFT - 10} y={TOP + i * ROW} textAnchor="end" dominantBaseline="central" fontSize={14} fill="var(--color-slate-400)">{nm}</text>
                <line x1={LEFT} x2={W - 10} y1={TOP + i * ROW} y2={TOP + i * ROW} stroke="var(--color-slate-700)" />
              </g>
            ))}
            {row.map((_, i) => ((first + i) % group === 0 ? <line key={`b${i}`} x1={LEFT + i * COL} x2={LEFT + i * COL} y1={TOP} y2={staffBottom} stroke="var(--color-slate-600)" /> : null))}
            <line x1={W - 10} x2={W - 10} y1={TOP} y2={staffBottom} stroke="var(--color-slate-600)" />
            {showFinger && <text x={LEFT - 10} y={fingerY} textAnchor="end" dominantBaseline="central" fontSize={12} fill="var(--color-slate-400)">finger</text>}
            {showStroke && <text x={LEFT - 10} y={strokeY} textAnchor="end" dominantBaseline="central" fontSize={12} fill="var(--color-slate-400)">pick</text>}
            {row.map((s, i) => {
              const now = first + i === at;
              const y = TOP + (s.string - 1) * ROW;
              return (
                <g key={i}>
                  {now && <rect x={x(i) - COL / 2 + 2} y={TOP - 8} width={COL - 4} height={H - TOP} rx={4} fill="var(--color-sky-500)" fillOpacity={0.2} />}
                  <rect x={x(i) - 11} y={y - 10} width={22} height={20} rx={4} fill="var(--color-slate-950)" />
                  <text x={x(i)} y={y} textAnchor="middle" dominantBaseline="central" fontSize={16} fontWeight={600} fill={now ? "var(--color-sky-200)" : "var(--color-slate-100)"}>{s.fret}</text>
                  {showFinger && s.finger && <text x={x(i)} y={fingerY} textAnchor="middle" dominantBaseline="central" fontSize={15} fontWeight={600} fill={now ? "var(--color-sky-200)" : "var(--color-amber-300)"}>{s.finger}</text>}
                  {showStroke && s.stroke && <text x={x(i)} y={strokeY} textAnchor="middle" dominantBaseline="central" fontSize={16} fill={now ? "var(--color-sky-200)" : "var(--color-slate-300)"}>{s.stroke === "D" ? "↓" : "↑"}</text>}
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
 * A drill as tab (fret on its string, the finger and pick stroke under it) with a play button: the notes sound one per beat at `bpm`,
 * each on a metronome click (accented at the start of each group), round and round, the playing cell lit. `hint` says what to watch for. `show` fixes the row under the tab to the finger or the pick stroke; unset, and when
 * the drill has both, a Finger / Pick switch lets the student choose, starting on finger.
 */
function Player({ steps, bpm, hint, group = 4, show }: { steps: DrillStep[]; bpm: number; hint: string; group?: number; show?: Under }) {
  const both = steps.some((s) => s.finger) && steps.some((s) => s.stroke);
  const [chosen, setChosen] = useState<Under>("finger");
  const under = show ?? (both ? chosen : undefined);
  useCoverage({ hints: 1 });
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
      pluck(stepMidi(s), !s.stroke, (i % steps.length) % group === 0);
      setAt(i % steps.length);
      i++;
    };
    tick();
    timer.current = setInterval(tick, 60000 / bpm);
    setPlaying(true);
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/40 p-3">
      <div className="flex flex-wrap items-center gap-3">
        <Hint title={playing ? "Stop" : "Play"} description="Starts the metronome and sounds the drill with it, one note per beat, lighting the note playing.">
          <button type="button" data-tour="drill-play" onClick={() => (playing ? stop() : void start())} aria-label={playing ? "Stop" : "Play"} title={playing ? "Stop" : "Play"}
            className="rounded-lg border border-sky-400/70 bg-sky-500/20 p-2 text-sky-100">
            <Icon name={playing ? "square" : "play"} size={16} />
          </button>
        </Hint>
        <span className="text-sm text-slate-300">{bpm} bpm, one note per beat · {hint}</span>
        {!show && both && (
          <div role="group" aria-label="Under the tab" className="ml-auto flex overflow-hidden rounded-lg border border-slate-700 text-xs">
            {(["finger", "pick"] as const).map((u) => (
              <button key={u} type="button" aria-pressed={chosen === u} onClick={() => setChosen(u)}
                className={chosen === u ? "bg-slate-700 px-2.5 py-1 text-slate-100" : "px-2.5 py-1 text-slate-400 hover:text-slate-200"}>
                {u === "finger" ? "Finger" : "Pick"}
              </button>
            ))}
          </div>
        )}
      </div>
      <div data-tour="drill-tab"><DrillTab steps={steps} at={playing ? at : -1} group={group} under={under} /></div>
    </div>
  );
}

/** The drill player; a new drill or tempo starts it afresh (and stops the old one). */
export const DrillPlayer = (p: { steps: DrillStep[]; bpm: number; hint: string; group?: number; show?: Under }) => <Player key={`${p.bpm}:${p.steps.map((s) => `${s.string}.${s.fret}`).join()}`} {...p} />;
