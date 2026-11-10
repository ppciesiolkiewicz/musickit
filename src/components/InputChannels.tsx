"use client";

import { useState, useSyncExternalStore } from "react";
import { InfoButton } from "@/components/ui";
import { INPUT_CHANNELS, UNSURE_PAIR, judgePair, looksOneInput, meterLevel, type LiveInput, type PairState, readDeviceChoice, readLiveInput, serverDeviceChoice, serverLiveInput, setDeviceChoice, subscribeDeviceChoice, subscribeLiveInput, type InputChannel } from "@/features/sound";

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
  const [info, setInfo] = useState(false);
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
    <div className="flex items-center gap-2">
      <span className="flex shrink-0 items-center gap-1 text-xs font-medium uppercase tracking-wider text-slate-400">
        {label}
        <InfoButton open={info} onClick={() => setInfo(!info)} label="Why two channels?" />
      </span>
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
    {info && <ChannelsNote />}
    </div>
  );
}

/** What the channels are for, under the (i). */
function ChannelsNote() {
  const b = "font-medium text-slate-100";
  return (
    <div role="note" className="flex flex-col gap-1.5 rounded-lg border border-slate-700 bg-slate-950/70 p-2.5 text-xs leading-relaxed normal-case tracking-normal text-slate-300">
      <p>Your device sends two channels. An audio interface does this: each socket on its front is its own input, for example a guitar in Input 1 and a mic in Input 2.</p>
      <p><span className={b}>Both</span> listens to the two mixed. <span className={b}>1</span> or <span className={b}>2</span> listens to one socket only, so the other instrument can&apos;t throw off the pitch or the timing.</p>
      <p>Not sure which is which? Play or sing and watch the bars: the one that moves is your input.</p>
      <p className="text-slate-400">A laptop&apos;s built-in mic, a webcam or a headset is one mic, so the choice hides for them. A stereo USB mic sends the same sound twice: keep Both.</p>
    </div>
  );
}

interface Heard {
  channels: number;
  pair: PairState;
}

/** what each device was last heard as, by device id ("" for the system default): its number of inputs and its levels' verdict */
const heard = new Map<string, Heard>();
/** the last levels judged, so a snapshot read twice counts a frame once */
let judged: readonly number[] | null = null;

/** Folds the live levels into `key`'s record (once per published frame) and returns the record. */
function observe(key: string, live: LiveInput): Heard | undefined {
  const levels = live.listening ? live.levels : [];
  if (levels.length && levels !== judged) {
    judged = levels;
    const was = heard.get(key);
    heard.set(key, { channels: levels.length, pair: judgePair(was?.channels === levels.length ? was.pair : UNSURE_PAIR, levels) });
  }
  return heard.get(key);
}

/**
 * Whether to offer channels for a device: never for one input (one channel, or one sound copied to both); a two-input verdict wins
 * over the name; otherwise a chosen device shows them unless its name says one mic, and the system default (name unknown) waits
 * until its levels prove two inputs.
 */
export function showChannels(input: { label: string } | null, seen: Heard | undefined): boolean {
  if (seen?.channels === 1 || seen?.pair.verdict === "one") return false;
  if (seen?.pair.verdict === "two") return true;
  return input !== null && !looksOneInput(input.label);
}

/**
 * The app's input channel (`DeviceChoice.channel`), under the input list: [Both] [1] [2] with each input's level while a page
 * listens. Hidden for a device with one input: one channel, a name like "MacBook Pro Microphone", or two channels whose levels stay
 * equal (the browser copying one mic to both). See `showChannels`.
 */
export function AppInputChannels({ className = "" }: { className?: string }) {
  const choice = useSyncExternalStore(subscribeDeviceChoice, readDeviceChoice, serverDeviceChoice);
  const live = useSyncExternalStore(subscribeLiveInput, readLiveInput, serverLiveInput);
  const show = showChannels(choice.input, observe(choice.input?.id ?? "", live));
  if (!show) return null;
  return <InputChannels value={choice.channel} onChange={(channel) => setDeviceChoice({ channel })} levels={live.listening ? live.levels : []} className={className} />;
}
