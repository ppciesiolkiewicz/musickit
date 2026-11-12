"use client";

import { useEffect, useRef, type ReactNode } from "react";
import Icon from "@/components/Icon";
import { tapTempo } from "../../click/click";
import { DEFAULT_DRONE, DRONE_MAX_OCTAVE, DRONE_MIN_OCTAVE, NOTE_NAMES, droneName } from "../../drone/drone";
import DroneControls from "../../drone/DroneControls";
import StepGrid, { PatternBar } from "../../sequencer/StepGrid";
import PartLevel, { MuteButton } from "../../sequencer/PartLevel";
import { MAX_BPM, MIN_BPM } from "../../jam/clock";
import { BEATS_PER_BAR, JAM_PARTS, type JamPart } from "../../jam/rig";
import BeatDots from "../../jam/BeatDots";
import { NumberField, Select, Slider } from "@/components/ui";
import GrooveSelect from "./GrooveSelect";
import { POCKET_BUTTON as ibtn, PocketLine as Tool, PlayButton, Popover, typing, type PocketStatus } from "./pocketParts";
import type { Band, ViewProps } from "./types";

/** What a host of the pocket view adds: its layout, the click it keeps time by, its status and its own lines. */
export interface PocketProps {
  /** one line per tool at every width, for a narrow side column */
  stacked?: boolean;
  /** the click starts, muted, on the first press anywhere on the page (audio can't start before one), for a host that keeps time by it */
  clickAlways?: boolean;
  onStatus?: (s: PocketStatus) => void;
  /** the host's own lines (each a `PocketLine`), under the drone: the scales pages' Input */
  lines?: ReactNode;
  className?: string;
}

/** The drone's line: play, mute, octave, and its full `DroneControls` behind the sliders button; the volume on a slider under them. */
function DroneLine({ band, keyPc, levels, sound, onToggle }: { band: Band; keyPc: number; levels: boolean; sound: boolean; onToggle: () => void }) {
  const { rig, snap } = band;
  const drone = snap.parts.drone.state.drone;
  return (
    <Tool label="Drone">
      {/* two lines, as the click's: its buttons, then the volume on a slider under them */}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex min-w-0 flex-wrap items-center gap-1">
          <PlayButton on={snap.parts.drone.state.playing} label="drone" onClick={onToggle} />
          {levels && <MuteButton className={ibtn} name="drone" muted={snap.parts.drone.muted} onMute={(muted) => rig.setLevel("drone", { muted })} />}
          <button type="button" className={ibtn} disabled={drone.octave <= DRONE_MIN_OCTAVE} onClick={() => rig.setDrone({ octave: drone.octave - 1 })} aria-label="Octave down">−</button>
          <span className="w-12 shrink-0 text-center text-xs tabular-nums text-slate-100" aria-live="polite" title="The drone plays the key's note (another note in the sound panel)">{droneName(drone)}</span>
          <button type="button" className={ibtn} disabled={drone.octave >= DRONE_MAX_OCTAVE} onClick={() => rig.setDrone({ octave: drone.octave + 1 })} aria-label="Octave up">+</button>
          {sound && (
            <Popover label="Drone sound" wide>
              {/* Reset hands back DEFAULT_DRONE: keep the key's note rather than its E */}
              <DroneControls value={drone} onChange={(p) => rig.setDrone(p === DEFAULT_DRONE ? { ...p, root: keyPc } : p)} playing={snap.parts.drone.running} analyser={snap.parts.drone.running ? rig.droneAnalyser() : null}
                header={<p className="text-[11px] text-slate-500">The note moves to the page&apos;s key whenever the key changes.</p>} />
            </Popover>
          )}
        </div>
        <label className="flex min-w-0 items-center gap-2 text-[11px] text-slate-500">
          <span className="shrink-0">Volume</span>
          <Slider min={0} max={1} step={0.01} value={drone.level} onChange={(level) => rig.setDrone({ level })} size="sm" className="w-full max-w-64 px-1" aria-label="Drone volume" title="Drone volume" />
        </label>
      </div>
    </Tool>
  );
}

