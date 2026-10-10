"use client";

import Icon from "../Icon";
import { BusEffects, patchName } from "./PatchNode";
import { busChoice, busLinks, type PatchNode } from "@/lib/looper/patch";
import type { LooperEngine, LooperSnapshot } from "@/lib/looper/engine";

const small = "grid h-5 w-5 shrink-0 place-items-center rounded border text-slate-400 hover:text-slate-100";

/**
 * The part of an input's block under its strip: its output buses. With none there is one button to add one. With one it is just
 * that bus. With two or more the block is also a switch: each bus has a radio (one at a time) or a checkbox (any combination)
 * beside it, the effects under its name, and its own connector for outputs, so each bus can go to several places.
 */
export default function InputBundle({ engine, snap, ownerId }: { engine: LooperEngine; snap: LooperSnapshot; ownerId: string }) {
  const patch = snap.patch;
  const owner = patch.nodes.find((n) => n.id === ownerId);
  if (!owner) return null;
  const buses = patch.nodes.filter((n): n is PatchNode => n.owner === ownerId);
  const links = busLinks(patch, ownerId);
  const multi = owner.busMulti === true;
  const pick = (linkId: string) => {
    const changes = busChoice(patch, ownerId, linkId);
    if (changes.length) engine.do({ type: "batch", label: "Choose bus", actions: changes.map((c) => ({ type: "patch.mute", what: "link", id: c.id, muted: c.muted })) });
  };
  const mode = (m: boolean, icon: "circle-dot" | "check", title: string) => (
    <button type="button" className={`${small} ${multi === m ? "!border-sky-400 !text-sky-200" : "border-slate-700"}`} aria-pressed={multi === m} title={title} aria-label={title} onClick={() => multi !== m && engine.do({ type: "patch.switch", id: ownerId, side: "out", multi: m })}>
      <Icon name={icon} size={11} />
    </button>
  );

  if (buses.length === 0) {
    return (
      <div className="px-1.5 pb-1.5">
        <button type="button" className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-600 px-2 py-1.5 text-xs text-slate-300 hover:border-sky-400 hover:text-sky-200" onClick={() => engine.addBus(ownerId)}>
          <Icon name="plus" size={13} />Add output bus
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 px-1.5 pb-1.5" role={buses.length > 1 ? (multi ? "group" : "radiogroup") : undefined} aria-label="Output buses">
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-slate-500">
        <span className="flex-1">{buses.length > 1 ? "Switch between buses" : "Output bus"}</span>
        {buses.length > 1 && (<>{mode(false, "circle-dot", "One bus at a time")}{mode(true, "check", "Any combination of buses")}</>)}
      </div>
      {buses.map((b) => {
        const link = links.find((l) => l.to === b.id);
        const on = !!link && !link.muted;
        return (
          <div key={b.id} data-patch-id={b.id} className={`flex flex-col gap-1 rounded-lg border px-1.5 py-1 pr-3 ${on || buses.length === 1 ? "border-emerald-500/40 bg-emerald-500/5" : "border-slate-800 bg-slate-900/50"}`}>
            <div className="flex items-center gap-1.5">
              {buses.length > 1 && link && (
                <button type="button" role={multi ? "checkbox" : "radio"} aria-checked={on} aria-label={`${patchName(snap, b)}: ${on ? "on" : "off"}`} className="grid h-5 w-5 shrink-0 place-items-center" onClick={() => pick(link.id)}>
                  <span className={`block h-3 w-3 border ${multi ? "rounded-sm" : "rounded-full"} ${on ? "border-emerald-300 bg-emerald-300" : "border-slate-500"}`} />
                </button>
              )}
              <span className="min-w-0 flex-1 truncate text-xs text-slate-100">{patchName(snap, b)}</span>
              <button type="button" className={small} aria-pressed={b.muted} title={b.muted ? "Unmute the bus" : "Mute the bus"} aria-label={`${b.muted ? "Unmute" : "Mute"} ${patchName(snap, b)}`} onClick={() => engine.do({ type: "patch.mute", what: "node", id: b.id, muted: !b.muted })}><Icon name={b.muted ? "volume-x" : "volume-2"} size={12} /></button>
              <button type="button" className={`${small} hover:!border-rose-400`} title="Remove the bus" aria-label={`Remove ${patchName(snap, b)}`} onClick={() => engine.do({ type: "patch.removeNode", id: b.id })}><Icon name="x" size={12} /></button>
            </div>
            <BusEffects engine={engine} snap={snap} node={b} />
          </div>
        );
      })}
      <button type="button" className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-700 px-2 py-1 text-[11px] text-slate-400 hover:border-sky-400 hover:text-sky-200" onClick={() => engine.addBus(ownerId)}>
        <Icon name="plus" size={12} />Add output bus
      </button>
    </div>
  );
}
