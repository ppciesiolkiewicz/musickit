"use client";

import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import Icon from "@/components/Icon";
import { getAudioContext, getOutputBus } from "@/features/sound";
import { channelWaveforms, clockTime } from "./recorder";

const BARS = 40;
/** A channel's volume runs 0..200%: the input was recorded raw, with no automatic gain, so a quiet one can be lifted. */
const MAX_VOLUME = 2;

/** The one take playing: starting another pauses it. */
let playing: HTMLAudioElement | null = null;

/**
 * One take's player, all our own, on one row: play, the take's waveform as the seek bar (click or drag anywhere on it; arrows
 * step 5 s) with the played part lit, a vertical volume for each channel, and the time; the length is in the take's header. A
 * two-channel take draws a waveform per channel, one above the other, and plays both mixed to the centre, so a mono speaker
 * gets both and each volume sets its channel's share. `seconds` is the recorded length, since a recorded WebM often reports no
 * duration.
 */
export default function TakePlayer({ url, seconds, channels, label }: { url: string; seconds: number; channels: 1 | 2; label: string }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [on, setOn] = useState(false);
  const [time, setTime] = useState(0);
  const [waves, setWaves] = useState<number[][] | null>(null);
  const [volumes, setVolumes] = useState([1, 1]);
  const graph = useRef<{ src: MediaElementAudioSourceNode; gains: GainNode[]; mix: GainNode } | null>(null);
  const duration = seconds || 1;
  // each channel at half in a two-channel mix, so a mono mic sent to both sides keeps its level
  const share = 1 / channels;

  // the waveforms, decoded once from the take itself
  useEffect(() => {
    let live = true;
    void fetch(url)
      .then((r) => r.arrayBuffer())
      .then((buf) => getAudioContext().decodeAudioData(buf))
      .then((b) => live && setWaves(channelWaveforms(Array.from({ length: Math.min(channels, b.numberOfChannels) }, (_, i) => b.getChannelData(i)), BARS)))
      .catch(() => live && setWaves(Array.from({ length: channels }, () => Array(BARS).fill(0.3))));
    return () => {
      live = false;
    };
  }, [url, channels]);

  // the take plays through the audio graph, built on the first play: split into channels, each through its volume, summed to one
  const route = (a: HTMLAudioElement) => {
    const ctx = getAudioContext();
    void ctx.resume();
    if (graph.current) return;
    const src = ctx.createMediaElementSource(a);
    const mix = ctx.createGain();
    mix.channelCount = 1;
    mix.channelCountMode = "explicit";
    mix.connect(getOutputBus());
    const gains = Array.from({ length: channels }, (_, i) => {
      const g = ctx.createGain();
      g.gain.value = volumes[i] * share;
      g.connect(mix);
      return g;
    });
    if (channels === 2) {
      const split = ctx.createChannelSplitter(2);
      src.connect(split);
      gains.forEach((g, i) => split.connect(g, i));
    } else src.connect(gains[0]);
    graph.current = { src, gains, mix };
  };
  useEffect(() => () => {
    graph.current?.src.disconnect();
    graph.current?.mix.disconnect();
  }, []);

  const setVolume = (channel: number, value: number) => {
    setVolumes((v) => v.map((x, i) => (i === channel ? value : x)));
    const g = graph.current?.gains[channel];
    g?.gain.setTargetAtTime(value * share, g.context.currentTime, 0.02);
  };

  // the clock follows every frame while it plays
  useEffect(() => {
    if (!on) return;
    let raf = 0;
    const tick = () => {
      if (audio.current) setTime(audio.current.currentTime);
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [on]);

  useEffect(() => () => {
    if (playing === audio.current) playing = null;
  }, []);

  const toggle = () => {
    const a = audio.current;
    if (!a) return;
    if (!a.paused) return a.pause();
    route(a);
    if (playing && playing !== a) playing.pause();
    playing = a;
    if (a.currentTime >= duration - 0.05) a.currentTime = 0;
    void a.play();
  };
  const seek = (t: number) => {
    const a = audio.current;
    const to = Math.max(0, Math.min(duration, t));
    if (a) a.currentTime = to;
    setTime(to);
  };
  const seekAt = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    seek(((e.clientX - r.left) / r.width) * duration);
  };
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.key === "ArrowRight" || e.key === "ArrowUp" ? 5 : e.key === "ArrowLeft" || e.key === "ArrowDown" ? -5 : 0;
    if (e.key === "Home") seek(0);
    else if (e.key === "End") seek(duration);
    else if (step) seek(time + step);
    else return;
    e.preventDefault();
  };

  const played = Math.min(1, time / duration);
  const stereo = channels === 2;
  const name = (i: number) => (stereo ? `channel ${i + 1}` : "");
  return (
    <div className={`flex items-center gap-2 ${stereo ? "h-16" : "h-9"}`}>
      <audio ref={audio} src={url} preload="auto" onPlay={() => setOn(true)} onPause={() => setOn(false)}
        onEnded={() => { setOn(false); setTime(duration); }} />
      <button type="button" onClick={toggle} aria-label={on ? `Pause ${label}` : `Play ${label}`}
        className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border transition focus-visible:outline-2 focus-visible:outline-sky-400 ${on ? "border-emerald-400/70 bg-emerald-500/20 text-emerald-100" : "border-slate-600 bg-slate-800 text-slate-100 hover:border-slate-400"}`}>
        <Icon name={on ? "square" : "play"} size={on ? 12 : 15} fill className={on ? "" : "translate-x-px"} />
      </button>
      <div role="slider" tabIndex={0} aria-label={`Position in ${label}`} aria-valuemin={0} aria-valuemax={Math.round(duration)} aria-valuenow={Math.round(time)} aria-valuetext={`${clockTime(time)} of ${clockTime(duration)}`}
          onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); seekAt(e); }}
          onPointerMove={(e) => e.currentTarget.hasPointerCapture(e.pointerId) && seekAt(e)}
          onKeyDown={onKey}
        className="relative flex h-full min-w-0 flex-1 cursor-pointer touch-none flex-col gap-1 rounded-md focus-visible:outline-2 focus-visible:outline-sky-400">
        {(waves ?? Array.from({ length: channels }, () => Array(BARS).fill(0.08))).map((bars, c) => (
          <div key={c} aria-hidden className="flex min-h-0 flex-1 items-center gap-px">
            {bars.map((h, i) => (
              <span key={i} className={`flex-1 rounded-full transition-colors ${(i + 0.5) / BARS <= played ? "bg-rose-400" : "bg-slate-600"}`}
                style={{ height: `${Math.max(10, h * 100)}%` }} />
            ))}
          </div>
        ))}
        {/* the playhead */}
        <span aria-hidden className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 rounded-full bg-slate-100 shadow" style={{ left: `${played * 100}%` }} />
      </div>
      {/* a vertical volume per channel, 0..200%; double-click for 100% */}
      <div className="flex h-full shrink-0 gap-1">
        {Array.from({ length: channels }, (_, i) => (
          <label key={i} className="flex h-full w-4 flex-col items-center gap-0.5 text-[9px] leading-none tabular-nums text-slate-500" title={`${stereo ? `Channel ${i + 1} volume` : "Volume"}: ${Math.round(volumes[i] * 100)}% (double-click for 100%)`}>
            <input type="range" min={0} max={MAX_VOLUME} step={0.01} value={volumes[i]} aria-label={`${label} ${name(i)} volume`.replace(/\s+/g, " ")}
              aria-valuetext={`${Math.round(volumes[i] * 100)}%`} onChange={(e) => setVolume(i, Number(e.target.value))} onDoubleClick={() => setVolume(i, 1)}
              className="take-volume min-h-0 flex-1" style={{ "--fill": `${(volumes[i] / MAX_VOLUME) * 100}%` } as CSSProperties} />
            {stereo && <span aria-hidden>{i + 1}</span>}
          </label>
        ))}
      </div>
      <span className="shrink-0 text-[11px] tabular-nums text-slate-400">{clockTime(time)}</span>
    </div>
  );
}
