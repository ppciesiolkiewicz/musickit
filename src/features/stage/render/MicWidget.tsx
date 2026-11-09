"use client";

import { createContext, useContext, useEffect, useState, useSyncExternalStore } from "react";
import { AudioDevicesPanel } from "@/components/AudioDevicesButton";
import Icon from "@/components/Icon";
import MicButton from "@/components/theory/singing/MicButton";
import type { MicStatus } from "@/components/practice/useMicPitch";
import { Modal } from "@/components/ui";
import { cleanDeviceName, listAudioDevices, readDeviceChoice, serverDeviceChoice, subscribeDeviceChoice, type AudioDevice } from "@/features/sound";
import { TunerMeter, hzToNote, type TunerRead } from "@/features/tuner";
import { CHANNELS, CHANNEL_NAMES, SOURCES, SOURCE_NAMES, type AudioInputSetup, type AudioSource, type SourceSetup } from "../model/audioInput";

/**
 * The studio's one audio input, which the host listens with. It lives with the host, not the widget, so hiding the widget keeps it
 * listening. Without a provider (the editor's replay) the widget shows the input off, with nothing to press.
 */
export interface MicInput {
  status: MicStatus;
  /** the pitch class held steady now (what the widgets light), or null */
  heard: number | null;
  /** the pitch heard now, smoothed, for the accuracy meter */
  hz: number | null;
  setup: AudioInputSetup;
  onSetup: (s: AudioInputSetup) => void;
  onToggle: () => void;
}

export const MicContext = createContext<MicInput | null>(null);

const STATUS: Record<MicStatus, string> = {
  off: "Off",
  asking: "Asking for the input…",
  on: "Listening",
  denied: "Input blocked",
  error: "No input",
  insecure: "Needs https",
};

const seg = (on: boolean) => `px-2.5 py-1 transition ${on ? "bg-slate-700 text-slate-100" : "text-slate-400 hover:text-slate-200"}`;

/** The app's chosen input by name ("App input: Scarlett 2i2"), what a source without its own device listens to. */
function useAppInputName(): string {
  const input = useSyncExternalStore(subscribeDeviceChoice, readDeviceChoice, serverDeviceChoice).input;
  return `App input: ${input ? cleanDeviceName(input.label) : "System mic"}`;
}

/** The note heard, chromatic: its nearest note and how many cents off it. */
const readOf = (hz: number | null): TunerRead | null => {
  if (hz === null) return null;
  const note = hzToNote(hz);
  return { name: note.name, octave: note.octave, cents: note.cents, heard: note, string: null };
};

/**
 * The audio input's face: Guitar or Voice, the device it listens to (by default the app's input, followed when it changes), the note
 * heard with how far off it is (the tuner's meter), and one button that starts the mic and opens a dialog with Stop, the app's input and
 * output and each source's own device and channel. The notes light up on the pinned and selected widgets.
 */
export default function MicWidget() {
  const mic = useContext(MicContext);
  const [devices, setDevices] = useState(false);
  const status = mic?.status ?? "off";
  const listening = status === "on" || status === "asking";
  const source = mic?.setup.source ?? "guitar";
  const appName = useAppInputName();
  const device = mic?.setup[source].device;
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-950 p-4">
      <p className="flex items-center gap-2 text-sm font-medium text-slate-200">
        <Icon name={source === "guitar" ? "guitar" : "mic"} size={16} className={listening ? "text-rose-300" : "text-slate-400"} />
        Audio input
        <span className="text-xs font-normal uppercase tracking-wider text-slate-400">· {STATUS[status]}</span>
      </p>
      {mic && (
        <span data-chrome role="group" aria-label="Listen to" className="flex self-start overflow-hidden rounded-md border border-slate-700 text-sm">
          {SOURCES.map((s) => (
            <button key={s} type="button" aria-pressed={source === s} onClick={() => mic.onSetup({ ...mic.setup, source: s })} className={seg(source === s)}>
              {SOURCE_NAMES[s]}
            </button>
          ))}
        </span>
      )}
      {mic && (
        <p data-chrome className="-mt-1 truncate text-xs text-slate-400" title={device ? "This source's own device (change it under the cog)" : "Follows the input chosen in the devices menu"}>
          {device ? cleanDeviceName(device.label) : appName} · {CHANNEL_NAMES[mic.setup[source].channel]}
        </p>
      )}
      <div className="flex flex-col items-center">
        <TunerMeter hz={mic?.hz ?? null} read={readOf(mic?.hz ?? null)} size="compact" idle={listening ? "Play a note" : "Not listening"} />
      </div>
      {mic && (
        <div data-chrome className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (!listening) mic.onToggle();
              setDevices(true);
            }}
            className={`flex-1 rounded-md border px-3 py-1.5 text-sm ${listening ? "border-slate-700 text-slate-200 hover:border-slate-500" : "border-sky-500/60 text-sky-100 hover:bg-sky-500/10"}`}
          >
            {listening ? "Microphone and inputs" : "Start microphone"}
          </button>
        </div>
      )}
      {mic && devices && (
        // the dialog is drawn on the page, but its events still bubble through the widget: keep them from dragging it
        <div onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
          <Modal title="Audio input" narrow onClose={() => setDevices(false)}>
            {/* the app's input (what a source without its own device hears, here and everywhere else) and output */}
            <MicButton on={listening} onClick={mic.onToggle} className="mb-3 w-full justify-center" />
            <AudioDevicesPanel listening={status === "on"} />
            <div className="mt-4 border-t border-slate-800 pt-3">
              <InputSetup setup={mic.setup} onSetup={mic.onSetup} />
            </div>
          </Modal>
        </div>
      )}
    </div>
  );
}

