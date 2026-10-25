"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Icon from "./Icon";
import { canChooseOutput, cleanDeviceName, findDevice, listAudioDevices, readDeviceChoice, revealDevices, serverDeviceChoice, setDeviceChoice, subscribeDeviceChoice, type AudioDevice } from "@/features/sound";

const subscribeNever = () => () => {};

/** A device list in the menu: "System default" first, then each device; a click chooses it. */
function DeviceList({ icon, title, hint, items, chosen, onPick }: { icon: "mic" | "headphones"; title: string; hint: string; items: AudioDevice[]; chosen: AudioDevice | null; onPick: (d: AudioDevice | null) => void }) {
  const row = (d: AudioDevice | null) => {
    const on = d ? chosen?.id === d.id : !chosen;
    return (
      <li key={d?.id ?? ""}>
        <button
          type="button"
          aria-pressed={on}
          onClick={() => onPick(d)}
          className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition focus-visible:outline-2 focus-visible:outline-sky-400 ${on ? "border-sky-500/60 bg-sky-500/15 text-sky-100" : "border-transparent text-slate-300 hover:border-slate-700 hover:bg-slate-800/60 hover:text-slate-100"}`}
        >
          <span className="min-w-0 flex-1 truncate">{d ? cleanDeviceName(d.label) : "System default"}</span>
          {on && <Icon name="check" size={15} className="shrink-0 text-sky-400" />}
        </button>
      </li>
    );
  };
  return (
    <section>
      <h3 className="mb-1 flex items-center gap-2 px-1 text-xs text-slate-500">
        <span className="grid size-6 place-items-center rounded-lg bg-sky-500/15 text-sky-300">
          <Icon name={icon} size={13} />
        </span>
        <span className="font-medium uppercase tracking-wider text-slate-400">{title}</span>
        <span className="truncate">{hint}</span>
      </h3>
      <ul className="flex flex-col gap-0.5">
        {row(null)}
        {items.map(row)}
      </ul>
    </section>
  );
}

/**
 * The devices button for pages that listen or play: a cog with a headphones and a guitar badge, and the menu it opens to pick the
 * input (the mic the page listens to) and the output (where the sound plays). Nothing opens by itself and no device is opened until
 * the person presses "Detect devices". Shared; the choice lives in `@/features/sound`.
 */
export default function AudioDevicesButton({ className = "" }: { className?: string }) {
  const choice = useSyncExternalStore(subscribeDeviceChoice, readDeviceChoice, serverDeviceChoice);
  const outputs = useSyncExternalStore(subscribeNever, canChooseOutput, () => false);
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<{ inputs: AudioDevice[]; outputs: AudioDevice[] }>({ inputs: [], outputs: [] });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null);

  const refresh = useCallback(() => listAudioDevices().then(setList), []);

  useEffect(() => {
    if (!open) return;
    void refresh();
    const away = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const changed = () => void refresh();
    window.addEventListener("pointerdown", away);
    window.addEventListener("keydown", esc);
    navigator.mediaDevices?.addEventListener?.("devicechange", changed);
    return () => {
      window.removeEventListener("pointerdown", away);
      window.removeEventListener("keydown", esc);
      navigator.mediaDevices?.removeEventListener?.("devicechange", changed);
    };
  }, [open, refresh]);

  const detect = async () => {
    setBusy(true);
    setError(null);
    try {
      await revealDevices();
    } catch (e) {
      setError(e instanceof DOMException && (e.name === "NotAllowedError" || e.name === "SecurityError") ? "The browser did not allow the microphone, so device names stay hidden." : "No microphone found.");
    } finally {
      await refresh();
      setBusy(false);
    }
  };

  // a remembered device that is not plugged in shows as the default, which is what plays
  const input = findDevice(list.inputs, choice.input) ?? (list.inputs.length ? null : choice.input);
  const output = findDevice(list.outputs, choice.output) ?? (list.outputs.length ? null : choice.output);
  const unnamed = list.inputs.some((d) => /^Input \d+$/.test(d.label)) || !list.inputs.length;
  const label = `Audio devices: input ${choice.input ? cleanDeviceName(choice.input.label) : "system default"}, output ${choice.output ? cleanDeviceName(choice.output.label) : "system default"}`;

  return (
    <div ref={box} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={label}
        title="Audio input and output"
        className="group flex h-8 items-center gap-1 rounded-full border border-sky-500/45 bg-slate-900/70 px-2 sm:gap-2 sm:pl-2.5 sm:pr-3 text-slate-100 backdrop-blur transition hover:border-sky-400"
      >
        <Icon name="settings" size={15} className="text-sky-400 transition-transform duration-300 group-hover:rotate-45" />
        <span className="hidden h-3.5 w-px bg-slate-500/50 sm:block" aria-hidden />
        <span className="flex items-center gap-1 text-slate-300 sm:gap-1.5 transition group-hover:text-slate-100" aria-hidden>
          <Icon name="headphones" size={14} />
          <Icon name="guitar" size={14} />
        </span>
      </button>
      {open && (
        // the app's own panel, so it follows the style (slate and sky are remapped per style)
        <div role="dialog" aria-label="Audio devices" className="fixed inset-x-3 top-16 z-3000 max-h-[calc(100dvh-5rem)] overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-3 text-slate-200 shadow-2xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96">
          <p className="mb-2 px-1 text-base font-medium text-slate-100">Audio devices</p>
          <div className="flex flex-col gap-3">
            <DeviceList icon="mic" title="Input" hint="what the page hears" items={list.inputs} chosen={input} onPick={(d) => setDeviceChoice({ input: d })} />
            {outputs ? (
              <DeviceList icon="headphones" title="Output" hint="where the sound plays" items={list.outputs} chosen={output} onPick={(d) => setDeviceChoice({ output: d })} />
            ) : (
              <p className="flex items-center gap-2 px-1 text-xs text-slate-500">
                <Icon name="headphones" size={13} />
                This browser plays through the system output only.
              </p>
            )}
          </div>
          <div className="mt-3 flex items-center gap-3 border-t border-slate-800 px-1 pt-3">
            <p className="min-w-0 flex-1 text-xs text-slate-500">
              {error ? <span className="text-rose-300">{error}</span> : unnamed ? "Names appear once the browser allows the microphone." : "Plug something in? Detect it again."}
            </p>
            <button type="button" disabled={busy} onClick={() => void detect()} className="shrink-0 rounded-lg border border-sky-500 bg-sky-500/10 px-3 py-1.5 text-sm text-sky-100 transition hover:bg-sky-500/20 disabled:opacity-50">
              {busy ? "Looking…" : "Detect devices"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
