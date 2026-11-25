"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EffectChain, INPUT_STACKS, getChoice, stackSpecs, type InputStack } from "@/features/instruments/model";
import { getAudioContext, getOutputBus } from "@/features/sound";
import { channelHeard, useAppChannels } from "./InputChannels";
import { wireNam } from "./namWiring";

/** the sound picked for each input (Input 1, Input 2), kept in this browser for every record page */
const KEY = "musickit.record.sounds";
/** the first version: one sound for the whole input, read as Input 1's */
const OLD_KEY = "musickit.record.sound";
const GROUPS = ["Guitar", "Vocal"] as const;
type Picks = [string, string];

function readPicks(): Picks {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (Array.isArray(v) && v.length === 2 && v.every((x) => typeof x === "string")) return [v[0], v[1]];
    return [localStorage.getItem(OLD_KEY) ?? "", ""];
  } catch {
    return ["", ""];
  }
}

export interface RecordSound {
  /** the id of the stack on each input, "" for none */
  picks: Picks;
  pick(input: 0 | 1, id: string): void;
  /** the stacks to offer: an amp only once its model is on this device */
  stacks: InputStack[];
  /** a device with two inputs (an audio interface): each has its own sound; else Input 1's sound is the input's */
  two: boolean;
  /** which inputs are recorded (the app's channel choice): only their lists show */
  heard: [boolean, boolean];
  hear: boolean;
  setHear(on: boolean): void;
  /** input `i`'s effects, for `openRecordInput({ through })`: made on the first call, which needs a click before it */
  through(i: number): { input: AudioNode; output: AudioNode };
}

/**
 * The sound of a recorder's input: one of the looper's guitar and vocal effect stacks (`INPUT_STACKS`) per input of the device, each on
 * an `EffectChain` that input is recorded through (an audio interface: a guitar sound on Input 1, a vocal sound on Input 2). The chains
 * live as long as the host, so picking another sound changes the take from then on without reopening the input. An amp stack is offered
 * only when its NAM model is in this browser's library (loaded in the looper). "Hear the input" plays the chains to the speakers (off on
 * every visit: a mic near speakers feeds back).
 */
export function useRecordSound(): RecordSound {
  const [picks, setPicks] = useState<Picks>(readPicks);
  const [models, setModels] = useState<Record<string, number>>({});
  const [hear, setHearState] = useState(false);
  const { choice, show } = useAppChannels();
  const chains = useRef<(EffectChain | null)[]>([null, null]);
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
  const found = picks.map((id) => stacks.find((s) => s.id === id) ?? null);
  // one input (a mic, or one sound copied to both channels): Input 1's sound is on both parts, which then add up to it
  const [a, b] = [found[0]?.id ?? "", (show ? found[1] : found[0])?.id ?? ""];
  const specs = useMemo(() => [a, b].map((id) => {
    const s = stacks.find((x) => x.id === id);
    return s ? stackSpecs(s, models[s.id] ?? 0) : [];
  }), [a, b, stacks, models]);
  const now = useRef({ specs, hear });
  useEffect(() => {
    now.current = { specs, hear };
    chains.current.forEach((c, i) => c?.setEffects(specs[i]));
    if (monitor.current) monitor.current.gain.value = hear ? 1 : 0;
  }, [specs, hear]);

  useEffect(() => () => {
    chains.current.forEach((c) => c?.dispose());
    chains.current = [null, null];
    monitor.current?.disconnect();
    monitor.current = null;
  }, []);

  const through = useCallback((i: number) => {
    const ctx = getAudioContext();
    if (!monitor.current) {
      monitor.current = ctx.createGain();
      monitor.current.gain.value = now.current.hear ? 1 : 0;
      monitor.current.connect(getOutputBus());
    }
    const k = i === 1 ? 1 : 0;
    let c = chains.current[k];
    if (!c) {
      c = new EffectChain(ctx);
      c.setEffects(now.current.specs[k]);
      c.output.connect(monitor.current);
      chains.current[k] = c;
    }
    return c;
  }, []);

  const pick = useCallback((input: 0 | 1, id: string) => {
    setPicks((p) => {
      const next: Picks = input === 0 ? [id, p[1]] : [p[0], id];
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* this visit only */ }
      return next;
    });
  }, []);

  return {
    picks: [found[0]?.id ?? "", found[1]?.id ?? ""],
    pick,
    stacks,
    two: show,
    heard: [channelHeard(choice.channel, 0), channelHeard(choice.channel, 1)],
    hear,
    setHear: setHearState,
    through,
  };
}

const select = "max-w-48 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100";
const TITLE = "The effects the take is recorded with: the guitar and vocal sounds of the looper. An amp is listed once its model is loaded in the looper on this device.";

/**
 * The Sound lists and Hear the input of a recorder (the content video record page), beside its Input list: one Sound list for a mic,
 * or Input 1 and Input 2 for an audio interface (only the inputs the channel choice records).
 */
export default function RecordSoundSelect({ sound, className = "" }: { sound: RecordSound; className?: string }) {
  const list = (input: 0 | 1, label: string) => (
    <label key={input} className="flex items-center gap-1.5 text-slate-300" title={TITLE}>{label}
      <select value={sound.picks[input]} onChange={(e) => sound.pick(input, e.target.value)} className={select}>
        <option value="">No effects</option>
        {GROUPS.map((g) => (
          <optgroup key={g} label={g}>
            {sound.stacks.filter((s) => s.group === g).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </optgroup>
        ))}
      </select>
    </label>
  );
  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-1.5 ${className}`}>
      {sound.two
        ? ([0, 1] as const).filter((i) => sound.heard[i]).map((i) => list(i, `Input ${i + 1} sound`))
        : list(0, "Sound")}
      <label className="flex items-center gap-1.5 text-slate-300" title="Plays the input through the speakers with its sound, while the camera is open. Use headphones: a mic near speakers feeds back.">
        <input type="checkbox" checked={sound.hear} onChange={(e) => sound.setHear(e.target.checked)} className="accent-emerald-500" /> Hear the input
      </label>
    </div>
  );
}
