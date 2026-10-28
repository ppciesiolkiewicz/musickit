"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import { Select, Slider, sbtn } from "@/components/ui";
import { DRONE_MAX_OCTAVE, DRONE_MIN_OCTAVE, NOTE_NAMES } from "../drone/drone";
import { MAX_BPM, MIN_BPM } from "../jam/clock";
import { JAM_PARTS, type JamPart, type JamRig } from "../jam/rig";
import useJamRig from "../jam/useJamRig";
import BeatDots from "../jam/BeatDots";

export type BandPart = "click" | JamPart;
const PARTS: { id: BandPart; label: string }[] = [
  { id: "click", label: "Click" },
  { id: "drone", label: "Drone" },
  { id: "drums", label: "Drums" },
  { id: "bass", label: "Bass" },
];

/**
 * A play-along band set up by its host (an exercise): tempo, key and which parts play. Folded, it is one line: a Play that
 * starts only the chosen parts on one clock, a chip per part to choose them (live while playing), the tempo and the key.
 * Unfolded: a tempo slider, the drone's octave and the drum and bass patterns. Its own `JamRig` through `useJamRig`; the
 * host's setup wins over anything saved, so every exercise opens the way it was written.
 */
export default function PracticeBand({ bpm, keyPc, parts }: { bpm: number; keyPc: number; parts: BandPart[] }) {
  const restore = (rig: JamRig) => {
    rig.setTempo(Math.min(MAX_BPM, Math.max(MIN_BPM, bpm)));
    rig.setDrone({ root: keyPc });
  };
  const { rig, snap, start } = useJamRig({ storageKey: "musickit.practiceBand", restore });
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

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/40">
      <div className="flex flex-wrap items-center gap-2 px-2.5 py-2">
        <button type="button" onClick={() => (on ? stop() : void play(chosen))} disabled={!on && !chosen.length} aria-pressed={on}
          className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition disabled:opacity-40 ${on ? "border-emerald-400/70 bg-emerald-500/20 text-emerald-100" : "border-sky-400/60 bg-sky-500/15 text-sky-50 hover:bg-sky-500/25"}`}>
          <Icon name={on ? "square" : "play"} size={14} fill />{on ? "Stop" : "Play"}
        </button>
        <div className="flex flex-wrap gap-1" role="group" aria-label="Parts that play">
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
        <span className="flex items-center gap-1 text-xs text-slate-300">
          <button type="button" className={sbtn} disabled={snap.bpm <= MIN_BPM} onClick={() => rig.setTempo(snap.bpm - 1)} aria-label="Slower">−</button>
          <span className="w-14 text-center tabular-nums">{snap.bpm} <span className="text-[10px] text-slate-500">bpm</span></span>
          <button type="button" className={sbtn} disabled={snap.bpm >= MAX_BPM} onClick={() => rig.setTempo(snap.bpm + 1)} aria-label="Faster">+</button>
        </span>
        <BeatDots rig={rig} playing={on} />
        <span className="text-xs text-slate-400">Key <b className="text-violet-200">{NOTE_NAMES[drone.root]}</b></span>
        <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="ml-auto inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-200">
          {open ? "Less" : "More"} <Icon name="chevron-down" size={12} className={open ? "rotate-180" : ""} />
        </button>
      </div>
      {open && (
        <div className="flex flex-col gap-2.5 border-t border-slate-800 px-3 py-2.5 text-xs text-slate-400">
          <label className="flex items-center gap-2">
            <span className="w-14 shrink-0">Tempo</span>
            <Slider min={MIN_BPM} max={MAX_BPM} step={1} value={snap.bpm} onChange={(v) => rig.setTempo(v)} size="sm" className="max-w-72 flex-1" aria-label="Tempo" />
          </label>
          <div className="flex items-center gap-2">
            <span className="w-14 shrink-0">Drone</span>
            <button type="button" className={sbtn} disabled={drone.octave <= DRONE_MIN_OCTAVE} onClick={() => rig.setDrone({ octave: drone.octave - 1 })} aria-label="Octave down">−</button>
            <span className="w-10 text-center tabular-nums text-slate-200">{NOTE_NAMES[drone.root]}{drone.octave}</span>
            <button type="button" className={sbtn} disabled={drone.octave >= DRONE_MAX_OCTAVE} onClick={() => rig.setDrone({ octave: drone.octave + 1 })} aria-label="Octave up">+</button>
          </div>
          {(["drums", "bass"] as const).map((p) => (
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
