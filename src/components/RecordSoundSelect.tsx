"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EffectChain, INPUT_STACKS, getChoice, stackSpecs, type InputStack } from "@/features/instruments/model";
import { getAudioContext, getOutputBus } from "@/features/sound";
import { wireNam } from "./namWiring";

/** the sound picked last, kept in this browser for every record page */
const KEY = "musickit.record.sound";
const GROUPS = ["Guitar", "Vocal"] as const;

export interface RecordSound {
  /** the id of the stack on the input, "" for none */
  stack: string;
  pick(id: string): void;
  /** the stacks to offer: an amp only once its model is on this device */
  stacks: InputStack[];
  hear: boolean;
  setHear(on: boolean): void;
  /** the effects to record through, for `openRecordInput({ through })`: made on the first call, which needs a click before it */
  through(): { input: AudioNode; output: AudioNode };
}

/**
 * The sound of a recorder's input: one of the looper's guitar and vocal effect stacks (`INPUT_STACKS`) on one `EffectChain` the take is
 * recorded through. The chain lives as long as the host, so picking another sound changes the take from then on without reopening the
 * input. An amp stack is offered only when its NAM model is in this browser's library (loaded in the looper). "Hear the input" plays
 * the chain to the speakers (off on every visit: a mic near speakers feeds back).
 */
export function useRecordSound(): RecordSound {
  const [stored, setStored] = useState(() => { try { return localStorage.getItem(KEY) ?? ""; } catch { return ""; } });
  const [models, setModels] = useState<Record<string, number>>({});
  const [hear, setHearState] = useState(false);
  const chain = useRef<EffectChain | null>(null);
  const monitor = useRef<GainNode | null>(null);

  // which amps this device has a model for
  useEffect(() => {
    wireNam();
    const find = getChoice("nam-model")?.find;
    if (!find) return;
    let gone = false;
    for (const s of INPUT_STACKS) {
      if (!s.amp) continue;
      void find(s.amp).then((id) => { if (id && !gone) setModels((m) => ({ ...m, [s.id]: id })); }, () => undefined);
    }
    return () => { gone = true; };
  }, []);

  const stacks = useMemo(() => INPUT_STACKS.filter((s) => !s.amp || models[s.id]), [models]);
  // a remembered amp whose model is gone records with no effects, and comes back with the model
  const picked = stacks.find((s) => s.id === stored) ?? null;
  const specs = useMemo(() => (picked ? stackSpecs(picked, models[picked.id] ?? 0) : []), [picked, models]);
  const now = useRef({ specs, hear });
  useEffect(() => {
    now.current = { specs, hear };
    chain.current?.setEffects(specs);
    if (monitor.current) monitor.current.gain.value = hear ? 1 : 0;
  }, [specs, hear]);

  useEffect(() => () => {
    chain.current?.dispose();
    chain.current = null;
    monitor.current?.disconnect();
    monitor.current = null;
  }, []);

  const through = useCallback(() => {
    if (!chain.current) {
      const ctx = getAudioContext();
      const c = new EffectChain(ctx);
      c.setEffects(now.current.specs);
      const m = ctx.createGain();
      m.gain.value = now.current.hear ? 1 : 0;
      c.output.connect(m);
      m.connect(getOutputBus());
      chain.current = c;
      monitor.current = m;
    }
    return chain.current;
  }, []);

  const pick = useCallback((id: string) => {
    setStored(id);
    try { localStorage.setItem(KEY, id); } catch { /* this visit only */ }
  }, []);

  return { stack: picked?.id ?? "", pick, stacks, hear, setHear: setHearState, through };
}

/** The Sound list and Hear the input of a recorder (the content video record page), beside its Input list. */
export default function RecordSoundSelect({ sound, className = "" }: { sound: RecordSound; className?: string }) {
  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-1.5 ${className}`}>
      <label className="flex items-center gap-1.5 text-slate-300" title="The effects the take is recorded with: the guitar and vocal sounds of the looper. An amp is listed once its model is loaded in the looper on this device.">Sound
        <select value={sound.stack} onChange={(e) => sound.pick(e.target.value)} className="max-w-48 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100">
          <option value="">No effects</option>
          {GROUPS.map((g) => (
            <optgroup key={g} label={g}>
              {sound.stacks.filter((s) => s.group === g).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </optgroup>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-1.5 text-slate-300" title="Plays the input through the speakers with the sound picked, while the camera is open. Use headphones: a mic near speakers feeds back.">
        <input type="checkbox" checked={sound.hear} onChange={(e) => sound.setHear(e.target.checked)} className="accent-emerald-500" /> Hear the input
      </label>
    </div>
  );
}
