"use client";

import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Icon from "@/components/Icon";
import usePhone from "@/components/usePhone";
import { getAudioContext, getOutputBus, wakeAudio } from "@/features/sound";
import { tapTempo, type ClickParams } from "../click/click";
import { DEFAULT_DRONE, DRONE_MAX_OCTAVE, DRONE_MIN_OCTAVE, NOTE_NAMES, droneName, type DroneParams } from "../drone/drone";
import DroneControls from "../drone/DroneControls";
import StepGrid, { PatternBar } from "../sequencer/StepGrid";
import PartLevel from "../sequencer/PartLevel";
import { MAX_BPM, MIN_BPM } from "../jam/clock";
import { BEATS_PER_BAR, JAM_PARTS, JamRig, type JamPart, type JamSaved } from "../jam/rig";
import { NumberField, Select, Slider, inSelectMenu } from "@/components/ui";

const STORAGE_KEY = "musickit.pocket";
const ibtn = "grid h-7 min-w-7 shrink-0 place-items-center rounded-md border border-slate-700 bg-slate-900 px-1 text-xs text-slate-200 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400";
const lit = "!border-emerald-400/70 !bg-emerald-500/20 !text-emerald-100";

/** The first save held only a drone and a click; read it so those settings are not lost. */
type OldSave = { click?: Partial<ClickParams>; drone?: Partial<DroneParams> };

function restore(rig: JamRig) {
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null") as (Partial<JamSaved> & OldSave) | null;
    if (!saved || typeof saved !== "object") return;
    if (saved.parts) return rig.load(saved);
    if (saved.drone) rig.loadDrone(saved.drone);
    if (typeof saved.click?.bpm === "number") rig.setTempo(saved.click.bpm);
    if (typeof saved.click?.volume === "number") rig.setClickVolume(saved.click.volume);
  } catch {
    /* storage blocked or a broken save: start fresh */
  }
}

/** Space in a text field types a space; everywhere else it is ours. */
const typing = (t: EventTarget | null) => {
  const el = t as HTMLElement | null;
  return !!el && (el.isContentEditable || /^(TEXTAREA|SELECT)$/.test(el.tagName) || (el.tagName === "INPUT" && !/^(range|checkbox|radio|button)$/.test((el as HTMLInputElement).type)));
};