/** Each source's device and channel, and which one listens. */
function InputSetup({ setup, onSetup }: { setup: AudioInputSetup; onSetup: (s: AudioInputSetup) => void }) {
  const [list, setList] = useState<AudioDevice[]>([]);
  useEffect(() => {
    const refresh = () => void listAudioDevices().then((l) => setList(l.inputs));
    refresh();
    navigator.mediaDevices?.addEventListener?.("devicechange", refresh);
    return () => navigator.mediaDevices?.removeEventListener?.("devicechange", refresh);
  }, []);
  const appName = useAppInputName();
  const set = (s: AudioSource, patch: Partial<SourceSetup>) => onSetup({ ...setup, [s]: { ...setup[s], ...patch } });
  return (
    <div className="flex flex-col gap-3">
      <p className="px-1 text-xs text-slate-500">One input feeds every widget. Pick which listens on the widget. Each follows the app&apos;s input unless given a device of its own; Louder hears the louder input of a two-input device.</p>
      {SOURCES.map((s) => {
        const src = setup[s];
        // a remembered device that is not plugged in still shows, by name
        const options = src.device && !list.some((d) => d.id === src.device!.id) ? [...list, src.device] : list;
        return (
          <section key={s} className={`flex flex-col gap-2 rounded-xl border p-3 ${setup.source === s ? "border-sky-500/60 bg-sky-500/10" : "border-slate-800"}`}>
            <div className="flex items-center gap-2">
              <Icon name={s === "guitar" ? "guitar" : "mic"} size={15} className="text-sky-300" />
              <span className="text-sm font-medium text-slate-100">{SOURCE_NAMES[s]}</span>
              {setup.source === s ? (
                <span className="ml-auto text-xs text-sky-300">listening</span>
              ) : (
                <button type="button" onClick={() => onSetup({ ...setup, source: s })} className="ml-auto rounded-md border border-slate-700 px-2 py-0.5 text-xs text-slate-300 hover:border-slate-500">
                  Use this
                </button>
              )}
            </div>
            <select
              aria-label={`${SOURCE_NAMES[s]} device`}
              value={src.device?.id ?? ""}
              onChange={(e) => set(s, { device: options.find((d) => d.id === e.target.value) ?? null })}
              className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-200"
            >
              <option value="">{appName}</option>
              {options.map((d) => (
                <option key={d.id} value={d.id}>{cleanDeviceName(d.label)}</option>
              ))}
            </select>
            <span role="group" aria-label={`${SOURCE_NAMES[s]} channel`} className="flex self-start overflow-hidden rounded-md border border-slate-700 text-xs">
              {CHANNELS.map((c) => (
                <button key={c} type="button" aria-pressed={src.channel === c} onClick={() => set(s, { channel: c })} className={seg(src.channel === c)}>
                  {CHANNEL_NAMES[c]}
                </button>
              ))}
            </span>
          </section>
        );
      })}
    </div>
  );
}
