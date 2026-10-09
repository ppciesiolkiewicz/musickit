"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Icon from "../Icon";
import { isPinned, togglePin, usePins } from "./fxPins";
import { MAX_CHANNELS, type LooperEngine, type LooperSnapshot } from "@/lib/looper/engine";

const ibtn = "grid h-8 min-w-8 place-items-center rounded-lg border border-slate-700 bg-slate-900 px-1.5 text-xs text-slate-200 transition hover:border-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400";
const item = "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40";

interface Entry {
  key: string;
  label: string;
  where: string;
}

/** Every effect that can be shown as a widget, with the pin key the stage uses. */
function effectEntries(snap: LooperSnapshot): Entry[] {
  const out: Entry[] = [];
  snap.inputs.forEach((i) => i.effects.forEach((e) => out.push({ key: `i:${i.id}:${e.id}`, label: e.kind, where: i.name })));
  snap.groups.forEach((g) => g.effects.forEach((e) => out.push({ key: `g:${g.id}:${e.id}`, label: e.kind, where: g.name })));
  snap.masterEffects.forEach((e) => out.push({ key: `m:master:${e.id}`, label: e.kind, where: "Master" }));
  return out;
}

/** The single "+ widget" button of the Looping section: add a loop, a group, or a widget for an effect that already exists. */
export default function AddWidgetMenu({ engine, snap, names, canPatch = false, onStage = false }: { onStage?: boolean; engine: LooperEngine; snap: LooperSnapshot; names: Record<string, string>; canPatch?: boolean }) {
  const [open, setOpen] = useState(false);
  const [sub, setSub] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const pins = usePins();
  const [pos, setPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (e.target instanceof Element && e.target.closest("[data-addwidget]")) return;
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

  const toggle = () => {
    const r = btn.current?.getBoundingClientRect();
    if (r) setPos({ x: Math.max(8, Math.min(window.innerWidth - 248, r.right - 240)), y: r.bottom + 4 });
    setSub(false);
    setOpen((v) => !v);
  };
  const addPatchNode = (kind: "fx" | "switch") => {
    const n = snap.patch.nodes.filter((m) => m.kind === kind).length;
    // into the empty space under the stage, in rows of three
    const total = snap.patch.nodes.filter((m) => m.kind === "fx" || m.kind === "switch").length;
    // on the canvas a card goes in stage units below the groups; over the page, in pixels beside the Mixer
    const x = onStage ? 20 + (total % 4) * 200 : Math.round(window.innerWidth * 0.42) + (total % 3) * 184;
    const y = onStage ? 640 + Math.floor(total / 4) * 200 : Math.round(window.scrollY) + 480 + Math.floor(total / 3) * 110;
    engine.do({ type: "patch.node", node: { id: `${kind === "fx" ? "fx:" : "sw:"}${Date.now().toString(36)}`, kind, x, y, name: kind === "fx" ? `Chain ${n + 1}` : `Switch ${n + 1}` } });
  };
  const run = (f: () => void) => {
    f();
    setOpen(false);
  };
  const fx = effectEntries(snap);
  const last = snap.channels[snap.channels.length - 1];
  const rows: ReactNode = sub ? (
    <>
      <button type="button" className={item} onClick={() => setSub(false)}><Icon name="chevron-left" size={14} />Effect widget</button>
      {fx.length === 0 && <p className="px-2 py-1.5 text-xs text-slate-400">No effects yet. Add one to an input, group or the master.</p>}
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
      <button type="button" className={item} disabled={snap.channels.length >= MAX_CHANNELS} onClick={() => run(() => engine.do({ type: "loop.add" }))}><Icon name="repeat" size={14} />Loop</button>
      <button type="button" className={item} disabled={snap.groups.length >= 8} onClick={() => run(() => engine.do({ type: "group.add" }))}><Icon name="plus" size={14} />Group (a bus with effects)</button>
      <button type="button" className={item} onClick={() => setSub(true)}><Icon name="sliders-horizontal" size={14} />Effect widget<Icon name="chevron-right" size={14} className="ml-auto" /></button>
      {canPatch && <button type="button" className={item} onClick={() => run(() => addPatchNode("switch"))}><Icon name="split" size={14} />Switch (choose inputs and outputs)</button>}
      {canPatch && <button type="button" className={item} disabled={!snap.inputs.some((i) => i.kind === "device")} onClick={() => run(() => engine.addRig())}><Icon name="mic" size={14} />Guitar rig (chains and a switch)</button>}
      {canPatch && <button type="button" className={item} onClick={() => run(() => addPatchNode("fx"))}><Icon name="sliders-horizontal" size={14} />Effect chain (between connections)</button>}
      <button type="button" className={item} disabled={snap.channels.length <= 1 || last?.state !== "empty"} onClick={() => run(() => engine.do({ type: "loop.removeLast" }))}><Icon name="minus" size={14} />Remove the last loop</button>
    </>
  );

  return (
    <>
      <button ref={btn} data-addwidget type="button" className={`${ibtn} gap-1`} aria-haspopup="menu" aria-expanded={open} onClick={toggle} title="Add a loop, a group or an effect widget" aria-label="Add a widget">
        <Icon name="plus" size={14} />
        <span className="text-[11px]">widget</span>
      </button>
      {open && typeof document !== "undefined" &&
        createPortal(
          <div data-addwidget role="menu" className="fixed z-[2000] max-h-[70vh] w-60 overflow-auto rounded-xl border border-slate-700 bg-slate-950 p-1 shadow-xl" style={{ left: pos.x, top: pos.y }}>
            {rows}
          </div>,
          document.body,
        )}
    </>
  );
}
