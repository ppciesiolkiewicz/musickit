"use client";

import { useMemo, useState } from "react";
import Icon from "../Icon";
import EffectsModal from "./EffectsModal";
import LevelMeter from "./LevelMeter";
import type { LooperEngine, LooperSnapshot } from "@/lib/looper/engine";

const tbtn = "grid h-6 min-w-6 place-items-center rounded-md border border-slate-700/80 bg-slate-900/80 px-1 text-[10px] text-slate-300 transition hover:border-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400";
const MASTER = { master: true } as const;

/** The effects of the master bus, which is the global output: everything the looper plays passes through it. */
export function MasterEffects({ engine, snap, onClose }: { engine: LooperEngine; snap: LooperSnapshot; onClose: () => void }) {
  return (
    <EffectsModal
      title={<span className="flex items-center gap-2"><Icon name="audio-lines" size={16} />Master bus: effects</span>}
      effects={snap.masterEffects}
      pinScope="m:master"
      volume={{ value: snap.masterVolume, onChange: (v) => engine.do({ type: "master.volume", value: v }) }}
      onAdd={(k, post) => engine.do({ type: "fx.add", target: MASTER, fx: { kind: k, post } })}
      onRemove={(id) => engine.do({ type: "fx.remove", target: MASTER, id })}
      onParam={(id, key, value) => engine.do({ type: "fx.param", target: MASTER, id, key, value })}
      onBypass={(id) => engine.do({ type: "fx.bypass", target: MASTER, id, bypass: !snap.masterEffects.find((e) => e.id === id)?.bypass })}
      onPost={(id, post) => engine.setMasterEffectPost(id, post)}
      onClose={onClose}
    />
  );
}

/** Level, volume, mute and effects of the master bus. The same controls appear in the mixer and in the settings, because both are the one master bus. */
export default function MasterControls({ engine, snap }: { engine: LooperEngine; snap: LooperSnapshot }) {
  const [fx, setFx] = useState(false);
  const getMaster = useMemo(() => () => engine.getMasterLevel(), [engine]);
  const n = snap.masterEffects.length;
  return (
    <>
      <LevelMeter vertical getLevel={getMaster} />
      <input type="range" min={0} max={1.5} step={0.01} value={snap.masterVolume} onChange={(e) => engine.do({ type: "master.volume", value: Number(e.target.value) })} className="w-24 accent-sky-400" aria-label="Master volume" title={`Master ${Math.round(snap.masterVolume * 100)}%`} />
      <button type="button" className={`${tbtn} ${snap.masterMuted ? "!border-amber-400 !text-amber-200" : ""}`} aria-pressed={snap.masterMuted} onClick={() => engine.do({ type: "master.mute", on: !snap.masterMuted })} title={snap.masterMuted ? "Unmute the master bus" : "Mute the master bus"} aria-label="Mute the master bus">M</button>
      <button type="button" className={`${tbtn} relative`} onClick={() => setFx(true)} title={`Effects on the master bus${n ? ` (${n})` : ""}`} aria-label="Effects of the master bus">
        <Icon name="audio-lines" size={13} />
        {n > 0 && <span className="absolute -right-1 -top-1 grid h-3.5 min-w-3.5 place-items-center rounded-full bg-sky-500 px-0.5 text-[9px] font-semibold text-slate-950">{n}</span>}
      </button>
      {fx && <MasterEffects engine={engine} snap={snap} onClose={() => setFx(false)} />}
    </>
  );
}
