"use client";

import Icon from "../Icon";
import { BusEffects, patchName } from "./PatchNode";
import { busChoice, busLinks, whyNot, type PatchNode, type Port } from "@/lib/looper/patch";
import { linkColour } from "@/lib/looper/patchView";
import type { LooperEngine, LooperSnapshot } from "@/lib/looper/engine";

const small = "grid h-5 w-5 shrink-0 place-items-center rounded border text-slate-400 hover:text-slate-100";
let counter = 0;
const newId = (p: string) => `${p}${Date.now().toString(36)}${(counter++).toString(36)}`;

/** Where one bus sends: a chip per destination (click switches it on or off, x removes it) and a list to add one. */
function BusDestinations({ engine, snap, bus }: { engine: LooperEngine; snap: LooperSnapshot; bus: PatchNode }) {
  const patch = snap.patch;
  const groupColours = Object.fromEntries(snap.groups.map((g) => [`group:${g.id}`, g.colour]));
  const nameOf = (id: string) => {
    const n = patch.nodes.find((x) => x.id === id);
    return n ? patchName(snap, n) : id;
  };
  const label = (to: string, port: Port) => `${nameOf(to)}${port === "rec" ? " (record)" : ""}`;
  const out = patch.links.filter((l) => l.from === bus.id);
  const taken = new Set(out.map((l) => `${l.to}|${l.port ?? "bus"}`));
  const options = patch.nodes
    .filter((n) => n.id !== bus.id && n.owner !== bus.owner && n.id !== bus.owner)
    .flatMap((n) => (n.kind === "group" ? (["bus", "rec"] as Port[]) : (["bus"] as Port[])).map((port) => ({ to: n.id, port })))
    .filter((o) => !taken.has(`${o.to}|${o.port}`) && !whyNot(patch, bus.id, o.to, o.port));
  const add = (value: string) => {
    const [to, port] = value.split("|") as [string, Port];
    engine.do({ type: "patch.link", link: { id: newId("l"), from: bus.id, to, ...(port === "rec" ? { port } : {}) } });
  };
  return (
    <div className="flex flex-wrap items-center gap-1 text-[11px]" aria-label={`Where ${patchName(snap, bus)} sends`}>
      <span className="text-slate-500">to</span>
      {out.length === 0 && <span className="text-amber-300/80">nowhere</span>}
      {out.map((l) => {
        const name = label(l.to, l.port ?? "bus");
        return (
          <span key={l.id} className={`flex items-center rounded-full border ${l.muted ? "border-slate-700 text-slate-500" : "border-emerald-500/50 bg-emerald-500/10 text-slate-100"}`}>
            <button type="button" role="checkbox" aria-checked={!l.muted} className="flex items-center gap-1 py-0.5 pl-1.5 pr-1" title={l.muted ? `Send to ${name}` : `Stop sending to ${name}`} onClick={() => engine.do({ type: "patch.mute", what: "link", id: l.id, muted: !l.muted })}>
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: linkColour(patch, l, groupColours) }} />
              <span className={l.muted ? "line-through" : ""}>{name}</span>
            </button>
            <button type="button" className="grid h-4 w-4 place-items-center rounded-full pr-0.5 text-slate-500 hover:text-rose-300" title={`Remove ${name}`} aria-label={`Remove ${name}`} onClick={() => engine.do({ type: "patch.unlink", id: l.id })}><Icon name="x" size={10} /></button>
          </span>
        );
      })}
      {options.length > 0 && (
        <select className="rounded-full border border-dashed border-slate-600 bg-transparent px-1.5 py-0.5 text-[11px] text-slate-400 hover:border-sky-400 hover:text-sky-200" value="" onChange={(e) => e.target.value && add(e.target.value)} aria-label={`Send ${patchName(snap, bus)} to`}>
          <option value="">+ send to…</option>
          {options.map((o) => <option key={`${o.to}|${o.port}`} value={`${o.to}|${o.port}`}>{label(o.to, o.port)}</option>)}
        </select>
      )}
    </div>
  );
}

/**
 * The part of an input's block under its strip: its output buses. With none there is one button to add one. With one it is just
 * that bus. With two or more the block is also a switch: each bus has a radio (one at a time) or a checkbox (any combination)
 * beside it, the effects under its name, and the places it sends to (chips to switch on or off, a list to add one).
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
            <BusDestinations engine={engine} snap={snap} bus={b} />
          </div>
        );
      })}
      <button type="button" className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-700 px-2 py-1 text-[11px] text-slate-400 hover:border-sky-400 hover:text-sky-200" onClick={() => engine.addBus(ownerId)}>
        <Icon name="plus" size={12} />Add output bus
      </button>
    </div>
  );
}
