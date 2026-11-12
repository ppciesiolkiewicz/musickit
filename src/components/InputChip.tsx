"use client";

import { useCallback, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Icon from "./Icon";
import { Modal } from "@/components/ui";
import { AudioDevicesPanel, useDismiss } from "./AudioDevicesButton";
import MicButton from "./theory/singing/MicButton";
import { LevelBar, channelHeard } from "./InputChannels";
import { cleanDeviceName, readDeviceChoice, readLiveInput, serverDeviceChoice, serverLiveInput, subscribeDeviceChoice, subscribeLiveInput } from "@/features/sound";
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

const EDGE = 12;
const GAP = 8;

/**
 * Where the input list goes on screen: under the chip (over it when there is more room above), as wide as fits up to 20rem, lined up
 * with the chip's `align` edge and kept inside the viewport.
 */
function placeList(chip: DOMRect, align: "left" | "right"): React.CSSProperties {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const width = Math.min(320, vw - EDGE * 2);
  const left = Math.min(Math.max(align === "right" ? chip.right - width : chip.left, EDGE), vw - EDGE - width);
  const below = vh - chip.bottom - GAP - EDGE;
  const above = chip.top - GAP - EDGE;
  return below >= 280 || below >= above
    ? { left, width, top: chip.bottom + GAP, maxHeight: below }
    : { left, width, bottom: vh - chip.top + GAP, maxHeight: above };
}

/**
 * The input next to a mic switch: a mic, the chosen input's short name and, while the app listens, a level bar per input of the
 * device (two on an audio interface, the channel heard brighter: both by default). A press opens the input list (the nav's devices menu, the output
 * folded into one row)
 * with what `status` means, so the input can be checked and changed where the mic is used. The choice is the app's one input:
 * every chip and the nav show and change the same one. `status` is the host's listener; without it the chip only shows the input.
 * Given `mic` (the host's own mic switch) it is the one mic button: it reads "Start microphone" while off, a press starts the mic and
 * opens the list, and the list holds Start / Stop. Without `mic` the host opens the mic itself (on Start, on Record), so a press only opens the list.
 * `mode` "modal" (the default) opens the list as a dialog over the page (the whole screen on a phone); "popover" drops it under the chip.
 */
export default function InputChip({ status = "off", mic, align = "left", mode = "modal", className = "" }: { status?: MicStatus; mic?: { on: boolean; onToggle: () => void }; align?: "left" | "right"; mode?: "modal" | "popover"; className?: string }) {
  const choice = useSyncExternalStore(subscribeDeviceChoice, readDeviceChoice, serverDeviceChoice);
  const live = useSyncExternalStore(subscribeLiveInput, readLiveInput, serverLiveInput);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  // the modal closes itself (Escape, backdrop, Close); the popover closes on a press outside it
  useDismiss(open && mode === "popover", close, box, list);
  // the list is portalled to the body and placed from the chip's rect, so a host card with a transform or overflow (the quick
  // recorder, a tuner panel) can't push it off screen or clip it
  const [place, setPlace] = useState<React.CSSProperties | null>(null);
  useLayoutEffect(() => {
    // a stale place from the last opening is replaced before paint, so closing needs no reset
    if (!open || mode !== "popover") return;
    const update = () => box.current && setPlace(placeList(box.current.getBoundingClientRect(), align));
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, align, mode]);

  const name = choice.input ? cleanDeviceName(choice.input.label) : "System mic";
  const message = micStatusMessage(status);
  const blocked = status === "denied" || status === "insecure" || status === "error";
  const levels = live.listening ? live.levels : [];
  const press = () => {
    if (!open && mic && !mic.on) mic.onToggle();
    setOpen(!open);
  };
  const tone = blocked ? "border-rose-500/60 bg-rose-500/10 text-rose-200"
    : mic ? `border-emerald-400/60 hover:bg-emerald-500/20 ${mic.on ? "bg-emerald-500/25 text-emerald-100" : "bg-emerald-500/10 text-emerald-200"}`
    : "border-slate-700 bg-slate-900/70 text-slate-300 hover:border-slate-500 hover:text-slate-100";

  const body = (
    <>
      <p className="mb-2 px-1 text-xs text-slate-500">
        {message ?? (levels.length > 1 ? "Two inputs: pick the channel the app hears." : "Used everywhere the app listens.")}
      </p>
      {mic && <MicButton on={mic.on} onClick={mic.onToggle} className="mb-3 w-full justify-center" />}
      <AudioDevicesPanel outputs="collapsed" listening={status === "on"} />
    </>
  );

  return (
    <div ref={box} className={`relative inline-flex ${className}`}>
      <button
        type="button"
        onClick={press}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Input: ${name}${message ? `. ${message}` : ""}`}
        title={message ?? (mic ? (mic.on ? "Pick the input, or stop the microphone" : "Start the microphone and pick the input") : "The input the app listens to")}
        className={`flex h-7 max-w-48 items-center gap-1.5 rounded-full border px-2.5 text-xs transition lg:h-9 lg:max-w-56 lg:px-3.5 lg:text-sm focus-visible:outline-2 focus-visible:outline-sky-400 ${tone}`}
      >
        <Icon name={blocked ? "alert-triangle" : "mic"} size={13} className={`shrink-0 ${status === "asking" ? "animate-pulse" : ""}`} />
        <span className="min-w-0 truncate">{mic && !mic.on ? "Start microphone" : name}</span>
        {levels.length > 0 && (
          <span className="flex shrink-0 items-end gap-0.5">
            {levels.map((l, i) => <LevelBar key={i} level={l} heard={levels.length === 1 || channelHeard(choice.channel, i)} />)}
          </span>
        )}
      </button>
      {open && mode === "modal" && (
        <Modal title="Input" narrow onClose={close}>
          <div className="text-slate-200">{body}</div>
        </Modal>
      )}
      {open && mode === "popover" && place && createPortal(
        <div ref={list} role="dialog" aria-label="Input" style={place} className="fixed z-3000 overflow-y-auto overscroll-contain rounded-2xl border border-slate-700 bg-slate-900 p-3 text-slate-200 shadow-2xl">
          <p className="mb-1 px-1 text-base font-medium text-slate-100">Input</p>
          {body}
        </div>,
        document.body,
      )}
    </div>
  );
}
