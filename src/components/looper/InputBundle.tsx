"use client";

import Icon from "../Icon";
import { BusEffects, patchName } from "./PatchNode";
import { busChoice, busLinks, outFrom, whyNot, type PatchNode, type Port } from "@/lib/looper/patch";
import { destinationPick, destinations, linkColour } from "@/lib/looper/patchView";
import type { LooperEngine, LooperSnapshot } from "@/lib/looper/engine";
import { useFold } from "./fold";

const small = "grid h-5 w-5 shrink-0 place-items-center rounded border text-slate-400 hover:text-slate-100";
let counter = 0;
const newId = (p: string) => `${p}${Date.now().toString(36)}${(counter++).toString(36)}`;

/** A section title that folds its section: chevron and label, with a short summary of what is on while folded. */
function FoldHead({ open, onToggle, label, summary, children }: { open: boolean; onToggle: () => void; label: string; summary?: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-slate-500">
      <button type="button" className="flex min-w-0 flex-1 items-center gap-1 text-left uppercase hover:text-slate-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400" aria-expanded={open} onClick={onToggle} title={open ? `Fold ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}>
        <Icon name={open ? "chevron-down" : "chevron-right"} size={11} />
        <span className="shrink-0">{label}</span>
        {!open && summary && <span className="min-w-0 truncate normal-case tracking-normal text-slate-400">· {summary}</span>}
      </button>
      {open && children}
    </div>
  );
}

/**
 * Where the input's sound goes once its buses are mixed together: one output with a row per place, like a switch side. One place
 * at a time (radio) or any combination (checkboxes); x removes a place; the list adds one (a link from every bus).
 */
function OutputPlaces({ engine, snap, ownerId }: { engine: LooperEngine; snap: LooperSnapshot; ownerId: string }) {
  const [open, toggle] = useFold(`${ownerId}:out`);
  const patch = snap.patch;
  const owner = patch.nodes.find((n) => n.id === ownerId);
  const groupColours = Object.fromEntries(snap.groups.map((g) => [`group:${g.id}`, g.colour]));
  const nameOf = (id: string) => {
    const n = patch.nodes.find((x) => x.id === id);
    return n ? patchName(snap, n) : id;
  };
  const label = (to: string, port: Port) => `${nameOf(to)}${port === "rec" ? " (record)" : ""}`;
  const one = owner?.destOne === true;
  const all = destinations(patch, ownerId);
  const master = patch.nodes.find((n) => n.kind === "master");
  const toMaster = master ? all.find((d) => d.to === master.id) : undefined;
  const places = all.filter((d) => d !== toMaster);
  const from = outFrom(patch, ownerId);
  const taken = new Set(all.map((d) => d.key));
  const options = patch.nodes
    .filter((n) => n.id !== ownerId && n.owner !== ownerId && n.kind !== "master")
    .flatMap((n) => (n.kind === "group" ? (["bus", "rec"] as Port[]) : (["bus"] as Port[])).map((port) => ({ to: n.id, port })))
    .filter((o) => !taken.has(`${o.to}|${o.port}`) && from.some((f) => !whyNot(patch, f, o.to, o.port)));
  const pick = (key: string) => {
    const changes = destinationPick(patch, ownerId, key);
    if (changes.length) engine.do({ type: "batch", label: "Choose output", actions: changes.map((c) => ({ type: "patch.mute", what: "link", id: c.id, muted: c.muted })) });
  };
  const add = (value: string) => {
    const [to, port] = value.split("|") as [string, Port];
    const actions = from.filter((f) => !whyNot(patch, f, to, port)).map((f) => ({ type: "patch.link" as const, link: { id: newId("l"), from: f, to, ...(port === "rec" ? { port } : {}) } }));
    if (actions.length) engine.do(actions.length === 1 ? actions[0] : { type: "batch", label: "Send to", actions });
  };
  // the master is a checkbox of its own: on links every bus to it (the first time), off closes those links
  const masterOn = !!toMaster?.on;
  const flipMaster = () => (toMaster ? pick(toMaster.key) : master && add(`${master.id}|bus`));
  const mode = (m: boolean, icon: "circle-dot" | "check", title: string) => (
    <button type="button" className={`${small} ${one === m ? "!border-sky-400 !text-sky-200" : "border-slate-700"}`} aria-pressed={one === m} title={title} aria-label={title} onClick={() => one !== m && engine.do({ type: "patch.switch", id: ownerId, side: "dest", multi: !m })}>
      <Icon name={icon} size={11} />
    </button>
  );
  const onNames = [...(masterOn ? ["Master"] : []), ...places.filter((d) => d.on).map((d) => label(d.to, d.port))];
  if (!open) return <FoldHead open={false} onToggle={toggle} label="Output goes to" summary={onNames.join(", ") || "nowhere"} />;
  return (
    <div className="flex flex-col gap-1" role="group" aria-label="Output goes to">
      <FoldHead open onToggle={toggle} label="Output goes to" />
      {master && (
        <button type="button" role="checkbox" aria-checked={masterOn} className={`flex items-center gap-1.5 rounded-lg border px-1.5 py-1 text-left ${masterOn ? "border-slate-400/60 bg-slate-300/10" : "border-slate-800 bg-slate-900/50"}`} onClick={flipMaster} title={masterOn ? "Stop playing to the master bus" : "Play to the master bus too"}>
          <span className="grid h-5 w-5 shrink-0 place-items-center"><span className={`grid h-3 w-3 place-items-center rounded-sm border ${masterOn ? "border-slate-200 bg-slate-200 text-slate-950" : "border-slate-500"}`}>{masterOn && <Icon name="check" size={9} />}</span></span>
          <span className="h-2 w-2 shrink-0 rounded-sm bg-slate-300" aria-hidden />
          <span className={`text-xs ${masterOn ? "text-slate-100" : "text-slate-400"}`}>Master bus</span>
          <span className="ml-auto text-[10px] text-slate-500">always on its own</span>
        </button>
      )}
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-slate-500">
        <span className="flex-1">{one ? "One group or bus at a time" : "Groups and buses"}</span>
        {places.length > 1 && (<>{mode(true, "circle-dot", "One place at a time")}{mode(false, "check", "Any combination of places")}</>)}
      </div>
      {places.length === 0 && <p className="px-1 text-[11px] text-slate-500">No group or bus yet: choose one below.</p>}
      {places.map((d) => {
        const name = label(d.to, d.port);
        return (
          <div key={d.key} className={`flex items-center gap-1.5 rounded-lg border px-1.5 py-1 ${d.on ? "border-emerald-500/40 bg-emerald-500/5" : "border-slate-800 bg-slate-900/50"}`}>
            <button type="button" role={one ? "radio" : "checkbox"} aria-checked={d.on} className="flex min-w-0 flex-1 items-center gap-1.5 text-left" onClick={() => pick(d.key)}>
              <span className="grid h-5 w-5 shrink-0 place-items-center"><span className={`block h-3 w-3 border ${one ? "rounded-full" : "rounded-sm"} ${d.on ? "border-emerald-300 bg-emerald-300" : "border-slate-500"}`} /></span>
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: linkColour(patch, d.links[0], groupColours) }} />
              <span className={`truncate text-xs ${d.on ? "text-slate-100" : "text-slate-400"}`}>{name}</span>
            </button>
            <button type="button" className={`${small} border-slate-700 hover:!border-rose-400`} title={`Remove ${name}`} aria-label={`Stop sending to ${name}`} onClick={() => engine.do({ type: "batch", label: "Remove a connection", actions: d.links.map((l) => ({ type: "patch.unlink", id: l.id })) })}><Icon name="x" size={12} /></button>
          </div>
        );
      })}
      {options.length > 0 && (
        <select className="rounded-lg border border-dashed border-slate-700 bg-transparent px-2 py-1 text-[11px] text-slate-400 hover:border-sky-400 hover:text-sky-200" value="" onChange={(e) => e.target.value && add(e.target.value)} aria-label="Send the output to">
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
 * beside it and the effects under its name. Under the buses, their mixed sound goes out as one output to the places listed there.
 */
export default function InputBundle({ engine, snap, ownerId }: { engine: LooperEngine; snap: LooperSnapshot; ownerId: string }) {
  const [open, toggle] = useFold(`${ownerId}:buses`);
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
        <div className="mt-1.5"><OutputPlaces engine={engine} snap={snap} ownerId={ownerId} /></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 px-1.5 pb-1.5" role={buses.length > 1 ? (multi ? "group" : "radiogroup") : undefined} aria-label="Output buses">
      <FoldHead open={open} onToggle={toggle} label={buses.length > 1 ? "Switch between buses" : "Output bus"} summary={buses.filter((b) => buses.length === 1 || links.some((l) => l.to === b.id && !l.muted)).map((b) => patchName(snap, b)).join(", ") || "none on"}>
        {buses.length > 1 && (<>{mode(false, "circle-dot", "One bus at a time")}{mode(true, "check", "Any combination of buses")}</>)}
      </FoldHead>
      {open && buses.map((b) => {
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
      {open && (
        <button type="button" className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-700 px-2 py-1 text-[11px] text-slate-400 hover:border-sky-400 hover:text-sky-200" onClick={() => engine.addBus(ownerId)}>
          <Icon name="plus" size={12} />Add output bus
        </button>
      )}
      <OutputPlaces engine={engine} snap={snap} ownerId={ownerId} />
    </div>
  );
}
