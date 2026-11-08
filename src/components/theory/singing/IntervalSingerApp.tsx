"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Select } from "@/components/ui";
import { midiToName } from "@/features/sound";
import { VOICES, savedVoice, type Voice } from "@/features/theory/singing";
import { INTERVALS } from "@/lib/chordKit/intervals";
import { View as IntervalSinger } from "@/features/exercises/basics/interval-singer";
import { DEFAULT_INTERVALS, INTERVAL_DIRS, type IntervalDir } from "@/features/exercises/basics/interval-singer/asks";
import { panel } from "@/components/practice/shared";

/** where the voice picked last is kept, shared with the other singing pages */
const VOICE_KEY = "singing.range";
const DIR_LABEL: Record<IntervalDir, string> = { up: "Up", down: "Down", both: "Both" };

/**
 * The Sing an interval page: the plan's `interval-singer` tool on its own, with the voice, the intervals asked and their
 * direction picked above it. The voice is the one the other singing pages keep.
 */
export default function IntervalSingerApp({ lead }: { lead?: ReactNode }) {
  const [voice, setVoice] = useState<Voice>("tenor");
  const [intervals, setIntervals] = useState<number[]>(DEFAULT_INTERVALS);
  const [dir, setDir] = useState<IntervalDir>("up");
  useEffect(() => {
    let saved: Voice | null = null;
    try { saved = savedVoice(JSON.parse(window.localStorage.getItem(VOICE_KEY) ?? "null")); } catch { /* storage blocked */ }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring the saved voice after hydration
    if (saved) setVoice(saved);
  }, []);
  const pickVoice = (v: Voice) => {
    setVoice(v);
    try { window.localStorage.setItem(VOICE_KEY, JSON.stringify(v)); } catch { /* storage blocked */ }
  };
  // a chip is one more interval or one less, never none
  const toggle = (s: number) => setIntervals((xs) => (xs.includes(s) ? (xs.length > 1 ? xs.filter((x) => x !== s) : xs) : [...xs, s].sort((a, b) => a - b)));

  return (
    <div className="flex flex-col gap-4">
      {lead}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="uppercase tracking-wider text-slate-500">Voice</span>
          <Select size="sm" value={voice} onChange={pickVoice} aria-label="Voice"
            options={(Object.keys(VOICES) as Voice[]).map((v) => ({ value: v, label: `${VOICES[v].label} · ${midiToName(VOICES[v].low)}–${midiToName(VOICES[v].high)}` }))} />
        </span>
        <span className="flex items-center gap-1.5">
          <span className="uppercase tracking-wider text-slate-500">Direction</span>
          <Select size="sm" value={dir} onChange={setDir} aria-label="Direction" options={INTERVAL_DIRS.map((d) => ({ value: d, label: DIR_LABEL[d] }))} />
        </span>
        <span role="group" aria-label="Intervals" className="flex flex-wrap items-center gap-0.5">
          <span className="mr-1 uppercase tracking-wider text-slate-500">Intervals</span>
          {INTERVALS.filter((i) => i.semis >= 1 && i.semis <= 12).map((i) => (
            <button key={i.semis} type="button" aria-pressed={intervals.includes(i.semis)} onClick={() => toggle(i.semis)}
              title={intervals.includes(i.semis) ? (intervals.length > 1 ? `Leave out the ${i.name}` : "At least one interval") : `Ask the ${i.name} too`}
              className={`min-w-8 rounded-md px-1.5 py-1 transition ${intervals.includes(i.semis) ? "bg-sky-500/20 text-sky-100" : "text-slate-500 hover:text-slate-200"}`}>{i.short}</button>
          ))}
        </span>
      </div>
      <section className={panel}>
        <IntervalSinger key={voice} voice={voice} intervals={intervals} dir={dir} />
      </section>
    </div>
  );
}
