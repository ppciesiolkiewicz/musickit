"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import Icon from "@/components/Icon";
import { getAudioContext, getOutputBus } from "@/features/sound";
import DroneControls from "../drone/DroneControls";
import { NOTE_NAMES, droneName, type DroneParams } from "../drone/drone";
import StepGrid, { PatternBar } from "../sequencer/StepGrid";
import { MAX_BPM, MIN_BPM } from "./clock";
import { BEATS_PER_BAR, JAM_PARTS, JamRig, type JamPart, type JamPartView, type JamSaved } from "./rig";

const KEY = "musickit.jam";
/** where the drone page kept its drone before the jam: read when there is no jam save, so a saved sound is not lost */
const OLD_DRONE_KEY = "musickit.drone";

function restore(rig: JamRig) {
  try {
    const saved = JSON.parse(window.localStorage.getItem(KEY) ?? "null") as Partial<JamSaved> | null;
    if (saved && typeof saved === "object") return rig.load(saved);
    const drone = JSON.parse(window.localStorage.getItem(OLD_DRONE_KEY) ?? "null") as Partial<DroneParams> | null;
    if (drone && typeof drone === "object") rig.loadDrone(drone);
  } catch {
    /* storage blocked or a broken save: start fresh */
  }
}

const card = "flex min-w-0 flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 sm:p-7";

/** A part's play button: round, green while it plays. Starts and stops on the next beat. */
function PlayButton({ on, name, onClick, big = false }: { on: boolean; name: string; onClick: () => void; big?: boolean }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on} aria-label={on ? `Stop the ${name}` : `Start the ${name}`} title={on ? "Stop on the next beat" : "Start on the next beat"}
      className={`grid shrink-0 place-items-center rounded-full border transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400 ${big ? "h-12 w-12" : "h-10 w-10"} ${on ? "border-emerald-400/70 bg-emerald-500/20 text-emerald-100" : "border-slate-600 bg-slate-800 text-slate-100 hover:border-slate-400"}`}>
      <Icon name={on ? "square" : "play"} size={big ? 20 : 16} fill />
    </button>
  );
}

const status = (v: JamPartView) => (v.running ? (v.stopping ? "Stopping" : "Playing") : v.state.playing ? "Starting" : "Stopped");

function Title({ children, view }: { children: ReactNode; view: JamPartView }) {
  return (
    <div className="mr-auto min-w-0">
      <p className="text-lg font-light tabular-nums text-slate-50">{children}</p>
      <p className="text-xs text-slate-400">{status(view)}</p>
    </div>
  );
}

/**
 * Drone, drum machine and bass on one clock, to practise against: each starts and stops on its own, on the next beat, so they always
 * line up. The bass plays in the drone's key. The same instruments as the looper's sequencers, playing straight to the speakers.
 * Nothing sounds until a person presses play (the browser needs that).
 */
export default function Jam() {
  const [rig] = useState(() => new JamRig());
  const snap = useSyncExternalStore(rig.subscribe, rig.snapshot, rig.snapshot);
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    restore(rig);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- saving starts once the saved jam is back (after hydration)
    setRestored(true);
    return () => rig.dispose();
  }, [rig]);
  useEffect(() => {
    if (!restored) return;
    try {
      window.localStorage.setItem(KEY, JSON.stringify(rig.save()));
    } catch {
      /* private mode */
    }
  }, [rig, snap, restored]);

  const start = async (parts: readonly JamPart[]) => {
    const ctx = getAudioContext();
    if (ctx.state === "suspended") await ctx.resume();
    rig.attach(ctx, getOutputBus());
    rig.start(parts);
  };
  const toggle = (p: JamPart) => (snap.parts[p].state.playing ? rig.stop([p]) : void start([p]));
  // any part playing makes it a Stop all, so one part started on its own can be stopped from here too
  const anyOn = JAM_PARTS.some((p) => snap.parts[p].state.playing);
  const toggleAll = () => (anyOn ? rig.stop(JAM_PARTS) : void start(JAM_PARTS));
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

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-2xl border border-slate-800 bg-slate-900/60 px-5 py-4 sm:px-7">
        <button type="button" onClick={toggleAll} aria-pressed={anyOn} title={`${anyOn ? "Stop" : "Start"} every part on the next beat (Space)`}
          className={`inline-flex h-12 items-center gap-2.5 rounded-xl border px-5 text-base font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400 ${anyOn ? "border-emerald-400/70 bg-emerald-500/20 text-emerald-100" : "border-slate-600 bg-slate-800 text-slate-100 hover:border-slate-400"}`}>
          <Icon name={anyOn ? "square" : "play"} size={20} fill />{anyOn ? "Stop all" : "Play all"}
          <kbd className="hidden rounded border border-current/30 px-1.5 text-[10px] font-normal opacity-60 sm:inline">Space</kbd>
        </button>
        <label className="order-last flex w-full min-w-0 items-center gap-2 text-xs text-slate-300 sm:order-none sm:w-auto sm:max-w-sm sm:flex-1">
          <span className="shrink-0">Tempo</span>
          <input type="range" className="min-w-0 flex-1 accent-sky-400" min={MIN_BPM} max={MAX_BPM} step={1} value={snap.bpm} onChange={(e) => rig.setTempo(Number(e.target.value))} />
          <span className="w-16 whitespace-nowrap text-right tabular-nums text-slate-400">{snap.bpm} BPM</span>
        </label>
        <span className="text-xs text-slate-500">Key of {key}, from the drone</span>
      </div>

      <section aria-label="Drone" className={card}>
        <DroneControls value={drone.state.drone} onChange={(patch) => rig.setDrone(patch)} playing={drone.running} analyser={drone.running ? rig.droneAnalyser() : null}
          header={<><PlayButton big on={drone.state.playing} name="drone" onClick={() => toggle("drone")} /><Title view={drone}>Drone · {droneName(drone.state.drone)}</Title></>} />
      </section>

      {(["drums", "bass"] as const).map((p) => {
        const v = snap.parts[p];
        const inst = rig.instrument(p);
        return (
          <section key={p} aria-label={inst.name} className={card}>
            <PatternBar instrument={inst} bars={v.state.bars} onPreset={(id) => rig.loadPreset(p, id)} onBars={(b) => rig.setBars(p, b)} onClear={() => rig.clear(p)}
              leading={<><PlayButton on={v.state.playing} name={inst.name.toLowerCase()} onClick={() => toggle(p)} /><Title view={v}>{p === "bass" ? `${inst.name} · ${key} minor pentatonic` : inst.name}</Title></>} />
            <StepGrid instrument={inst} cells={v.state.cells} steps={v.steps} beatsPerBar={BEATS_PER_BAR} musicKey={p === "bass" ? drone.state.drone.root : undefined} position={() => rig.position(p)} onStep={(l, s, val) => rig.setStep(p, l, s, val)} />
          </section>
        );
      })}
    </div>
  );
}