/** A sliders button with a panel under it (a full-screen sheet on a phone); closes on a click outside or Escape. */
function Popover({ label, wide, children }: { label: string; wide?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const sheet = useRef<HTMLDivElement>(null);
  const phone = usePhone();
  const [place, setPlace] = useState<CSSProperties | null>(null);
  // Under the button, right edges aligned, as tall as the screen allows; above it when there is more room there.
  useLayoutEffect(() => {
    if (!open || phone) return;
    const update = () => {
      const r = wrap.current?.getBoundingClientRect();
      if (!r) return;
      const gap = 6, edge = 12;
      const below = window.innerHeight - r.bottom - gap - edge;
      const above = r.top - gap - edge;
      const right = Math.max(edge, window.innerWidth - r.right);
      setPlace(below >= 320 || below >= above
        ? { top: r.bottom + gap, right, maxHeight: below }
        : { bottom: window.innerHeight - r.top + gap, right, maxHeight: above });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, phone]);
  useEffect(() => {
    if (!open) return;
    const down = (e: PointerEvent) => !inSelectMenu(e.target) && !wrap.current?.contains(e.target as Node) && !sheet.current?.contains(e.target as Node) && setOpen(false);
    const key = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("pointerdown", down);
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("keydown", key);
    };
  }, [open]);
  return (
    <div ref={wrap} className="relative shrink-0">
      <button type="button" className={`${ibtn} ${open ? "!border-sky-400 !text-sky-200" : ""}`} aria-expanded={open} aria-haspopup="dialog" onClick={() => setOpen((v) => !v)} title={label} aria-label={label}>
        <Icon name="sliders-horizontal" size={14} />
      </button>
      {open && phone && createPortal(
        // portalled: the settings bar it sits in is blurred, which would trap a fixed panel inside it
        <div ref={sheet} role="dialog" aria-modal="true" aria-label={label} className="fixed inset-0 z-[2000] overflow-y-auto overscroll-contain bg-slate-950 p-3 text-xs text-slate-300">
          <div className="mb-3 flex items-center gap-2">
            <h2 className="text-sm font-medium text-slate-100">{label}</h2>
            <button type="button" onClick={() => setOpen(false)} className="ml-auto rounded-md border border-slate-700 px-2.5 py-1 text-xs text-slate-300 hover:border-slate-500">Close ✕</button>
          </div>
          {children}
        </div>,
        document.body,
      )}
      {open && !phone && place && createPortal(
        // portalled and fixed: hung off the sticky bar, a tall panel ran past the bottom of the screen where no page scroll could reach it
        <div ref={sheet} role="dialog" aria-label={label} style={place}
          className={`fixed z-[1000] overflow-y-auto overscroll-contain rounded-xl border border-slate-700 bg-slate-950 p-3 text-xs text-slate-300 shadow-2xl shadow-black/60 ${wide ? "w-xl" : "w-64"} max-w-[calc(100vw-1.5rem)]`}>
          <h2 className="mb-3 text-sm font-medium text-slate-100">{label}</h2>
          {children}
        </div>,
        document.body,
      )}
    </div>
  );
}

function PlayButton({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) {
  return (
    <button type="button" className={`${ibtn} ${on ? lit : ""}`} aria-pressed={on} onClick={onClick} title={on ? `Stop the ${label} on the next beat` : `Start the ${label} on the next beat`} aria-label={on ? `Stop the ${label}` : `Play the ${label}`}>
      <Icon name={on ? "square" : "play"} fill size={12} />
    </button>
  );
}

function MuteButton({ muted, label, onClick }: { muted: boolean; label: string; onClick: () => void }) {
  return (
    <button type="button" className={`${ibtn} ${muted ? "!border-amber-400/60 !text-amber-200" : ""}`} aria-pressed={muted} onClick={onClick} title={muted ? `Unmute the ${label} (it keeps time either way)` : `Mute the ${label} (it keeps time)`} aria-label={muted ? `Unmute the ${label}` : `Mute the ${label}`}>
      <Icon name={muted ? "volume-x" : "volume-2"} size={14} />
    </button>
  );
}

/** One tool on one line: a small label, then its controls. */
function Tool({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="group" aria-label={label} className="flex min-w-0 items-center gap-1">
      <span className="w-12 shrink-0 text-[11px] uppercase tracking-wider text-slate-500 sm:w-16">{label}</span>
      {children}
    </div>
  );
}

/** One dot per beat of the shared grid, the current one lit and beat 1 amber; read every frame, so React does not re-render. */
function BeatDots({ rig, playing }: { rig: JamRig; playing: boolean }) {
  const refs = useRef<(HTMLSpanElement | null)[]>([]);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const b = playing ? rig.beatNow() : null;
      refs.current.forEach((el, i) => {
        if (!el) return;
        el.style.opacity = b === i ? "1" : "0.3";
        el.style.transform = b === i ? "scale(1.3)" : "scale(1)";
      });
      if (playing) raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [rig, playing]);
  return (
    <span className="hidden w-14 shrink-0 items-center justify-center gap-1 sm:flex" aria-hidden>
      {Array.from({ length: BEATS_PER_BAR }, (_, i) => (
        <span key={i} ref={(el) => { refs.current[i] = el; }} className={`h-2 w-2 rounded-full opacity-30 transition-transform duration-75 ${i === 0 ? "bg-amber-400" : "bg-sky-400"}`} />
      ))}
    </span>
  );
}

/**
 * A small play-along band for a page's settings bar: metronome, drone, drums and bass on one clock (the Jam's `JamRig`), each on one
 * line with play, the few controls you reach for and a panel behind the sliders button for the rest (the drone's full `DroneControls`,
 * the sequencers' step grids). Play all starts everything on the next beat. Space stops what plays, and brings it back when pressed
 * again; outside that it leaves Space to the page. The drone (and with it the bass) sits on `keyPc`. Owns its audio, made on the
 * first click; saved in localStorage `musickit.pocket` (settings only; nothing plays on load).
 */
/**
 * What the pocket tools are doing, for a host to show in its header: the tempo, the drone's note and which parts play;
 * `nextBeat` is when the grid's next beat sounds (AudioContext time), or null when nothing keeps it, for a host to play on the click;
 * `gridBeats` is the beats since the grid's beat 1 (null when nothing keeps it), for a host's bar to ride the click; `restart` starts
 * the grid over on beat 1 shortly, the click with it (muted if it was not playing), and resolves to when beat 1 sounds (AudioContext time).
 */
export type PocketStatus = { bpm: number; drone: string; playing: string[]; nextBeat: () => number | null; gridBeats: () => number | null; restart: () => Promise<number | null> };

export default function PocketTools({ keyPc, className = "", stacked = false, clickAlways = false, onStatus }: {
  keyPc: number;
  className?: string;
  /** one line per tool at every width, for a narrow side column */
  stacked?: boolean;
  /** the click starts, muted, on the first press anywhere on the page (audio can't start before one), for a host that keeps time by it */
  clickAlways?: boolean;
  onStatus?: (s: PocketStatus) => void;
}) {
  const [rig] = useState(() => new JamRig());
  const snap = useSyncExternalStore(rig.subscribe, rig.snapshot, rig.snapshot);
  const [restored, setRestored] = useState(false);
  const taps = useRef<number[]>([]);
  /** what Space stopped, to bring back on the next Space */
  const paused = useRef<{ parts: JamPart[]; click: boolean } | null>(null);

  useEffect(() => {
    restore(rig);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- saving starts once the save is back (after hydration)
    setRestored(true);
    return () => rig.dispose();
  }, [rig]);
  useEffect(() => {
    if (!restored) return;
    try {
      // no loops here: keep the save to the parts, tempo and click
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...rig.save(), loops: undefined }));
    } catch {
      /* private mode */
    }
  }, [rig, snap, restored]);

  // the drone, and so the bass, sits on the page's key
  useEffect(() => rig.setDrone({ root: keyPc }), [rig, keyPc, restored]);

  const ready = async () => {
    const ctx = getAudioContext();
    await wakeAudio();
    rig.attach(ctx, getOutputBus());
  };
  const playingParts = JAM_PARTS.filter((p) => snap.parts[p].state.playing);
  const anyOn = playingParts.length > 0 || snap.click.on;

  const play = async (parts: readonly JamPart[], click: boolean) => {
    await ready();
    rig.start(parts);
    if (click) rig.setClick(true);
  };
  const stopAll = () => {
    rig.stop(JAM_PARTS);
    rig.setClick(false);
  };
  const toggle = (p: JamPart) => {
    paused.current = null;
    if (snap.parts[p].state.playing) rig.stop([p]);
    else void play([p], false);
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
    else void play(JAM_PARTS, true);
  };

  // Space: stop what plays and remember it; the next Space brings it back
  const space = useRef(() => {});
  useEffect(() => {
    space.current = () => {
      if (anyOn) {
        paused.current = { parts: playingParts, click: snap.click.on };
        stopAll();
      } else if (paused.current) {
        const { parts, click } = paused.current;
        paused.current = null;
        void play(parts, click);
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
  useEffect(() => {
    onStatus?.({ bpm: snap.bpm, drone: droneLabel, playing: playingKey ? playingKey.split(",") : [], nextBeat: () => rig.nextBeatAt(), gridBeats: () => rig.gridBeats(),
      restart: async () => {
        await quietClick();
        return rig.restart();
      } });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- quietClick only reads the rig
  }, [onStatus, rig, snap.bpm, droneLabel, playingKey]);

  const tap = () => {
    const now = performance.now() / 1000;
    taps.current = [...taps.current.filter((t) => now - t < 3), now];
    const bpm = tapTempo(taps.current);
    if (bpm) rig.setTempo(bpm);
  };

  const drone = snap.parts.drone.state.drone;
  const sequencer = (p: "drums" | "bass", label: string) => {
    const v = snap.parts[p];
    const inst = rig.instrument(p);
    return (
      <Tool label={label}>
        <PlayButton on={v.state.playing} label={label.toLowerCase()} onClick={() => toggle(p)} />
        <Select
          size="sm"
          className="w-28 shrink-0 sm:w-43"
          value=""
          onChange={(id) => id && rig.loadPreset(p, id)}
          aria-label={`${label} pattern`}
          options={[{ value: "", label: "Pattern…", disabled: true }, ...inst.presets.map((pr) => ({ value: pr.id, label: pr.name }))]}
        />
        <Popover label={`${label} pattern`} wide>
          <div className="flex flex-col gap-3">
            <PatternBar instrument={inst} bars={v.state.bars} onPreset={(id) => rig.loadPreset(p, id)} onBars={(b) => rig.setBars(p, b)} onClear={() => rig.clear(p)}
              leading={<p className="mr-auto text-[11px] text-slate-500">{p === "bass" ? `${NOTE_NAMES[drone.root]} minor pentatonic, in the drone's key` : "Click a step for on, again for an accent"}</p>}
              trailing={<PartLevel name={label.toLowerCase()} volume={v.volume} muted={v.muted} onVolume={(volume) => rig.setLevel(p, { volume })} onMute={(muted) => rig.setLevel(p, { muted })} />} />
            <StepGrid instrument={inst} cells={v.state.cells} steps={v.steps} beatsPerBar={BEATS_PER_BAR} musicKey={p === "bass" ? drone.root : undefined} position={() => rig.position(p)} onStep={(l, s, val) => rig.setStep(p, l, s, val)} fit />
          </div>
        </Popover>
      </Tool>
    );
  };

  return (
    <div ref={root} className={`flex min-w-0 items-stretch gap-2 ${stacked ? "lg:flex-col" : ""} ${className}`}>
      <button type="button" onClick={toggleAll} aria-pressed={anyOn} title={`${anyOn ? "Stop" : "Start"} everything on the next beat (Space stops and brings back)`}
        className={`flex w-12 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border ${stacked ? "lg:w-full lg:flex-row lg:gap-2 lg:py-1.5" : ""} text-[10px] font-medium uppercase tracking-wider transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400 ${anyOn ? "border-emerald-400/70 bg-emerald-500/20 text-emerald-100" : "border-slate-700 bg-slate-900 text-slate-200 hover:border-slate-500"}`}>
        <Icon name={anyOn ? "square" : "play"} size={18} fill />
        {anyOn ? "Stop" : "All"}
      </button>

      <div className={`grid min-w-0 flex-1 gap-x-4 gap-y-1.5 ${stacked ? "sm:grid-cols-2 lg:grid-cols-1" : "sm:grid-cols-2 xl:grid-cols-1"}`}>
        <Tool label="Click">
          <PlayButton on={snap.click.on} label="metronome" onClick={toggleClick} />
          <MuteButton muted={snap.click.muted} label="metronome" onClick={() => rig.setClickMuted(!snap.click.muted)} />
          <button type="button" className={ibtn} disabled={snap.bpm <= MIN_BPM} onClick={() => rig.setTempo(snap.bpm - 1)} aria-label="Slower">−</button>
          <span className="flex w-14 shrink-0 items-baseline justify-center whitespace-nowrap text-xs text-slate-100"><NumberField value={snap.bpm} min={MIN_BPM} max={MAX_BPM} onCommit={(bpm) => rig.setTempo(bpm)} aria-label="Tempo in beats per minute" title="Type a tempo" className="w-8 py-0.5" /><span className="text-[10px] text-slate-500">bpm</span></span>
          <button type="button" className={ibtn} disabled={snap.bpm >= MAX_BPM} onClick={() => rig.setTempo(snap.bpm + 1)} aria-label="Faster">+</button>
          <BeatDots rig={rig} playing={anyOn} />
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
        </Tool>

        <Tool label="Drone">
          <PlayButton on={snap.parts.drone.state.playing} label="drone" onClick={() => toggle("drone")} />
          <button type="button" className={ibtn} disabled={drone.octave <= DRONE_MIN_OCTAVE} onClick={() => rig.setDrone({ octave: drone.octave - 1 })} aria-label="Octave down">−</button>
          <span className="w-12 shrink-0 text-center text-xs tabular-nums text-slate-100" aria-live="polite" title="The drone plays the key's note (another note in the sound panel)">{droneName(drone)}</span>
          <button type="button" className={ibtn} disabled={drone.octave >= DRONE_MAX_OCTAVE} onClick={() => rig.setDrone({ octave: drone.octave + 1 })} aria-label="Octave up">+</button>
          <Slider min={0} max={1} step={0.01} value={drone.level} onChange={(level) => rig.setDrone({ level })} size="sm" className="hidden w-14 shrink-0 px-1 sm:flex" aria-label="Drone volume" title="Drone volume" />
          <Popover label="Drone sound" wide>
            {/* Reset hands back DEFAULT_DRONE: keep the key's note rather than its E */}
            <DroneControls value={drone} onChange={(p) => rig.setDrone(p === DEFAULT_DRONE ? { ...p, root: keyPc } : p)} playing={snap.parts.drone.running} analyser={snap.parts.drone.running ? rig.droneAnalyser() : null}
              header={<p className="text-[11px] text-slate-500">The note moves to the page&apos;s key whenever the key changes.</p>} />
          </Popover>
        </Tool>

        {sequencer("drums", "Drums")}
        {sequencer("bass", "Bass")}
      </div>
    </div>
  );
}
