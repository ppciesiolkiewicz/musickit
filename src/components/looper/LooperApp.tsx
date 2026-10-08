"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { LooperEngine, MAX_CHANNELS, type ChannelInfo, type LooperSnapshot } from "@/lib/looper/engine";
import LevelMeter from "./LevelMeter";
import LooperSettings from "./LooperSettings";
import Piano from "../Piano";
import { getAudioContext, getOutputBus } from "@/lib/audio";
import Waveform from "./Waveform";

const COLOURS = ["#38bdf8", "#fbbf24", "#fb7185", "#a78bfa", "#34d399", "#f472b6", "#2dd4bf", "#a3e635"];

const STATE_TEXT: Record<ChannelInfo["state"], string> = {
  empty: "empty",
  armed: "waiting for the loop to restart",
  recording: "recording",
  playing: "playing",
};

const btn = "rounded-lg border px-3 py-1.5 text-xs transition disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400";
const btnPlain = `${btn} border-slate-700 bg-slate-900 text-slate-200 hover:border-slate-500`;

function useEngine() {
  const [engine] = useState(() => new LooperEngine({ getContext: getAudioContext, getExternalSource: getOutputBus, externalLabel: "Piano" }));
  useEffect(() => () => engine.dispose(), [engine]);
  const snap = useSyncExternalStore(engine.subscribe, engine.getSnapshot, engine.getSnapshot);
  return { engine, snap };
}

export default function LooperApp() {
  const { engine, snap } = useEngine();
  const ready = snap.status === "ready";
  const busy = snap.channels.some((c) => c.state === "recording" || c.state === "armed");
  const firstTake = snap.loopSeconds === null;
  const getPosition = useMemo(() => () => engine.getPosition(), [engine]);
  const getLevel = useMemo(() => () => engine.getLevel(), [engine]);
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <InputBar engine={engine} snap={snap} getLevel={getLevel} onSettings={() => setSettingsOpen(true)} />
      {settingsOpen && <LooperSettings engine={engine} snap={snap} getLevel={getLevel} onClose={() => setSettingsOpen(false)} />}

      <section className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
        <button type="button" className={btnPlain} disabled={!ready || snap.loopSeconds === null} onClick={() => engine.setPlaying(!snap.playing)}>
          {snap.playing ? "■ Stop" : "▶ Play from the top"}
        </button>
        <button type="button" className={btnPlain} disabled={!ready || snap.channels.every((c) => c.state === "empty")} onClick={() => engine.clearAll()}>
          Clear everything
        </button>
        <span className="text-xs text-slate-400">
          {snap.loopSeconds === null ? "No loop yet. Record any channel to set the loop length." : `Loop length ${snap.loopSeconds.toFixed(2)} s`}
        </span>
        <LoopBar getPosition={getPosition} />
      </section>

      <PianoPanel />

      {firstTake && ready && <p className="rounded-xl border border-dashed border-slate-700 p-3 text-xs text-slate-400">Press Record on a channel, play, then press Stop. That first take sets the loop length. After that, each Record waits for the loop to come round, then records exactly one loop in time with everything else.</p>}

      <div className="flex flex-col gap-3">
        {snap.channels.map((c, i) => (
          <ChannelStrip key={c.id} engine={engine} ch={c} colour={COLOURS[i % COLOURS.length]} ready={ready} busy={busy} firstTake={firstTake} getPosition={getPosition} />
        ))}
      </div>

      <div className="flex gap-2">
        <button type="button" className={btnPlain} disabled={snap.channels.length >= MAX_CHANNELS} onClick={() => engine.addChannel()}>+ Add channel</button>
        <button type="button" className={btnPlain} disabled={snap.channels.length <= 1 || snap.channels[snap.channels.length - 1].state !== "empty"} onClick={() => engine.removeLastChannel()}>− Remove last</button>
      </div>
    </div>
  );
}

function LoopBar({ getPosition }: { getPosition: () => number | null }) {
  const bar = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const p = getPosition();
      if (bar.current) bar.current.style.width = p === null ? "0%" : `${p * 100}%`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [getPosition]);
  return (
    <div className="h-2 min-w-[8rem] flex-1 overflow-hidden rounded-full bg-slate-800" aria-label="Position in the loop">
      <div ref={bar} className="h-full w-0 bg-sky-400" />
    </div>
  );
}

function sourcesText(snap: LooperSnapshot): string {
  const parts: string[] = [];
  if (snap.deviceOn) parts.push(snap.devices.find((d) => d.id === snap.deviceId)?.label ?? "Audio interface");
  if (snap.externalLabel && snap.externalOn) parts.push(snap.externalLabel);
  return parts.length ? parts.join(" + ") : "nothing selected";
}

