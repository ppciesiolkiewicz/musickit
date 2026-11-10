"use client";

import { useEffect, useSyncExternalStore } from "react";
import { INPUT_CHANNELS, meterLevel, readDeviceChoice, readLiveInput, serverDeviceChoice, serverLiveInput, setDeviceChoice, subscribeDeviceChoice, subscribeLiveInput, type InputChannel } from "@/features/sound";

/** One input's level: a short bar, bright for an input heard. */
export function LevelBar({ level, heard, className = "h-3" }: { level: number; heard: boolean; className?: string }) {
  return (
    <span className={`relative w-1 shrink-0 overflow-hidden rounded-full bg-slate-700 ${className}`} aria-hidden>
      <span className={`absolute inset-x-0 bottom-0 rounded-full transition-[height] duration-75 ${heard ? "bg-emerald-400" : "bg-slate-400"}`} style={{ height: `${Math.round(meterLevel(level) * 100)}%` }} />
    </span>
  );
}

const NAMES: Record<InputChannel, string> = { both: "Both", "1": "1", "2": "2" };
const LONG: Record<InputChannel, string> = { both: "Both inputs, mixed", "1": "Input 1", "2": "Input 2" };

/** Whether `channel` is heard when `chosen` is: Both hears each input. */
export const channelHeard = (chosen: InputChannel, index: number) => chosen === "both" || chosen === String(index + 1);

/**
 * Which channel of a two-input device (an audio interface: a guitar on Input 1, a voice on Input 2) is listened to: [Both] [1] [2],
 * each with its level next to it while the input is open (`levels`, one per input). Both mixes the two and is the default. Owns no
 * state: the app's input uses it through `AppInputChannels`; a host with a device of its own (the studio's sources) keeps its own.
 */
export default function InputChannels({ value, onChange, levels = [], label = "Channel", className = "" }: { value: InputChannel; onChange: (c: InputChannel) => void; levels?: readonly number[]; label?: string; className?: string }) {
  const two = levels.length > 1;
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="shrink-0 text-xs font-medium uppercase tracking-wider text-slate-400">{label}</span>
      <div role="radiogroup" aria-label={label} className="flex min-w-0 flex-1 gap-1 rounded-xl border border-slate-700 bg-slate-950/40 p-0.5">
        {INPUT_CHANNELS.map((c) => {
          const on = value === c;
          // Both shows each input's bar; 1 and 2 show their own
          const bars = !two ? [] : c === "both" ? [0, 1] : [Number(c) - 1];
          return (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={LONG[c]}
              title={LONG[c]}
              onClick={() => onChange(c)}
              className={`flex h-7 flex-1 items-center justify-center gap-1.5 rounded-lg px-2 text-xs transition focus-visible:outline-2 focus-visible:outline-sky-400 ${on ? "bg-sky-500/20 text-sky-100 ring-1 ring-sky-500/60" : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"}`}
            >
              <span>{NAMES[c]}</span>
              {bars.length > 0 && (
                <span className="flex items-end gap-0.5">
                  {bars.map((i) => <LevelBar key={i} level={levels[i] ?? 0} heard={on} />)}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** inputs each device was last heard with, by device id ("" for the system default), so a closed mono input stays without channels */
const heardChannels = new Map<string, number>();

/**
 * The app's input channel (`DeviceChoice.channel`), under the input list: [Both] [1] [2] with each input's level while a page
 * listens. Shown for a chosen device unless it was heard with one channel only; for the system default only once it is heard with two.
 */
export function AppInputChannels({ className = "" }: { className?: string }) {
  const choice = useSyncExternalStore(subscribeDeviceChoice, readDeviceChoice, serverDeviceChoice);
  const live = useSyncExternalStore(subscribeLiveInput, readLiveInput, serverLiveInput);
  const key = choice.input?.id ?? "";
  const levels = live.listening ? live.levels : [];
  useEffect(() => {
    if (levels.length) heardChannels.set(key, levels.length);
  }, [key, levels.length]);
  const known = levels.length || heardChannels.get(key);
  const show = known ? known > 1 : choice.input !== null;
  if (!show) return null;
  return <InputChannels value={choice.channel} onChange={(channel) => setDeviceChoice({ channel })} levels={levels} className={className} />;
}
