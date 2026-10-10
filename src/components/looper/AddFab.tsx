"use client";

import { useEffect, useState, type ReactNode } from "react";
import Icon from "../Icon";
import { isPinned, togglePin, usePins } from "./fxPins";
import { patchName } from "./PatchNode";
import { toast } from "./toast";
import { MAX_CHANNELS, MAX_INPUTS, type LooperEngine, type LooperSnapshot } from "@/lib/looper/engine";

const item = "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40";
const hint = "ml-auto truncate text-[11px] text-slate-500";

interface Entry {
  key: string;
  label: string;
  where: string;
}

/** Every effect that can be shown as a widget, with its pin key (see `fxPins.ts`). */
export function effectEntries(snap: LooperSnapshot): Entry[] {
  const out: Entry[] = [];
  snap.inputs.forEach((i) => i.effects.forEach((e) => out.push({ key: `i:${i.id}:${e.id}`, label: e.kind, where: i.name })));
  snap.patch.nodes.forEach((n) => n.kind === "fx" && n.effects?.forEach((e) => out.push({ key: `e:${n.id}:${e.id}`, label: e.kind, where: patchName(snap, n) })));
  snap.groups.forEach((g) => g.effects.forEach((e) => out.push({ key: `g:${g.id}:${e.id}`, label: e.kind, where: g.name })));
  snap.masterEffects.forEach((e) => out.push({ key: `m:master:${e.id}`, label: e.kind, where: "Master" }));
  return out;
}

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <div role="group" aria-label={title} className="border-t border-slate-800 py-1 first:border-t-0 first:pt-0">
    <p className="px-2 pb-0.5 pt-1 text-[10px] font-medium uppercase tracking-wide text-slate-500">{title}</p>
    {children}
  </div>
);

/**
 * The one add button of the looper: the round + over the page. Loops, sequencers and groups go on the stage inside the Looping section
 * (a notice says so); inputs, buses, switches and effect widgets appear in the middle of the screen. Buses and switches exist only in
 * Widgets with wires, so the menu offers them there.
 */
export default function AddFab({ engine, snap, wires, names, onInput }: { engine: LooperEngine; snap: LooperSnapshot; wires: boolean; names: Record<string, string>; onInput: () => void }) {
  const [open, setOpen] = useState(false);
  const [sub, setSub] = useState(false);
  const pins = usePins();
  const fx = effectEntries(snap);
  const owners = [...new Set(fx.map((e) => e.where))];

  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (e.target instanceof Element && e.target.closest("[data-addfab]")) return;
      setOpen(false);
    };
    const key = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", key);
    };
  }, [open]);

  const run = (f: () => void) => {
    f();
    setOpen(false);
    setSub(false);
  };
  /** an action that puts something on the stage, with a notice of where it went */
  const onStage = (ok: boolean, what: string) => ok && toast(`${what} added in the Looping section`);
  const stamp = () => Date.now().toString(36);
  const addNode = (kind: "fx" | "switch") => {
    const n = snap.patch.nodes.filter((m) => m.kind === kind).length + 1;
    engine.do({ type: "patch.node", node: { id: `${kind === "fx" ? "fx" : "sw"}:${stamp()}`, kind, x: 20, y: 660, name: kind === "fx" ? `Bus ${n}` : `Switch ${n}` } });
  };
  const wiresOnly = wires ? undefined : "Shown in Widgets with wires";

  return (
    <div data-addfab className="pointer-events-none fixed bottom-5 right-5 z-[60] flex flex-col items-end gap-2">
      {open && (
        <div role="menu" aria-label="Add" className="pointer-events-auto max-h-[75vh] w-64 overflow-auto rounded-xl border border-slate-700 bg-slate-950 p-1 shadow-xl">
          {sub ? (
            <>
              <button type="button" className={item} onClick={() => setSub(false)}><Icon name="chevron-left" size={14} />Effect widget</button>
              {fx.length === 0 && <p className="px-2 py-1.5 text-xs text-slate-400">No effects yet. Add one to an input, bus, group or the master.</p>}
              {owners.map((w) => (
                <Section key={w} title={w}>
                  {fx.filter((e) => e.where === w).map((e) => (
                    <button key={e.key} type="button" className={item} aria-pressed={isPinned(pins, e.key)} onClick={() => togglePin(e.key)}>
                      <span className="w-4">{isPinned(pins, e.key) && <Icon name="check" size={14} />}</span>
                      <span className="truncate">{names[e.label] ?? e.label}</span>
                    </button>
                  ))}
                </Section>
              ))}
            </>
          ) : (
            <>
              <Section title="Looping">
                <button type="button" role="menuitem" className={item} disabled={snap.channels.length >= MAX_CHANNELS} onClick={() => run(() => onStage(engine.do({ type: "loop.add" }), "Loop"))}><Icon name="repeat" size={15} />Loop</button>
                <button type="button" role="menuitem" className={item} disabled={snap.inputs.length >= MAX_INPUTS} onClick={() => run(() => onStage(engine.do({ type: "sequencer.add" }), "Sequencer"))}><Icon name="drum" size={15} />Sequencer<span className={hint}>drums, bass</span></button>
                <button type="button" role="menuitem" className={item} disabled={snap.groups.length >= 8} onClick={() => run(() => onStage(engine.do({ type: "group.add" }), "Group"))}><Icon name="plus" size={15} />Group<span className={hint}>bus with loops</span></button>
              </Section>
              <Section title="Sound">
                <button type="button" role="menuitem" className={item} disabled={snap.inputs.length >= MAX_INPUTS} onClick={() => run(onInput)}><Icon name="mic" size={15} />Input<span className={hint}>device, piano</span></button>
                <button type="button" role="menuitem" className={item} disabled={!wires} title={wiresOnly} onClick={() => run(() => addNode("fx"))}><Icon name="sliders-horizontal" size={15} />Bus<span className={hint}>connect, add effects</span></button>
                <button type="button" role="menuitem" className={item} disabled={!wires} title={wiresOnly} onClick={() => run(() => addNode("switch"))}><Icon name="split" size={15} />Switch<span className={hint}>pick inputs, outputs</span></button>
              </Section>
              <Section title="Widgets">
                <button type="button" role="menuitem" className={item} onClick={() => setSub(true)}><Icon name="layout-dashboard" size={15} />Effect widget<span className={hint}>{fx.length ? `${fx.length} effects` : "none yet"}</span><Icon name="chevron-right" size={14} /></button>
              </Section>
            </>
          )}
        </div>
      )}
      <button type="button" aria-haspopup="menu" aria-expanded={open} aria-label="Add a loop, sequencer, input, bus or widget" title="Add" onClick={() => { setSub(false); setOpen((v) => !v); }} className="pointer-events-auto grid h-12 w-12 place-items-center rounded-full border border-sky-400/60 bg-sky-500 text-slate-950 shadow-lg shadow-black/50 transition hover:bg-sky-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-200">
        <Icon name="plus" size={22} className={`transition-transform ${open ? "rotate-45" : ""}`} />
      </button>
    </div>
  );
}