/** A drums or bass line: play, mute, a pattern pick, and the groove (drums), pattern bar and step grid behind the sliders button. */
function SequencerLine({ band, p, label, show, onToggle }: { band: Band; p: "drums" | "bass"; label: string; show: ViewProps["show"]; onToggle: () => void }) {
  const { rig, snap } = band;
  const drone = snap.parts.drone.state.drone;
  const v = snap.parts[p];
  const inst = rig.instrument(p);
  return (
    <Tool label={label}>
      <PlayButton on={v.state.playing} label={label.toLowerCase()} onClick={onToggle} />
      {show.levels && <MuteButton className={ibtn} name={label.toLowerCase()} muted={v.muted} onMute={(muted) => rig.setLevel(p, { muted })} />}
      {show.patterns && (
        <Select
          size="sm"
          className="w-28 min-w-20 sm:w-43"
          value=""
          onChange={(id) => id && rig.loadPreset(p, id)}
          aria-label={`${label} pattern`}
          options={[{ value: "", label: "Pattern…", disabled: true }, ...inst.presets.map((pr) => ({ value: pr.id, label: pr.name }))]}
        />
      )}
      {(show.patterns || (p === "drums" && show.groove)) && (
        <Popover label={`${label} pattern`} wide>
          <div className="flex flex-col gap-3">
            {p === "drums" && show.groove && (
              <label className="flex items-center gap-2">
                <span className="shrink-0">Groove</span>
                <GrooveSelect rig={rig} value={snap.groove} />
              </label>
            )}
            {show.patterns && <>
              <PatternBar instrument={inst} bars={v.state.bars} onPreset={(id) => rig.loadPreset(p, id)} onBars={(b) => rig.setBars(p, b)} onClear={() => rig.clear(p)}
                leading={<p className="mr-auto text-[11px] text-slate-500">{p === "bass" ? `${NOTE_NAMES[drone.root]} minor pentatonic, in the drone's key` : "Click a step for on, again for an accent"}</p>}
                trailing={show.levels ? <PartLevel name={label.toLowerCase()} volume={v.volume} muted={v.muted} onVolume={(volume) => rig.setLevel(p, { volume })} onMute={(muted) => rig.setLevel(p, { muted })} /> : null} />
              <StepGrid instrument={inst} cells={v.state.cells} steps={v.steps} beatsPerBar={BEATS_PER_BAR} musicKey={p === "bass" ? drone.root : undefined} position={() => rig.position(p)} onStep={(l, s, val) => rig.setStep(p, l, s, val)} fit />
            </>}
          </div>
        </Popover>
      )}
    </Tool>
  );
}

/**
 * The band in a page's settings bar: a tall Play all, then one line per part in `config.parts` (click, drone, drums, bass) with play,
 * the few controls you reach for and a panel behind the sliders button for the rest (the drone's full `DroneControls`, the step grids
 * and the groove). Play all starts the config's parts on the next beat. Space stops what plays, and brings it back when pressed again;
 * outside that it leaves Space to the page. The drone (and with it the bass) follows `config.keyPc` live.
 */
