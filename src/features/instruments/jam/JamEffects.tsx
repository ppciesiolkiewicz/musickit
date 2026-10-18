"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import EffectControls from "../effects/EffectControls";
import { EFFECT_DEFS, EFFECT_KINDS, defaultParams, moveEffect, type EffectKind, type EffectSpec } from "../effects/effects";
import { MAX_LOOP_EFFECTS } from "./loops";
import { Modal, hueAt, hueClass, ibtn } from "@/components/ui";

let nextFx = 1;
const newFxId = () => `fx-${Date.now().toString(36)}-${nextFx++}`;

/** The effects on one loop's input, top to bottom in signal order: add, tweak, bypass, reorder, remove. They are in what the loop records. */
export default function JamEffects({ name, effects, onChange, onClose }: { name: string; effects: EffectSpec[]; onChange: (effects: EffectSpec[]) => void; onClose: () => void }) {
  const [adding, setAdding] = useState(effects.length === 0);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const patch = (id: string, p: Partial<EffectSpec>) => onChange(effects.map((e) => (e.id === id ? { ...e, ...p } : e)));
  const add = (kind: EffectKind) => {
    onChange([...effects, { id: newFxId(), kind, bypass: false, post: false, params: defaultParams(kind) }]);
    setAdding(false);
  };
  const full = effects.length >= MAX_LOOP_EFFECTS;
  return (
    <Modal title={`Effects on the input of ${name}`} onClose={onClose}>
      <div className="flex flex-col gap-2">
        {effects.map((fx, i) => {
          const def = EFFECT_DEFS[fx.kind];
          const collapsed = open[fx.id] === false;
          return (
            <section key={fx.id} className={`flex flex-col gap-1.5 rounded-xl border border-slate-800 bg-slate-900/50 p-2 ${fx.bypass ? "opacity-60" : ""}`}>
              <div className="flex items-center gap-1.5">
                <button type="button" className={ibtn} aria-expanded={!collapsed} onClick={() => setOpen({ ...open, [fx.id]: collapsed })} title={collapsed ? "Show settings" : "Hide settings"} aria-label={`${collapsed ? "Show" : "Hide"} ${def.name} settings`}><Icon name="chevron-right" size={14} className={collapsed ? "" : "rotate-90"} /></button>
                <h3 className="min-w-0 flex-1 truncate text-sm font-medium text-slate-100">{def.name}</h3>
                <button type="button" className={ibtn} disabled={i === 0} onClick={() => onChange(moveEffect(effects, fx.id, -1))} title="Earlier in the chain" aria-label={`Move ${def.name} earlier`}><Icon name="chevron-right" size={14} className="-rotate-90" /></button>
                <button type="button" className={ibtn} disabled={i === effects.length - 1} onClick={() => onChange(moveEffect(effects, fx.id, 1))} title="Later in the chain" aria-label={`Move ${def.name} later`}><Icon name="chevron-right" size={14} className="rotate-90" /></button>
                <button type="button" className={`${ibtn} ${fx.bypass ? "" : "!border-emerald-500/70 !text-emerald-200"}`} aria-pressed={!fx.bypass} onClick={() => patch(fx.id, { bypass: !fx.bypass })} title={fx.bypass ? "Bypassed (tap to switch on)" : "On (tap to bypass)"} aria-label={`${def.name} on or off`}><Icon name="power" /></button>
                <button type="button" className={ibtn} onClick={() => onChange(effects.filter((e) => e.id !== fx.id))} title="Remove" aria-label={`Remove ${def.name}`}><Icon name="trash" /></button>
              </div>
              {!collapsed && <EffectControls fx={fx} onParam={(key, value) => patch(fx.id, { params: { ...fx.params, [key]: value } })} />}
            </section>
          );
        })}
        {adding ? (
          <div className="flex flex-wrap gap-1.5 rounded-xl border border-slate-800 p-2" role="group" aria-label="Add an effect">
            {EFFECT_KINDS.map((k, i) => (
              <button key={k} type="button" className={`rounded-lg border px-2.5 py-1 text-xs transition ${hueClass(hueAt(i), false)}`} onClick={() => add(k)}>{EFFECT_DEFS[k].name}</button>
            ))}
          </div>
        ) : (
          <button type="button" disabled={full} onClick={() => setAdding(true)} title={full ? `Up to ${MAX_LOOP_EFFECTS} effects` : "Add an effect"} aria-label="Add an effect"
            className="grid h-9 w-full place-items-center rounded-xl border border-dashed border-slate-700 text-slate-400 transition hover:border-slate-500 hover:text-slate-100 disabled:opacity-40">
            <Icon name="plus" size={16} />
          </button>
        )}
        <p className="text-xs text-slate-500">Top to bottom is the order the signal passes through. The loop records the sound with its effects.</p>
      </div>
    </Modal>
  );
}
