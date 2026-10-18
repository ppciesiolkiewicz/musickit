"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import Icon from "@/components/Icon";
import { getAudioContext, getOutputBus, wakeAudio } from "@/features/sound";
import DroneControls from "../drone/DroneControls";
import { NOTE_NAMES, droneName, type DroneParams } from "../drone/drone";
import StepGrid, { PatternBar } from "../sequencer/StepGrid";
import PartLevel from "../sequencer/PartLevel";
import { MAX_BPM, MIN_BPM } from "./clock";
import { BEATS_PER_BAR, JAM_PARTS, JamRig, type JamPart, type JamPartView, type JamSaved } from "./rig";
import JamLoops from "./JamLoops";

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

const card = "relative flex min-w-0 flex-col gap-4 overflow-hidden rounded-2xl border bg-slate-900/60 p-4 sm:p-6 lg:p-8";

/** Each part keeps one colour, so the page reads as four instruments at a glance: its card's edge and wash, its icon and its play button. */
const PART_TONE = {
  drone: { card: "border-violet-500/30", wash: "from-violet-500/15", disc: "bg-violet-500/15 text-violet-300", ring: "border-violet-400/60 text-violet-100 hover:bg-violet-500/15", icon: "audio-lines" },
  drums: { card: "border-amber-500/30", wash: "from-amber-500/12", disc: "bg-amber-500/15 text-amber-300", ring: "border-amber-400/60 text-amber-100 hover:bg-amber-500/15", icon: "drum" },
  bass: { card: "border-teal-500/30", wash: "from-teal-500/12", disc: "bg-teal-500/15 text-teal-300", ring: "border-teal-400/60 text-teal-100 hover:bg-teal-500/15", icon: "waves" },
  loops: { card: "border-rose-500/30", wash: "from-rose-500/12", disc: "bg-rose-500/15 text-rose-300", ring: "border-rose-400/60 text-rose-100 hover:bg-rose-500/15", icon: "repeat" },
} as const;
type Tone = (typeof PART_TONE)[keyof typeof PART_TONE];

/** A part's card: its colour along the edge and a soft wash from the top corner. */
function PartCard({ tone, label, children }: { tone: Tone; label: string; children: ReactNode }) {
  return (
    <section aria-label={label} className={`${card} ${tone.card}`}>
      <div aria-hidden className={`pointer-events-none absolute inset-0 bg-linear-to-br ${tone.wash} via-transparent to-transparent`} />
      <div className="relative flex min-w-0 flex-col gap-4">{children}</div>
    </section>
  );
}

/** A part's play button: round, green while it plays. Starts and stops on the next beat. */
function PlayButton({ on, name, onClick, tone, big = false }: { on: boolean; name: string; onClick: () => void; tone: Tone; big?: boolean }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on} aria-label={on ? `Stop the ${name}` : `Start the ${name}`} title={on ? "Stop on the next beat" : "Start on the next beat"}
      className={`grid shrink-0 place-items-center rounded-full border transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400 ${big ? "h-12 w-12" : "h-10 w-10"} ${on ? "border-emerald-400/70 bg-emerald-500/20 text-emerald-100" : `bg-slate-900/60 ${tone.ring}`}`}>
      <Icon name={on ? "square" : "play"} size={big ? 20 : 16} fill />
    </button>
  );
}

const status = (v: JamPartView) => (v.running ? (v.stopping ? "Stopping" : "Playing") : v.state.playing ? "Starting" : "Stopped");

