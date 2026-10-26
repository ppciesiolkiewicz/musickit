"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { AudioDevicesPanel } from "@/components/AudioDevicesButton";
import Icon from "@/components/Icon";
import type { MicStatus } from "@/components/practice/useMicPitch";
import { Modal } from "@/components/ui";
import { cleanDeviceName, listAudioDevices, type AudioDevice } from "@/features/sound";
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

/** The note heard, chromatic: its nearest note and how many cents off it. */
const readOf = (hz: number | null): TunerRead | null => {
  if (hz === null) return null;
  const note = hzToNote(hz);
  return { name: note.name, octave: note.octave, cents: note.cents, heard: note, string: null };
};

/**
 * The audio input's face: Guitar or Voice, the note heard with how far off it is (the tuner's meter), Listen / Stop, and a cog for
 * each source's device and channel and the output. The notes light up on the pinned and selected widgets.
 */
export default function MicWidget() {
  const mic = useContext(MicContext);
  const [devices, setDevices] = useState(false);
  const status = mic?.status ?? "off";
  const listening = status === "on" || status === "asking";
  const source = mic?.setup.source ?? "guitar";
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
      <div className="flex flex-col items-center">
        <TunerMeter hz={mic?.hz ?? null} read={readOf(mic?.hz ?? null)} size="compact" idle={listening ? "Play a note" : "Not listening"} />
      </div>
      {mic && (
        <div data-chrome className="flex items-center gap-2">
          <button
            type="button"
            onClick={mic.onToggle}
            className={`flex-1 rounded-md border px-3 py-1.5 text-sm ${listening ? "border-rose-500/60 text-rose-200 hover:bg-rose-500/10" : "border-sky-500/60 text-sky-100 hover:bg-sky-500/10"}`}
          >
            {listening ? "Stop" : "Listen"}
          </button>
          <button type="button" title="Inputs and output" aria-label="Inputs and output" onClick={() => setDevices(true)} className="rounded-md border border-slate-700 p-2 text-slate-300 hover:border-slate-500 hover:text-slate-100">
            <Icon name="settings" size={15} />
          </button>
        </div>
      )}
      {mic && devices && (
        // the dialog is drawn on the page, but its events still bubble through the widget: keep them from dragging it
        <div onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
          <Modal title="Audio input" narrow onClose={() => setDevices(false)}>
            <InputSetup setup={mic.setup} onSetup={mic.onSetup} />
            <div className="mt-4 border-t border-slate-800 pt-3">
              <AudioDevicesPanel inputs={false} />
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
  const set = (s: AudioSource, patch: Partial<SourceSetup>) => onSetup({ ...setup, [s]: { ...setup[s], ...patch } });
  return (
    <div className="flex flex-col gap-3">
      <p className="px-1 text-xs text-slate-500">One input feeds every widget. Pick which listens on the widget.</p>
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
              <option value="">The site&apos;s input (devices menu)</option>
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