function InputBar({ engine, snap, getLevel, onSettings }: { engine: LooperEngine; snap: LooperSnapshot; getLevel: () => number; onSettings: () => void }) {
  const ready = snap.status === "ready";
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/40 p-4" aria-label="Input">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-sm font-medium text-slate-100">Input</h2>
        {!ready && (
          <button type="button" className={`${btn} border-emerald-500 bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/25`} disabled={snap.status === "starting"} onClick={() => void engine.enable()}>
            {snap.status === "starting" ? "Starting…" : "Start looper"}
          </button>
        )}
        {ready && <span className="text-xs text-slate-400">Recording from <b className="text-slate-200">{sourcesText(snap)}</b></span>}
        <button type="button" className={`${btnPlain} ml-auto`} onClick={onSettings}>⚙ Settings</button>
      </div>

      {snap.error && <p role="alert" className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-2.5 text-xs text-rose-200">{snap.error}</p>}
      {snap.deviceError && ready && <p role="alert" className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-2.5 text-xs text-amber-100">Audio interface unavailable: {snap.deviceError} The piano can still be recorded.</p>}
      {snap.status === "idle" && <p className="text-xs text-slate-400">Start the looper to record the piano below and, if you allow it, your audio interface. The browser asks for microphone access for the interface; nothing is uploaded, everything stays in this tab. Use Settings to choose sources, pick your interface or connect a MIDI keyboard.</p>}
      {ready && <LevelMeter getLevel={getLevel} />}
    </section>
  );
}

function PianoPanel() {
  return (
    <details open className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
      <summary className="cursor-pointer text-sm font-medium text-slate-100">Piano <span className="font-normal text-slate-500">· play with the keys on screen, the computer keyboard or a MIDI keyboard; what you play is recorded into the loop</span></summary>
      <div className="mt-4 overflow-x-auto"><Piano /></div>
    </details>
  );
}

function ChannelStrip({ engine, ch, colour, ready, busy, firstTake, getPosition }: { engine: LooperEngine; ch: ChannelInfo; colour: string; ready: boolean; busy: boolean; firstTake: boolean; getPosition: () => number | null }) {
  const recording = ch.state === "recording" || ch.state === "armed";
  const isFreeTake = recording && firstTake;
  const label = isFreeTake ? "■ Stop" : recording ? "Cancel" : ch.state === "empty" ? "● Record" : "● Re-record";
  const onRec = () => (recording ? engine.stopRecording() : engine.record(ch.id));
  const stateColour = ch.state === "recording" ? "text-rose-300" : ch.state === "armed" ? "text-amber-300" : ch.state === "playing" ? "text-emerald-300" : "text-slate-500";
  return (
    <article className="flex flex-col gap-2 rounded-2xl border border-slate-800 bg-slate-900/40 p-3" style={{ borderLeft: `4px solid ${colour}` }}>
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={ch.name}
          onChange={(e) => engine.rename(ch.id, e.target.value)}
          aria-label={`Name of channel ${ch.id + 1}`}
          className="w-36 rounded-md border border-transparent bg-transparent px-1.5 py-1 text-sm font-medium text-slate-100 hover:border-slate-700 focus:border-slate-500 focus:outline-none"
        />
        <span className={`text-xs ${stateColour}`} aria-live="polite">{STATE_TEXT[ch.state]}</span>
        <span className="ml-auto flex flex-wrap items-center gap-1.5">
          <button type="button" className={`${btn} ${recording ? "border-rose-400 bg-rose-500/20 text-rose-100" : "border-rose-500/60 text-rose-200 hover:bg-rose-500/10"}`} disabled={!ready || (busy && !recording)} onClick={onRec}>{label}</button>
          <button type="button" className={`${btnPlain} ${ch.muted ? "!border-amber-400 !text-amber-200" : ""}`} aria-pressed={ch.muted} disabled={ch.state === "empty"} onClick={() => engine.toggleMute(ch.id)}>Mute</button>
          <button type="button" className={`${btnPlain} ${ch.solo ? "!border-sky-400 !text-sky-200" : ""}`} aria-pressed={ch.solo} disabled={ch.state === "empty"} onClick={() => engine.toggleSolo(ch.id)}>Solo</button>
          <button type="button" className={btnPlain} disabled={ch.state === "empty"} onClick={() => engine.clear(ch.id)}>Clear</button>
        </span>
      </div>
      <Waveform peaks={ch.peaks} getPosition={getPosition} active={!ch.muted} colour={colour} />
      <label className="flex items-center gap-2 text-xs text-slate-400">
        Volume
        <input type="range" min={0} max={1} step={0.01} value={ch.volume} onChange={(e) => engine.setVolume(ch.id, Number(e.target.value))} className="flex-1 accent-sky-400" aria-label={`Volume of ${ch.name}`} />
        <span className="w-10 tabular-nums">{Math.round(ch.volume * 100)}%</span>
      </label>
    </article>
  );
}