function Title({ children, view, tone }: { children: ReactNode; view: JamPartView; tone: Tone }) {
  return (
    <div className="mr-auto flex min-w-0 items-center gap-3">
      <span className={`hidden h-9 w-9 shrink-0 place-items-center rounded-xl sm:grid ${tone.disc}`}><Icon name={tone.icon} size={18} /></span>
      <span className="min-w-0">
        <p className="text-lg font-light tabular-nums text-slate-50">{children}</p>
        <p className={`text-xs ${view.running ? "text-emerald-300" : "text-slate-400"}`}>{status(view)}</p>
      </span>
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
    // names show only once the microphone is allowed; this never asks
    void rig.refreshDevices();
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

  /** The audio, made on a person's click. */
  const ready = async () => {
    const ctx = getAudioContext();
    await wakeAudio();
    rig.attach(ctx, getOutputBus());
  };
  const start = async (parts: readonly JamPart[], withLoops = false) => {
    await ready();
    rig.start(parts, withLoops);
  };
  const toggle = (p: JamPart) => (snap.parts[p].state.playing ? rig.stop([p]) : void start([p]));
  // any part or loop playing makes it a Stop all, so one started on its own can be stopped from here too
  const anyOn = JAM_PARTS.some((p) => snap.parts[p].state.playing) || snap.loops.some((l) => l.on || l.state === "countIn" || l.state === "recording");
  const toggleAll = () => (anyOn ? rig.stop(JAM_PARTS, true) : void start(JAM_PARTS, true));
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
    <div className="flex min-w-0 flex-col gap-5 px-1 sm:gap-8 sm:px-2 lg:px-4">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
        <button type="button" onClick={toggleAll} aria-pressed={anyOn} title={`${anyOn ? "Stop" : "Start"} every part on the next beat (Space)`}
          className={`inline-flex h-12 items-center gap-2.5 rounded-xl border px-5 text-base font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400 ${anyOn ? "border-emerald-400/70 bg-emerald-500/20 text-emerald-100" : "border-sky-400/60 bg-sky-500/15 text-sky-50 shadow-lg shadow-sky-500/10 hover:bg-sky-500/25"}`}>
          <Icon name={anyOn ? "square" : "play"} size={20} fill />{anyOn ? "Stop all" : "Play all"}
          <kbd className="hidden rounded border border-current/30 px-1.5 text-[10px] font-normal opacity-60 sm:inline">Space</kbd>
        </button>
        <label className="order-last flex w-full min-w-0 items-center gap-2 text-xs text-slate-300 sm:order-none sm:w-auto sm:max-w-sm sm:flex-1" title={snap.tempoLocked ? "Clear the loops to change the tempo" : undefined}>
          <span className="shrink-0">Tempo</span>
          <input type="range" className="min-w-0 flex-1 accent-sky-400 disabled:opacity-40" min={MIN_BPM} max={MAX_BPM} step={1} value={snap.bpm} disabled={snap.tempoLocked} onChange={(e) => rig.setTempo(Number(e.target.value))} />
          <span className="w-16 whitespace-nowrap text-right tabular-nums text-slate-400">{snap.bpm} BPM</span>
        </label>
        <span className="flex items-center gap-2 text-xs text-slate-400">
          {/* the four parts' colours, in page order */}
          <span aria-hidden className="flex -space-x-1">
            {Object.values(PART_TONE).map((t) => <span key={t.icon} className={`h-3 w-3 rounded-full ring-2 ring-slate-900 ${t.disc.split(" ")[0].replace("/15", "")}`} />)}
          </span>
          Key of <b className="font-semibold text-violet-200">{key}</b>, from the drone
        </span>
      </div>

      <PartCard tone={PART_TONE.drone} label="Drone">
        <DroneControls value={drone.state.drone} onChange={(patch) => rig.setDrone(patch)} playing={drone.running} analyser={drone.running ? rig.droneAnalyser() : null}
          header={<><PlayButton big tone={PART_TONE.drone} on={drone.state.playing} name="drone" onClick={() => toggle("drone")} /><Title tone={PART_TONE.drone} view={drone}>Drone · {droneName(drone.state.drone)}</Title></>} />
      </PartCard>

      {(["drums", "bass"] as const).map((p) => {
        const v = snap.parts[p];
        const inst = rig.instrument(p);
        return (
          <PartCard key={p} tone={PART_TONE[p]} label={inst.name}>
            <PatternBar instrument={inst} bars={v.state.bars} onPreset={(id) => rig.loadPreset(p, id)} onBars={(b) => rig.setBars(p, b)} onClear={() => rig.clear(p)}
              leading={<><PlayButton tone={PART_TONE[p]} on={v.state.playing} name={inst.name.toLowerCase()} onClick={() => toggle(p)} /><Title tone={PART_TONE[p]} view={v}>{p === "bass" ? `${inst.name} · ${key} minor pentatonic` : inst.name}</Title></>}
              trailing={<PartLevel name={inst.name.toLowerCase()} volume={v.volume} muted={v.muted} onVolume={(volume) => rig.setLevel(p, { volume })} onMute={(muted) => rig.setLevel(p, { muted })} />} />
            <StepGrid instrument={inst} cells={v.state.cells} steps={v.steps} beatsPerBar={BEATS_PER_BAR} musicKey={p === "bass" ? drone.state.drone.root : undefined} position={() => rig.position(p)} onStep={(l, s, val) => rig.setStep(p, l, s, val)} fit />
          </PartCard>
        );
      })}

      <PartCard tone={PART_TONE.loops} label="Loops">
        <JamLoops rig={rig} loops={snap.loops} devices={snap.devices} ready={ready} />
      </PartCard>
    </div>
  );
}
