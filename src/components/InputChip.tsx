"use client";

import { useCallback, useRef, useState, useSyncExternalStore } from "react";
import Icon from "./Icon";
import { AudioDevicesPanel, useDismiss } from "./AudioDevicesButton";
import { cleanDeviceName, meterLevel, readDeviceChoice, readLiveInput, serverDeviceChoice, serverLiveInput, subscribeDeviceChoice, subscribeLiveInput } from "@/features/sound";
import type { MicStatus } from "@/components/practice/useMicPitch";

/** What a listener's status means to the person, or null when there is nothing to say (off, or listening). */
export function micStatusMessage(status: MicStatus): string | null {
  switch (status) {
    case "asking":
      return "Allow the microphone in your browser…";
    case "denied":
      return "Microphone blocked. Allow it in the browser's site settings.";
    case "insecure":
      return "The browser only allows the microphone on a secure (https) page.";
    case "error":
      return "No microphone found. Plug one in, or pick another input.";
    default:
      return null;
  }
}

/** One input's level: a short bar, bright for the input heard. */
function Bar({ level, heard }: { level: number; heard: boolean }) {
  return (
    <span className="relative h-3 w-1 overflow-hidden rounded-full bg-slate-700" aria-hidden>
      <span className={`absolute inset-x-0 bottom-0 rounded-full transition-[height] duration-75 ${heard ? "bg-emerald-400" : "bg-slate-400"}`} style={{ height: `${Math.round(meterLevel(level) * 100)}%` }} />
    </span>
  );
}

/**
 * The input next to a mic switch: a mic, the chosen input's short name and, while the app listens, a level bar per input of the
 * device (two on an audio interface, the one heard brighter). A press opens the input list (the nav's devices menu, inputs only)
 * with what `status` means, so the input can be checked and changed where the mic is used. The choice is the app's one input:
 * every chip and the nav show and change the same one. `status` is the host's listener; without it the chip only shows the input.
 */
export default function InputChip({ status = "off", align = "left", className = "" }: { status?: MicStatus; align?: "left" | "right"; className?: string }) {
  const choice = useSyncExternalStore(subscribeDeviceChoice, readDeviceChoice, serverDeviceChoice);
  const live = useSyncExternalStore(subscribeLiveInput, readLiveInput, serverLiveInput);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useDismiss(open, useCallback(() => setOpen(false), []), box);

  const name = choice.input ? cleanDeviceName(choice.input.label) : "System mic";
  const message = micStatusMessage(status);
  const blocked = status === "denied" || status === "insecure" || status === "error";
  const levels = live.listening ? live.levels : [];

  return (
    <div ref={box} className={`relative inline-flex ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Input: ${name}${message ? `. ${message}` : ""}`}
        title={message ?? "The input the app listens to"}
        className={`flex h-7 max-w-48 items-center gap-1.5 rounded-full border px-2.5 text-xs transition focus-visible:outline-2 focus-visible:outline-sky-400 ${blocked ? "border-rose-500/60 bg-rose-500/10 text-rose-200" : "border-slate-700 bg-slate-900/70 text-slate-300 hover:border-slate-500 hover:text-slate-100"}`}
      >
        <Icon name={blocked ? "alert-triangle" : "mic"} size={13} className={`shrink-0 ${status === "asking" ? "animate-pulse" : ""}`} />
        <span className="min-w-0 truncate">{name}</span>
        {levels.length > 0 && (
          <span className="flex shrink-0 items-end gap-0.5">
            {levels.map((l, i) => <Bar key={i} level={l} heard={levels.length === 1 || i === live.active} />)}
          </span>
        )}
      </button>
      {open && (
        <div role="dialog" aria-label="Input" className={`fixed inset-x-3 top-16 z-3000 max-h-[calc(100dvh-5rem)] overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-3 text-slate-200 shadow-2xl sm:absolute sm:inset-x-auto sm:top-full sm:mt-2 sm:w-80 ${align === "right" ? "sm:right-0" : "sm:left-0"}`}>
          <p className="mb-1 px-1 text-base font-medium text-slate-100">Input</p>
          <p className="mb-2 px-1 text-xs text-slate-500">
            {message ?? (levels.length > 1 ? "Two inputs: the louder one is heard." : "Used everywhere the app listens.")}
          </p>
          <AudioDevicesPanel outputs={false} />
        </div>
      )}
    </div>
  );
}