export default function PocketView({ band, config, show, pocket = {} }: ViewProps & { pocket?: PocketProps }) {
  const { stacked = false, clickAlways = false, onStatus, lines, className = "" } = pocket;
  const { rig, snap, restored, ready, start, toggle: togglePart } = band;
  const keyPc = config.keyPc ?? DEFAULT_DRONE.root;
  const has = (p: (typeof config.parts)[number]) => config.parts.includes(p);
  const parts = JAM_PARTS.filter(has);
  const taps = useRef<number[]>([]);
  /** what Space stopped, to bring back on the next Space */
  const paused = useRef<{ parts: JamPart[]; click: boolean } | null>(null);

  // the drone, and so the bass, sits on the page's key
  useEffect(() => {
    if (config.keyPc !== undefined) rig.setDrone({ root: config.keyPc });
  }, [rig, config.keyPc, restored]);

  const playingParts = JAM_PARTS.filter((p) => snap.parts[p].state.playing);
  const anyOn = playingParts.length > 0 || snap.click.on;

  const play = async (ps: readonly JamPart[], click: boolean) => {
    await start(ps);
    if (click) rig.setClick(true);
  };
  const stopAll = () => {
    rig.stop(JAM_PARTS);
    rig.setClick(false);
  };
  const toggle = (p: JamPart) => {
    paused.current = null;
    togglePart(p);
  };
  const toggleClick = () => {
    paused.current = null;
    if (snap.click.on) rig.setClick(false);
    else void play([], true);
  };
  // the click running, muted; it keeps the grid for the host without being heard
  const quietClick = async () => {
    await ready();
    if (rig.snapshot().click.on) return;
    rig.setClickMuted(true);
    rig.setClick(true);
  };
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!clickAlways) return;
    // a press on the tools themselves is theirs (the click's own play would undo it)
    const down = (e: Event) => {
      if (root.current?.contains(e.target as Node)) return;
      window.removeEventListener("pointerdown", down, true);
      window.removeEventListener("keydown", down, true);
      void quietClick();
    };
    window.addEventListener("pointerdown", down, true);
    window.addEventListener("keydown", down, true);
    return () => {
      window.removeEventListener("pointerdown", down, true);
      window.removeEventListener("keydown", down, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per page, on the first press
  }, [clickAlways, rig]);
  const toggleAll = () => {
    paused.current = null;
    if (anyOn) stopAll();
    else void play(parts, has("click"));
  };

  // Space: stop what plays and remember it; the next Space brings it back
  const space = useRef(() => {});
  useEffect(() => {
    space.current = () => {
      if (anyOn) {
        paused.current = { parts: playingParts, click: snap.click.on };
        stopAll();
      } else if (paused.current) {
        const { parts: ps, click } = paused.current;
        paused.current = null;
        void play(ps, click);
      }
    };
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.repeat || e.metaKey || e.ctrlKey || e.altKey || typing(e.target)) return;
      if (!rig.attached) return;
      const was = rig.snapshot();
      if (!paused.current && !JAM_PARTS.some((p) => was.parts[p].state.playing) && !was.click.on) return;
      e.preventDefault();
      space.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [rig]);

  const droneLabel = droneName(snap.parts.drone.state.drone);
  const playingKey = [...(snap.click.on ? ["click"] : []), ...playingParts].join(",");
  const heard = snap.click.on && !snap.click.muted;
  useEffect(() => {
    onStatus?.({ bpm: snap.bpm, drone: droneLabel, playing: playingKey ? playingKey.split(",") : [], heard, nextBeat: () => rig.nextBeatAt(), gridBeats: () => rig.gridBeats(),
      restart: async (from = 0) => {
        await quietClick();
        return rig.restart(0.1, from);
      },
      hear: (on) => {
        paused.current = null;
        rig.setClickMuted(!on);
        if (on && !rig.snapshot().click.on) void play([], true);
      },
      setTempo: (bpm) => rig.setTempo(bpm) });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- quietClick and play only read the rig
  }, [onStatus, rig, snap.bpm, droneLabel, playingKey, heard]);

  const tap = () => {
    const now = performance.now() / 1000;
    taps.current = [...taps.current.filter((t) => now - t < 3), now];
    const bpm = tapTempo(taps.current);
    if (bpm) rig.setTempo(bpm);
  };


  return (
    <div ref={root} data-tour="pocket-tools" className={`flex min-w-0 items-stretch gap-2 ${stacked ? "lg:flex-col lg:gap-4" : ""} ${className}`}>
      <button type="button" onClick={toggleAll} aria-pressed={anyOn} title={`${anyOn ? "Stop" : "Start"} everything on the next beat (Space stops and brings back)`}
        className={`flex w-12 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border ${stacked ? "lg:w-full lg:flex-row lg:gap-2 lg:py-2" : ""} text-[10px] font-medium uppercase tracking-wider transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400 ${anyOn ? "border-emerald-400/70 bg-emerald-500/20 text-emerald-100" : "border-slate-700 bg-slate-900 text-slate-200 hover:border-slate-500"}`}>
        <Icon name={anyOn ? "square" : "play"} size={18} fill />
        {anyOn ? "Stop" : "All"}
      </button>

      <div className={`grid min-w-0 flex-1 gap-x-3 gap-y-2.5 ${stacked ? "md:grid-cols-2 lg:grid-cols-1" : "md:grid-cols-2 xl:grid-cols-1"}`}>
        {has("click") && (
          <Tool label="Click">
            {/* two lines: the click's buttons, then the tempo on a slider under them */}
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <div className="flex min-w-0 items-center gap-1">
                <PlayButton on={snap.click.on} label="metronome" onClick={toggleClick} />
                {show.levels && <MuteButton className={ibtn} name="metronome" muted={snap.click.muted} onMute={(m) => rig.setClickMuted(m)} />}
                {show.tempo && <>
                  <button type="button" className={ibtn} disabled={snap.bpm <= MIN_BPM} onClick={() => rig.setTempo(snap.bpm - 1)} aria-label="Slower">−</button>
                  <span className="flex w-14 shrink-0 items-baseline justify-center whitespace-nowrap text-xs text-slate-100"><NumberField value={snap.bpm} min={MIN_BPM} max={MAX_BPM} onCommit={(bpm) => rig.setTempo(bpm)} aria-label="Tempo in beats per minute" title="Type a tempo" className="w-8 py-0.5" /><span className="text-[10px] text-slate-500">bpm</span></span>
                  <button type="button" className={ibtn} disabled={snap.bpm >= MAX_BPM} onClick={() => rig.setTempo(snap.bpm + 1)} aria-label="Faster">+</button>
                </>}
                {show.beats && <BeatDots rig={rig} playing={anyOn} />}
                <Popover label="Tempo and click">
                  <div className="flex flex-col gap-2.5">
                    <label className="flex items-center gap-2">
                      <span className="w-14 shrink-0">Tempo</span>
                      <Slider min={MIN_BPM} max={MAX_BPM} step={1} value={snap.bpm} onChange={(bpm) => rig.setTempo(bpm)} className="flex-1" aria-label="Tempo" />
                      <NumberField value={snap.bpm} min={MIN_BPM} max={MAX_BPM} onCommit={(bpm) => rig.setTempo(bpm)} aria-label="Tempo in beats per minute" className="w-10 py-0.5 text-slate-200" />
                    </label>
                    <label className="flex items-center gap-2">
                      <span className="w-14 shrink-0">Click</span>
                      <Slider min={0} max={1} step={0.01} value={snap.click.volume} onChange={(v) => rig.setClickVolume(v)} className="flex-1" aria-label="Click volume" />
                    </label>
                    <button type="button" className={`${ibtn} h-9 w-full text-sm`} onClick={tap} title="Tap a few times in time to set the tempo">Tap tempo</button>
                    <p className="text-[11px] text-slate-500">One tempo for the click, drone, drums and bass.</p>
                  </div>
                </Popover>
              </div>
              {show.tempoSlider && (
                <label className="flex min-w-0 items-center gap-2 text-[11px] text-slate-500">
                  <span className="shrink-0">Tempo</span>
                  <Slider min={MIN_BPM} max={MAX_BPM} step={1} value={snap.bpm} onChange={(bpm) => rig.setTempo(bpm)} size="sm" className="w-full max-w-64 px-1" aria-label="Tempo" title={`${snap.bpm} bpm`} />
                </label>
              )}
            </div>
          </Tool>
        )}
        {has("drone") && <>
          {has("click") && <div role="separator" className="col-span-full border-t border-slate-800" />}
          <DroneLine band={band} onToggle={() => toggle("drone")} keyPc={keyPc} levels={show.levels} sound={show.droneSound} />
        </>}
        {lines}

        {has("drums") && <SequencerLine band={band} p="drums" label="Drums" show={show} onToggle={() => toggle("drums")} />}
        {has("bass") && <SequencerLine band={band} p="bass" label="Bass" show={show} onToggle={() => toggle("bass")} />}
      </div>
    </div>
  );
}
