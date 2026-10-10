"use client";

import { useEffect, useState } from "react";
import Icon from "../Icon";
import { isPinned, togglePin, usePins } from "./fxPins";
import { effectEntries } from "./AddWidgetMenu";
import { MAX_INPUTS, type LooperEngine, type LooperSnapshot } from "@/lib/looper/engine";

const item = "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40";

/**
 * The round + button over the canvas: add an input, a bus, a group, a switch, or an effect widget. Inputs open the Add dialog
 * (hardware, keyboard, Scale Piano, sequencer). Buses and switches exist only in Widgets with wires, so the menu offers them there.
 */
export default function AddFab({ engine, snap, wires, names, onInput }: { engine: LooperEngine; snap: LooperSnapshot; wires: boolean; names: Record<string, string>; onInput: () => void }) {
  const [open, setOpen] = useState(false);
  const [sub, setSub] = useState(false);
  const pins = usePins();
  const fx = effectEntries(snap);

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
  const stamp = () => Date.now().toString(36);

  return (
    <div data-addfab className="pointer-events-none fixed bottom-5 right-5 z-[60] flex flex-col items-end gap-2">
      {open && (
        <div role="menu" aria-label="Add" className="pointer-events-auto w-60 rounded-xl border border-slate-700 bg-slate-950 p-1 shadow-xl">
          {sub ? (
            <>
              <button type="button" className={item} onClick={() => setSub(false)}><Icon name="chevron-left" size={14} />Widget</button>
              {fx.length === 0 && <p className="px-2 py-1.5 text-xs text-slate-400">No effects yet. Add one to an input, bus, group or the master.</p>}
              {fx.map((e) => (
                <button key={e.key} type="button" className={item} aria-pressed={isPinned(pins, e.key)} onClick={() => togglePin(e.key)}>
                  <span className="w-4">{isPinned(pins, e.key) && <Icon name="check" size={14} />}</span>
                  <span className="truncate">{names[e.label] ?? e.label}</span>
                  <span className="ml-auto truncate text-[11px] text-slate-400">{e.where}</span>
                </button>
              ))}
            </>
          ) : (
            <>
              <button type="button" role="menuitem" className={item} disabled={snap.inputs.length >= MAX_INPUTS} onClick={() => run(onInput)}><Icon name="mic" size={15} />Input<span className="ml-auto text-[11px] text-slate-500">device, piano, drums</span></button>
              <button type="button" role="menuitem" className={item} disabled={!wires} title={wires ? undefined : "Buses are shown in Widgets with wires"} onClick={() => run(() => engine.do({ type: "patch.node", node: { id: `fx:${stamp()}`, kind: "fx", x: 20, y: 660, name: `Bus ${snap.patch.nodes.filter((n) => n.kind === "fx").length + 1}` } }))}><Icon name="sliders-horizontal" size={15} />Bus<span className="ml-auto text-[11px] text-slate-500">connect, add effects</span></button>
              <button type="button" role="menuitem" className={item} disabled={snap.groups.length >= 8} onClick={() => run(() => engine.do({ type: "group.add" }))}><Icon name="repeat" size={15} />Group<span className="ml-auto text-[11px] text-slate-500">bus with loops</span></button>
              <button type="button" role="menuitem" className={item} disabled={!wires} title={wires ? undefined : "Switches are shown in Widgets with wires"} onClick={() => run(() => engine.do({ type: "patch.node", node: { id: `sw:${stamp()}`, kind: "switch", x: 20, y: 860, name: `Switch ${snap.patch.nodes.filter((n) => n.kind === "switch").length + 1}` } }))}><Icon name="split" size={15} />Switch<span className="ml-auto text-[11px] text-slate-500">pick inputs, outputs</span></button>
              <button type="button" role="menuitem" className={item} onClick={() => setSub(true)}><Icon name="layout-dashboard" size={15} />Widget<span className="ml-auto text-[11px] text-slate-500">pin an effect</span><Icon name="chevron-right" size={14} /></button>
            </>
          )}
        </div>
      )}
      <button type="button" aria-haspopup="menu" aria-expanded={open} aria-label="Add an input, bus, group or widget" title="Add" onClick={() => { setSub(false); setOpen((v) => !v); }} className="pointer-events-auto grid h-12 w-12 place-items-center rounded-full border border-sky-400/60 bg-sky-500 text-slate-950 shadow-lg shadow-black/50 transition hover:bg-sky-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-200">
        <Icon name="plus" size={22} className={`transition-transform ${open ? "rotate-45" : ""}`} />
      </button>
    </div>
  );
}
