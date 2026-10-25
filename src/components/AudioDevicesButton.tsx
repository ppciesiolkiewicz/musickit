"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Icon from "./Icon";
import { canChooseOutput, cleanDeviceName, findDevice, listAudioDevices, readDeviceChoice, revealDevices, serverDeviceChoice, setDeviceChoice, subscribeDeviceChoice, type AudioDevice } from "@/features/sound";

const subscribeNever = () => () => {};

/** A device list in the menu: "System default" first, then each device; a click chooses it. */
function DeviceList({ icon, title, items, chosen, onPick }: { icon: "mic" | "headphones"; title: string; items: AudioDevice[]; chosen: AudioDevice | null; onPick: (d: AudioDevice | null) => void }) {
  const row = (d: AudioDevice | null) => {
    const on = d ? chosen?.id === d.id : !chosen;
    return (
      <li key={d?.id ?? ""}>
        <button
          type="button"
          aria-pressed={on}
          onClick={() => onPick(d)}
          className={`flex w-full items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left text-[13px] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#18181b] ${on ? "border-[#18181b] bg-white font-medium text-[#18181b]" : "border-[#e4e4e7] bg-[#f0f0f2] text-[#3f3f46] hover:border-[#a1a1aa]"}`}
        >
          <span className="min-w-0 flex-1 truncate">{d ? cleanDeviceName(d.label) : "System default"}</span>
          {on && <span className="text-[11px] text-[#71717a]">in use</span>}
        </button>
      </li>
    );
  };
  return (
    <section className="text-left">
      <h3 className="mb-1.5 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-[#71717a]">
        <Icon name={icon} size={13} />
        {title}
      </h3>
      <ul className="flex flex-col gap-1">
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
        className="flex h-8 items-center gap-1 rounded-full border border-sky-500/45 bg-slate-900/70 pl-2 pr-1.5 text-slate-100 backdrop-blur transition hover:border-sky-400"
      >
        <Icon name="settings" size={16} className="text-sky-400" />
        <span className="flex items-center -space-x-1" aria-hidden>
          <span className="grid h-5 w-5 place-items-center rounded-full border border-slate-700 bg-slate-800 text-slate-200">
            <Icon name="headphones" size={11} />
          </span>
          <span className="grid h-5 w-5 place-items-center rounded-full border border-slate-700 bg-slate-800 text-slate-200">
            <Icon name="guitar" size={11} />
          </span>
        </span>
      </button>
      {open && (
        // the same plain card as the style picker next to it
        <div role="dialog" aria-label="Audio devices" className="fixed inset-x-4 top-16 z-[3000] max-h-[calc(100dvh-5rem)] overflow-y-auto rounded-[22px] border border-[#e4e4e7] bg-[#fafafa] px-4 pb-3 pt-4 text-[#18181b] shadow-[0_24px_60px_-20px_rgb(0_0_0/0.55)] [font-family:var(--font-geist-sans)] sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2.5 sm:w-[25rem]">
          <p className="mb-3 text-center text-[17px] font-medium">Your audio devices</p>
          <div className="flex flex-col gap-3">
            <DeviceList icon="mic" title="Input (what the page listens to)" items={list.inputs} chosen={input} onPick={(d) => setDeviceChoice({ input: d })} />
            {outputs ? (
              <DeviceList icon="headphones" title="Output (where the sound plays)" items={list.outputs} chosen={output} onPick={(d) => setDeviceChoice({ output: d })} />
            ) : (
              <p className="flex items-center gap-1.5 text-left text-[12px] text-[#71717a]">
                <Icon name="headphones" size={13} />
                This browser plays through the system output only.
              </p>
            )}
          </div>
          {unnamed && <p className="mt-3 text-left text-[12px] text-[#71717a]">Device names appear once the browser allows the microphone.</p>}
          {error && <p className="mt-2 text-left text-[12px] text-[#b91c1c]">{error}</p>}
          <button type="button" disabled={busy} onClick={() => void detect()} className="mt-3 w-full rounded-full border border-[#18181b] px-3 py-1.5 text-[13px] font-medium hover:bg-white disabled:opacity-50">
            {busy ? "Looking…" : "Detect devices"}
          </button>
        </div>
      )}
    </div>
  );
}
