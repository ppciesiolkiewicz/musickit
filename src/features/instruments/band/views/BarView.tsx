"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import { Hint, Select, Slider, sbtn } from "@/components/ui";
import { useCoverage } from "@/features/guide/useCoverage";
import { useAudioFocus } from "@/features/sound";
import { useStepPart } from "@/components/practice/exerciseStep";
import { DRONE_MAX_OCTAVE, DRONE_MIN_OCTAVE, NOTE_NAMES } from "../../drone/drone";
import { MAX_BPM, MIN_BPM } from "../../jam/clock";
import { JAM_PARTS } from "../../jam/rig";
import BeatDots from "../../jam/BeatDots";
import type { BandPart } from "../config";
import type { ViewProps } from "./types";
import GrooveSelect from "./GrooveSelect";

const PARTS: { id: BandPart; label: string }[] = [
  { id: "click", label: "Click" },
  { id: "drone", label: "Drone" },
  { id: "drums", label: "Drums" },
  { id: "bass", label: "Bass" },
];

/**
 * The band folded to one line, for a plan exercise: a Play that starts only the chosen parts on one clock, a chip per part to
 * choose them (live while playing), the tempo and the key. "More" unfolds a tempo slider, the drone's octave, the groove and
 * the drum and bass patterns. The container restores and saves it (`musickit.practiceBand`) and hides "More" with `show.more`.
 */
export default function BarView({ band, config, show }: ViewProps) {
  useCoverage({ hints: 1 });
  const { rig, snap, start } = band;
  const parts = config.parts;
  const [chosen, setChosen] = useState<BandPart[]>(parts);
  const [open, setOpen] = useState(false);

  const jamParts = (list: BandPart[]) => JAM_PARTS.filter((p) => list.includes(p));
  const on = snap.click.on || JAM_PARTS.some((p) => snap.parts[p].state.playing);
  const play = async (list: BandPart[]) => {
    await start(jamParts(list));
    if (list.includes("click")) {
      rig.setClickMuted(false);
      rig.setClick(true);
    }
  };
  const stop = () => {
    rig.stop(JAM_PARTS);
    rig.setClick(false);
  };
  // in an exercise step, "Start exercise" plays the parts the band starts with
  const group = useStepPart({ kind: parts.includes("drone") ? "drone" : parts.includes("click") && parts.length === 1 ? "click" : "band", on, start: () => play(chosen), stop });
  const focus = useAudioFocus(on, stop, group);
  /** choose a part; while the band plays it joins or leaves on the next beat */
  const flip = (p: BandPart) => {
    const next = chosen.includes(p) ? chosen.filter((x) => x !== p) : [...chosen, p];
    setChosen(next);
    if (!on) return;
    if (p === "click") {
      if (next.includes(p)) void play([p]);
      else rig.setClick(false);
    } else if (next.includes(p)) void start([p]);
    else rig.stop([p]);
  };
  const drone = snap.parts.drone.state.drone;
  const more = show.more;

  return (
    <div ref={focus} className="rounded-xl border border-slate-800 bg-slate-950/40">
      <div className="flex flex-wrap items-center gap-2 px-2.5 py-2">
        <Hint title={on ? "Stop" : "Play"} description="Starts the parts that are lit, together on one beat.">
          <button type="button" data-tour="band-play" onClick={() => (on ? stop() : void play(chosen))} disabled={!on && !chosen.length} aria-pressed={on}
            className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition disabled:opacity-40 ${on ? "border-emerald-400/70 bg-emerald-500/20 text-emerald-100" : "border-sky-400/60 bg-sky-500/15 text-sky-50 hover:bg-sky-500/25"}`}>
            <Icon name={on ? "square" : "play"} size={14} fill />{on ? "Stop" : "Play"}
          </button>
        </Hint>
        {show.partChips && (
          <div data-tour="band-parts" className="flex flex-wrap gap-1" role="group" aria-label="Parts that play">
            {PARTS.map((p) => {
              const lit = chosen.includes(p.id);
              return (
                <button key={p.id} type="button" aria-pressed={lit} onClick={() => flip(p.id)}
                  className={`rounded-full border px-2.5 py-0.5 text-[11px] transition ${lit ? "border-sky-400/70 bg-sky-500/15 text-sky-100" : "border-slate-700 text-slate-500 hover:border-slate-500"}`}>
                  {p.label}
                </button>
              );
            })}
          </div>
        )}
        {show.tempo && (
          <span data-tour="band-tempo" className="flex items-center gap-1 text-xs text-slate-300">
            <button type="button" className={sbtn} disabled={snap.bpm <= MIN_BPM} onClick={() => rig.setTempo(snap.bpm - 1)} aria-label="Slower">−</button>
            <span className="w-14 text-center tabular-nums">{snap.bpm} <span className="text-[10px] text-slate-500">bpm</span></span>
            <button type="button" className={sbtn} disabled={snap.bpm >= MAX_BPM} onClick={() => rig.setTempo(snap.bpm + 1)} aria-label="Faster">+</button>
          </span>
        )}
        {show.beats && <BeatDots rig={rig} playing={on} />}
        {show.key && <span className="text-xs text-slate-400">Key <b className="text-violet-200">{NOTE_NAMES[drone.root]}</b></span>}
        {more && (
          <button type="button" data-tour="band-more" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="ml-auto inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-200">
            {open ? "Less" : "More"} <Icon name="chevron-down" size={12} className={open ? "rotate-180" : ""} />
          </button>
        )}
      </div>
      {more && open && (
        <div className="flex flex-col gap-2.5 border-t border-slate-800 px-3 py-2.5 text-xs text-slate-400">
          {show.tempoSlider && (
            <label className="flex items-center gap-2">
              <span className="w-14 shrink-0">Tempo</span>
              <Slider min={MIN_BPM} max={MAX_BPM} step={1} value={snap.bpm} onChange={(v) => rig.setTempo(v)} size="sm" className="max-w-72 flex-1" aria-label="Tempo" />
            </label>
          )}
          <div className="flex items-center gap-2">
            <span className="w-14 shrink-0">Drone</span>
            <button type="button" className={sbtn} disabled={drone.octave <= DRONE_MIN_OCTAVE} onClick={() => rig.setDrone({ octave: drone.octave - 1 })} aria-label="Octave down">−</button>
            <span className="w-10 text-center tabular-nums text-slate-200">{NOTE_NAMES[drone.root]}{drone.octave}</span>
            <button type="button" className={sbtn} disabled={drone.octave >= DRONE_MAX_OCTAVE} onClick={() => rig.setDrone({ octave: drone.octave + 1 })} aria-label="Octave up">+</button>
          </div>
          {show.groove && (
            <div className="flex items-center gap-2">
              <span className="w-14 shrink-0">Groove</span>
              <GrooveSelect rig={rig} value={snap.groove} />
            </div>
          )}
          {show.patterns && (["drums", "bass"] as const).map((p) => (
            <div key={p} className="flex items-center gap-2">
              <span className="w-14 shrink-0 capitalize">{p}</span>
              <Select size="sm" className="w-44" value="" onChange={(id) => id && rig.loadPreset(p, id)} aria-label={`${p} pattern`}
                options={[{ value: "", label: "Pattern…", disabled: true }, ...rig.instrument(p).presets.map((pr) => ({ value: pr.id, label: pr.name }))]} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
