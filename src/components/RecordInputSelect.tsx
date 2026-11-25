"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { AppInputChannels, LevelBar } from "./InputChannels";
import { cleanDeviceName, findDevice, listAudioDevices, readDeviceChoice, readLiveInput, serverDeviceChoice, serverLiveInput, setDeviceChoice, subscribeDeviceChoice, subscribeLiveInput, type AudioDevice } from "@/features/sound";

/**
 * The Input list of a recorder (the content video and riff record pages): the app's input (`DeviceChoice.input`, the same choice as
 * Input in the nav's devices menu), with each input's level while it is open and, for a two-input device, its channels. The host opens
 * the input itself (`openRecordInput`) and reopens it when the choice changes (`onPick`). Lists the devices while shown, again when the
 * list is focused and when one is plugged in or out; names appear once the browser has allowed the mic.
 */
export default function RecordInputSelect({ onPick, className = "" }: { onPick?: (d: AudioDevice | null) => void; className?: string }) {
  const choice = useSyncExternalStore(subscribeDeviceChoice, readDeviceChoice, serverDeviceChoice);
  const live = useSyncExternalStore(subscribeLiveInput, readLiveInput, serverLiveInput);
  const [inputs, setInputs] = useState<AudioDevice[]>([]);
  const refresh = useCallback(() => void listAudioDevices().then((l) => setInputs(l.inputs), () => {}), []);
  useEffect(() => {
    refresh();
    const md = navigator.mediaDevices;
    md?.addEventListener?.("devicechange", refresh);
    return () => md?.removeEventListener?.("devicechange", refresh);
  }, [refresh]);
  // the input opening names the devices
  const open = live.listening > 0;
  useEffect(() => { if (open) refresh(); }, [open, refresh]);

  // a remembered input that isn't plugged in shows as itself until the list is read, then as missing
  const found = findDevice(inputs, choice.input);
  const value = found?.id ?? choice.input?.id ?? "";
  const pick = (id: string) => {
    const d = inputs.find((x) => x.id === id) ?? null;
    setDeviceChoice({ input: d });
    onPick?.(d);
  };
  const levels = open ? live.levels : [];
  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-1.5 ${className}`}>
      <label className="flex items-center gap-1.5 text-slate-300" title="The mic the take records. It is the same as Input in the audio devices menu. Changing it restarts the mic.">Input
        <select value={value} onFocus={refresh} onChange={(e) => pick(e.target.value)} className="max-w-48 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100">
          <option value="">System default</option>
          {inputs.map((d) => <option key={d.id} value={d.id}>{cleanDeviceName(d.label)}</option>)}
          {choice.input && !found && <option value={choice.input.id}>{cleanDeviceName(choice.input.label)} (not connected)</option>}
        </select>
        {levels.length > 0 && (
          <span className="flex h-5 items-end gap-0.5" title="The input's level: play and watch it move.">
            {levels.map((l, i) => <LevelBar key={i} level={l} heard className="h-5" />)}
          </span>
        )}
      </label>
      <AppInputChannels className="w-56" />
    </div>
  );
}
