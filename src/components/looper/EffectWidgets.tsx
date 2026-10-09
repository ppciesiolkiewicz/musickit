"use client";

import { useEffect, type PointerEvent as RPointerEvent } from "react";
import Icon from "../Icon";
import { EffectControls } from "./EffectsModal";
import { dropPins, movePin, togglePin, usePins, type FxPin } from "./fxPins";
import { EFFECT_DEFS, type EffectSpec, type LooperEngine, type LooperSnapshot } from "@/lib/looper/engine";

const tbtn = "grid h-6 min-w-6 place-items-center rounded-md border border-slate-700/80 bg-slate-900/80 px-1 text-[10px] text-slate-300 transition hover:border-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400";

interface Resolved {
  pin: FxPin;
  fx: EffectSpec;
  where: string;
  colour: string;
  param: (key: string, value: number) => void;
  bypass: () => void;
}

/** Match pins to the effects they show. A pin whose bus or input still exists but whose effect is gone is stale. */
function resolve(engine: LooperEngine, snap: LooperSnapshot, pins: FxPin[]): { shown: Resolved[]; stale: string[] } {
  const shown: Resolved[] = [];
  const stale: string[] = [];
  for (const pin of pins) {
    const [kind, owner, fxId] = pin.key.split(":");
    if (kind === "g") {
      const g = snap.groups.find((x) => x.id === owner);
      if (!g) continue;
      const fx = g.effects.find((e) => e.id === fxId);
      if (!fx) {
        stale.push(pin.key);
        continue;
      }
      shown.push({ pin, fx, where: g.name, colour: g.colour, param: (key, value) => engine.do({ type: "effect.param", groupId: g.id, fxId: fx.id, key, value }), bypass: () => engine.do({ type: "effect.bypass", groupId: g.id, fxId: fx.id, bypass: !fx.bypass }) });
    } else if (kind === "m") {
      const fx = snap.masterEffects.find((e) => e.id === fxId);
      if (!fx) {
        stale.push(pin.key);
        continue;
      }
      shown.push({ pin, fx, where: "Master", colour: "#e2e8f0", param: (key, value) => engine.do({ type: "fx.param", target: { master: true }, id: fx.id, key, value }), bypass: () => engine.do({ type: "fx.bypass", target: { master: true }, id: fx.id, bypass: !fx.bypass }) });
    } else if (kind === "i") {
      const inp = snap.inputs.find((x) => String(x.id) === owner);
      if (!inp) continue;
      const fx = inp.effects.find((e) => e.id === fxId);
      if (!fx) {
        stale.push(pin.key);
        continue;
      }
      shown.push({ pin, fx, where: inp.name, colour: "#94a3b8", param: (key, value) => engine.do({ type: "fx.param", target: { input: inp.id }, id: fx.id, key, value }), bypass: () => engine.do({ type: "fx.bypass", target: { input: inp.id }, id: fx.id, bypass: !fx.bypass }) });
    }
  }
  return { shown, stale };
}

/**
 * The effects pinned to the stage. Each is a small panel with the effect's full controls, placed on the canvas to the right of the stage.
 * Drag the title to move it; the controls change the real effect on its bus or input, live. `drag` is the stage's pointer-drag helper (stage units).
 */
export default function EffectWidgets({ engine, snap, drag }: { engine: LooperEngine; snap: LooperSnapshot; drag: (e: RPointerEvent, onMove: (dx: number, dy: number) => void) => void }) {
  const pins = usePins();
  const { shown, stale } = resolve(engine, snap, pins);
  const staleKey = stale.join("|");
  useEffect(() => {
    if (staleKey) dropPins(staleKey.split("|"));
  }, [staleKey]);
  return (
    <>
      {shown.map((r) => (
        <section key={r.pin.key} className={`absolute z-10 flex w-[330px] flex-col gap-1.5 rounded-xl border bg-slate-900/95 p-2 shadow-lg ${r.fx.bypass ? "opacity-70" : ""}`} style={{ left: r.pin.x, top: r.pin.y, borderColor: `${r.colour}99` }} aria-label={`${EFFECT_DEFS[r.fx.kind].name} on ${r.where}`}>
          <div
            className="flex cursor-grab items-center gap-1.5 active:cursor-grabbing"
            style={{ touchAction: "none" }}
            onPointerDown={(e) => {
              if ((e.target as HTMLElement).closest("button")) return;
              const base = { x: r.pin.x, y: r.pin.y };
              drag(e, (dx, dy) => movePin(r.pin.key, base.x + dx, base.y + dy));
            }}
          >
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: r.colour }} aria-hidden />
            <h3 className="min-w-0 flex-1 truncate text-xs font-medium text-slate-100" title={`${EFFECT_DEFS[r.fx.kind].name} on ${r.where}`}>{EFFECT_DEFS[r.fx.kind].name} <span className="font-normal text-slate-400">{r.where}{r.fx.post ? " · after fader" : ""}</span></h3>
            <button type="button" className={`${tbtn} ${r.fx.bypass ? "" : "!border-emerald-500/70 !text-emerald-200"}`} aria-pressed={!r.fx.bypass} onClick={r.bypass} title={r.fx.bypass ? "Bypassed (tap to switch on)" : "On (tap to bypass)"} aria-label="Effect on or off"><Icon name="power" size={12} /></button>
            <button type="button" className={tbtn} onClick={() => togglePin(r.pin.key)} title="Remove the widget (the effect stays)" aria-label="Remove the widget"><Icon name="x" size={12} /></button>
          </div>
          <EffectControls fx={r.fx} onParam={r.param} columns={false} />
        </section>
      ))}
    </>
  );
}
