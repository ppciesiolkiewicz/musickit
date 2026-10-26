"use client";

import { createContext, useContext, useState } from "react";
import { AudioDevicesPanel } from "@/components/AudioDevicesButton";
import Icon from "@/components/Icon";
import type { MicStatus } from "@/components/practice/useMicPitch";
import { Modal } from "@/components/ui";
import { tonicName } from "@/features/theory";

/**
 * The microphone the host listens with. It lives with the host, not the widget, so hiding the widget keeps it listening.
 * Without a provider (the editor's replay) the widget shows the microphone off, with nothing to press.
 */
export interface MicInput {
  status: MicStatus;
  /** the pitch class heard now, or null */
  heard: number | null;
  onToggle: () => void;
}

export const MicContext = createContext<MicInput | null>(null);

const STATUS: Record<MicStatus, string> = {
  off: "Off",
  asking: "Asking for the microphone…",
  on: "Listening",
  denied: "Microphone blocked",
  error: "No microphone",
  insecure: "Needs https",
};

/**
 * The microphone's face: whether it listens, the note it hears, Listen / Stop, and a cog for the input and output devices.
 * The notes light up on the pinned and selected widgets.
 */
export default function MicWidget() {
  const mic = useContext(MicContext);
  const [devices, setDevices] = useState(false);
  const status = mic?.status ?? "off";
  const listening = status === "on" || status === "asking";
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-950 p-4">
      <p className="flex items-center gap-2 text-sm font-medium text-slate-200">
        <Icon name="mic" size={16} className={listening ? "text-rose-300" : "text-slate-400"} />
        Microphone
      </p>
      <div className="flex items-center gap-4">
        <span className={`grid h-20 w-20 shrink-0 place-items-center rounded-full font-mono text-4xl font-semibold ${listening ? "bg-rose-500/15 text-slate-50 ring-2 ring-rose-400/60" : "bg-slate-800 text-slate-500"}`}>
          {mic?.heard != null ? tonicName(mic.heard) : "–"}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-wider text-slate-400">{STATUS[status]}</p>
          <p className="mt-1 text-xs text-slate-500">Lights the notes it hears on pinned and selected widgets</p>
        </div>
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
          <button type="button" title="Input and output devices" aria-label="Input and output devices" onClick={() => setDevices(true)} className="rounded-md border border-slate-700 p-2 text-slate-300 hover:border-slate-500 hover:text-slate-100">
            <Icon name="settings" size={15} />
          </button>
        </div>
      )}
      {devices && (
        // the dialog is drawn on the page, but its events still bubble through the widget: keep them from dragging it
        <div onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
          <Modal title="Audio devices" narrow onClose={() => setDevices(false)}>
            <AudioDevicesPanel />
          </Modal>
        </div>
      )}
    </div>
  );
}
