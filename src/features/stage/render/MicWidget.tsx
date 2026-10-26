"use client";

import { createContext, useContext } from "react";
import Icon from "@/components/Icon";
import type { MicStatus } from "@/components/practice/useMicPitch";
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

/** The microphone's face: whether it listens, the note it hears, and Listen / Stop. The notes light up on the pinned and selected widgets. */
export default function MicWidget() {
  const mic = useContext(MicContext);
  const status = mic?.status ?? "off";
  const listening = status === "on" || status === "asking";
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950 p-3">
      <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-full ${listening ? "bg-rose-500/20 text-rose-300" : "bg-slate-800 text-slate-400"}`}>
        <Icon name="mic" size={22} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs uppercase tracking-wider text-slate-400">{STATUS[status]}</p>
        <p className="font-mono text-3xl font-semibold text-slate-100">{mic?.heard != null ? tonicName(mic.heard) : "–"}</p>
      </div>
      {mic && (
        <button
          data-chrome
          type="button"
          onClick={mic.onToggle}
          className={`rounded-md border px-3 py-1.5 text-sm ${listening ? "border-rose-500/60 text-rose-200 hover:bg-rose-500/10" : "border-sky-500/60 text-sky-100 hover:bg-sky-500/10"}`}
        >
          {listening ? "Stop" : "Listen"}
        </button>
      )}
    </div>
  );
}
