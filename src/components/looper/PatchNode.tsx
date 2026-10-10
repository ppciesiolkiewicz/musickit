"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import EffectsModal from "./EffectsModal";
import { switchChoice, type PatchLink, type PatchNode } from "@/lib/looper/patch";
import type { LooperEngine, LooperSnapshot } from "@/lib/looper/engine";

/** The name an element goes by in the patch. */
export function patchName(snap: LooperSnapshot, n: PatchNode): string {
  if (n.name) return n.name;
  if (n.kind === "input" || n.kind === "piano") return snap.inputs.find((i) => `in:${i.id}` === n.id)?.name ?? "Input";
  if (n.kind === "sequencer") return snap.sequencers.find((q) => `seq:${q.id}` === n.id)?.name ?? "Sequencer";
  if (n.kind === "group") return snap.groups.find((g) => `group:${g.id}` === n.id)?.name ?? "Group";
  if (n.kind === "master") return "Master";
  return n.kind === "switch" ? "Switch" : "Bus";
}

/** What is inside the card of an effect chain or a switch: the chain's effects, or the connections a switch lets through. */
export function NodeBody({ engine, snap, node: n }: { engine: LooperEngine; snap: LooperSnapshot; node: PatchNode }) {
  const patch = snap.patch;
  const [fxOpen, setFxOpen] = useState(false);
  const nameOf = (id: string) => {
    const m = patch.nodes.find((x) => x.id === id);
    return m ? patchName(snap, m) : id;
  };
  const choose = (sw: PatchNode, linkId: string) => {
    const changes = switchChoice(patch, sw.id, linkId);
    if (changes.length) engine.do({ type: "batch", label: "Switch", actions: changes.map((c) => ({ type: "patch.mute", what: "link", id: c.id, muted: c.muted })) });
  };

  /** One side of a switch: its connections, each open or closed, as radio buttons or checkboxes. */
  const side = (sw: PatchNode, s: "in" | "out") => {
    const multi = (s === "in" ? sw.inMulti : sw.outMulti) === true;
    const links = patch.links.filter((l: PatchLink) => (s === "in" ? l.to : l.from) === sw.id);
    const mode = (m: boolean, icon: "circle-dot" | "check", title: string) => (
      <button type="button" className={`grid h-5 w-5 place-items-center rounded border ${multi === m ? "border-sky-400 text-sky-200" : "border-slate-700 text-slate-500 hover:text-slate-300"}`} aria-pressed={multi === m} title={title} aria-label={`${s === "in" ? "Inputs" : "Outputs"}: ${title}`} onClick={() => multi !== m && engine.do({ type: "patch.switch", id: sw.id, side: s, multi: m })}>
        <Icon name={icon} size={11} />
      </button>
    );
    return (
      <div className="flex flex-col gap-0.5" role={multi ? "group" : "radiogroup"} aria-label={s === "in" ? "Inputs let through" : "Outputs let through"}>
        <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-slate-500">
          <span className="flex-1">{s === "in" ? "In" : "Out"}</span>
          {mode(false, "circle-dot", "One at a time")}
          {mode(true, "check", "Any combination")}
        </div>
        {links.length === 0 && <span className="text-[10px] text-slate-500">{s === "in" ? "Wire something in" : "Drag from the dot on the right"}</span>}
        {links.map((l) => {
          const on = !l.muted;
          return (
            <button key={l.id} type="button" role={multi ? "checkbox" : "radio"} aria-checked={on} className={`flex items-center gap-1 rounded px-1 py-0.5 text-left text-[11px] ${on ? "bg-emerald-500/20 text-emerald-100" : "text-slate-400 hover:bg-slate-800"}`} onClick={() => choose(sw, l.id)} title={`${nameOf(l.from)} → ${nameOf(l.to)}${l.port === "rec" ? " (record)" : ""}`}>
              <span className={`grid h-2.5 w-2.5 shrink-0 place-items-center border ${multi ? "rounded-sm" : "rounded-full"} ${on ? "border-emerald-300 bg-emerald-300" : "border-slate-500"}`} />
              <span className="truncate">{s === "in" ? nameOf(l.from) : nameOf(l.to)}{l.port === "rec" ? " (rec)" : ""}</span>
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-1.5 px-1.5 py-1.5 pr-3" data-patch-id={n.id}>
      {n.kind === "fx" && (
        <button type="button" className="flex items-center gap-1 rounded border border-slate-700 px-1 py-0.5 text-left text-[11px] text-slate-300 hover:border-slate-500" onClick={() => setFxOpen(true)} title="Edit the effects">
          <Icon name="sliders-horizontal" size={11} />
          <span className="truncate">{n.effects?.length ? n.effects.map((e) => e.kind).join(" + ") : "no effects yet"}</span>
        </button>
      )}
      {n.kind === "switch" && (
        <>
          {side(n, "in")}
          {side(n, "out")}
        </>
      )}
      {fxOpen && n.kind === "fx" && (
        <EffectsModal
          title={<span className="flex items-center gap-2"><Icon name="sliders-horizontal" size={16} />{patchName(snap, n)}: effects</span>}
          effects={n.effects ?? []}
          onAdd={(k) => engine.do({ type: "fx.add", target: { element: n.id }, fx: { kind: k } })}
          onRemove={(id) => engine.do({ type: "fx.remove", target: { element: n.id }, id })}
          onParam={(id, key, value) => engine.do({ type: "fx.param", target: { element: n.id }, id, key, value })}
          onBypass={(id) => engine.do({ type: "fx.bypass", target: { element: n.id }, id, bypass: !n.effects?.find((e) => e.id === id)?.bypass })}
          onClose={() => setFxOpen(false)}
        />
      )}
    </div>
  );
}
