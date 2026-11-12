"use client";

import { useEffect, useRef } from "react";
import Icon from "@/components/Icon";
import { NumberField } from "@/components/ui";
import DroneControls from "../../drone/DroneControls";
import { NOTE_NAMES, droneName } from "../../drone/drone";
import StepGrid, { PatternBar } from "../../sequencer/StepGrid";
import PartLevel, { MuteButton } from "../../sequencer/PartLevel";
import { MAX_BPM, MIN_BPM } from "../../jam/clock";
import { BEATS_PER_BAR, JAM_PARTS } from "../../jam/rig";
import BeatDots from "../../jam/BeatDots";
import GrooveSelect from "./GrooveSelect";
import { PART_TONE, PartCard, PlayButton, Title } from "./PartCard";
import type { ViewProps } from "./types";

/**
 * The whole band as a page (`/theory/metronome-drone`): a Play all / Stop all, then a card per part, the metronome first with the one
 * tempo. Each part starts and stops on its own, on the next beat, so they always line up; Play all starts whatever follows the rig too
 * (the page's loops), and Space toggles it outside text fields. The bass plays in the drone's key. Nothing sounds until a person presses
 * play (the browser needs that). `ready` is the host's (the rig's and its loops' audio); without it, the rig's.
 */
export default function FullView({ band, config, show, ready: hostReady }: ViewProps & { ready?: () => Promise<void> }) {
  const { rig, snap, start, toggle } = band;
  const ready = hostReady ?? band.ready;
  const has = (p: (typeof config.parts)[number]) => config.parts.includes(p);
  const parts = JAM_PARTS.filter(has);
  /** the metronome's own play: pressed to hear it, so it unmutes too */
  const toggleClick = async () => {
    if (snap.click.on) return rig.setClick(false);
    await ready();
    rig.setClickMuted(false);
    rig.setClick(true);
  };
  // any part or follower (a loop) on makes it a Stop all, so one started on its own can be stopped from here too
  const anyOn = snap.click.on || JAM_PARTS.some((p) => snap.parts[p].state.playing) || snap.followersOn;
  const toggleAll = () => {
    if (!anyOn) return void ready().then(() => start(parts, true));
    rig.setClick(false);
    rig.stop(JAM_PARTS, true);
  };
  const toggleAllRef = useRef(toggleAll);
  useEffect(() => {
    toggleAllRef.current = toggleAll;
  });
  useEffect(() => {
    // Space plays or stops everything, except while typing in a field
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(TEXTAREA|SELECT)$/.test(t.tagName) || (t.tagName === "INPUT" && !/^(range|checkbox|radio|button)$/.test((t as HTMLInputElement).type)))) return;
      e.preventDefault();
      toggleAllRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const drone = snap.parts.drone;
  const key = NOTE_NAMES[drone.state.drone.root];
  const droneHeader = (
    <>
      <PlayButton big tone={PART_TONE.drone} on={drone.state.playing} name="drone" onClick={() => toggle("drone")} />
      <span className="flex min-w-0 flex-1"><Title tone={PART_TONE.drone} view={drone}>Drone · {droneName(drone.state.drone)}</Title></span>
      {show.levels && <MuteButton name="drone" muted={drone.muted} onMute={(muted) => rig.setLevel("drone", { muted })} />}
    </>
  );

  return (
    <div className="flex min-w-0 flex-col gap-5 px-1 sm:gap-8 sm:px-2 lg:px-4">
      <div data-tour="jam-all" className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
        <button type="button" onClick={toggleAll} aria-pressed={anyOn} title={`${anyOn ? "Stop" : "Start"} every part on the next beat (Space)`}
          className={`inline-flex h-12 items-center gap-2.5 rounded-xl border px-5 text-base font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400 ${anyOn ? "border-emerald-400/70 bg-emerald-500/20 text-emerald-100" : "border-sky-400/60 bg-sky-500/15 text-sky-50 shadow-lg shadow-sky-500/10 hover:bg-sky-500/25"}`}>
          <Icon name={anyOn ? "square" : "play"} size={20} fill />{anyOn ? "Stop all" : "Play all"}
          <kbd className="hidden rounded border border-current/30 px-1.5 text-[10px] font-normal opacity-60 sm:inline">Space</kbd>
        </button>
        {show.key && (
          <span className="flex items-center gap-2 text-xs text-slate-400">
            {/* the parts' colours, in page order */}
            <span aria-hidden className="flex -space-x-1">
              {config.parts.map((p) => <span key={p} className={`h-3 w-3 rounded-full ring-2 ring-slate-900 ${PART_TONE[p].disc.split(" ")[0].replace("/15", "")}`} />)}
            </span>
            Key of <b className="font-semibold text-violet-200">{key}</b>, from the drone
          </span>
        )}
      </div>

      {has("click") && (
        <PartCard tone={PART_TONE.click} label="Metronome" tour="jam-metronome">
          <div className="flex flex-wrap items-center gap-3">
            <PlayButton big tone={PART_TONE.click} on={snap.click.on} name="metronome" onClick={() => void toggleClick()} />
            <div className="flex min-w-0 items-center gap-3">
              <span className={`hidden h-9 w-9 shrink-0 place-items-center rounded-xl sm:grid ${PART_TONE.click.disc}`}><Icon name="metronome" size={18} /></span>
              <span className="min-w-0">
                <p className="text-lg font-light text-slate-50">Metronome</p>
                <p className={`text-xs ${snap.click.running && !snap.click.muted ? "text-emerald-300" : "text-slate-400"}`}>
                  {snap.click.running ? (snap.click.muted ? "Keeping time, muted" : "Playing") : "Stopped"}
                </p>
              </span>
            </div>
            {show.beats && <BeatDots big rig={rig} playing={snap.click.running} />}
            {/* the one tempo for every part, beside the click that keeps it */}
            {(show.tempo || show.tempoSlider) && (
              <label className="order-last flex w-full min-w-0 items-center gap-2 text-xs text-slate-300 sm:order-none sm:w-auto sm:max-w-md sm:flex-1" title={snap.tempoLocked ? "Clear the loops to change the tempo" : undefined}>
                <span className="shrink-0">Tempo</span>
                {show.tempoSlider && <input type="range" className="min-w-0 flex-1 accent-sky-400 disabled:opacity-40" min={MIN_BPM} max={MAX_BPM} step={1} value={snap.bpm} disabled={snap.tempoLocked} onChange={(e) => rig.setTempo(Number(e.target.value))} />}
                {show.tempo && <span className="flex w-20 shrink-0 items-baseline justify-end gap-1 whitespace-nowrap text-slate-400"><NumberField value={snap.bpm} min={MIN_BPM} max={MAX_BPM} disabled={snap.tempoLocked} onCommit={(bpm) => rig.setTempo(bpm)} aria-label="Tempo in beats per minute" title={snap.tempoLocked ? undefined : "Type a tempo"} className="w-10 py-0.5 text-sm text-slate-100" />BPM</span>}
              </label>
            )}
            <span className="ml-auto" />
            {show.levels && <PartLevel name="metronome" volume={snap.click.volume} muted={snap.click.muted} onVolume={(v) => rig.setClickVolume(v)} onMute={(m) => rig.setClickMuted(m)} />}
          </div>
        </PartCard>
      )}

      {has("drone") && (
        <PartCard tone={PART_TONE.drone} label="Drone" tour="jam-drone">
          {show.droneSound
            ? <DroneControls value={drone.state.drone} onChange={(patch) => rig.setDrone(patch)} playing={drone.running} analyser={drone.running ? rig.droneAnalyser() : null} header={droneHeader} />
            : <div className="flex flex-wrap items-center gap-3">{droneHeader}</div>}
        </PartCard>
      )}

      {(["drums", "bass"] as const).filter(has).map((p) => {
        const v = snap.parts[p];
        const inst = rig.instrument(p);
        const leading = (
          <>
            <PlayButton tone={PART_TONE[p]} on={v.state.playing} name={inst.name.toLowerCase()} onClick={() => toggle(p)} />
            <Title tone={PART_TONE[p]} view={v}>{p === "bass" ? `${inst.name} · ${key} minor pentatonic` : inst.name}</Title>
            {p === "drums" && show.groove && <GrooveSelect rig={rig} value={snap.groove} />}
          </>
        );
        const trailing = show.levels ? <PartLevel name={inst.name.toLowerCase()} volume={v.volume} muted={v.muted} onVolume={(volume) => rig.setLevel(p, { volume })} onMute={(muted) => rig.setLevel(p, { muted })} /> : null;
        return (
          <PartCard key={p} tone={PART_TONE[p]} label={inst.name} tour={p === "drums" ? "jam-band" : undefined}>
            {show.patterns ? (
              <>
                <PatternBar instrument={inst} cells={v.state.cells} bars={v.state.bars} onPreset={(id) => rig.loadPreset(p, id)} onBars={(b) => rig.setBars(p, b)} onClear={() => rig.clear(p)} leading={leading} trailing={trailing} />
                <StepGrid instrument={inst} cells={v.state.cells} steps={v.steps} beatsPerBar={BEATS_PER_BAR} musicKey={p === "bass" ? drone.state.drone.root : undefined} position={() => rig.position(p)} onStep={(l, s, val) => rig.setStep(p, l, s, val)} fit />
              </>
            ) : (
              <div className="flex flex-wrap items-center gap-1.5">{leading}{trailing}</div>
            )}
          </PartCard>
        );
      })}
    </div>
  );
}
