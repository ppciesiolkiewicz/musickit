"use client";

import { useEffect, useState, type PointerEvent as RPointerEvent, type ReactNode } from "react";
import Icon from "../Icon";
import LoopStage from "./LoopStage";
import { AddInputModal, InputStrip, MasterStrip } from "./Mixer";
import { MAX_INPUTS, type LooperEngine, type LooperSnapshot } from "@/lib/looper/engine";
import { VIEW_H } from "@/lib/looper/layout";

const KEY = "musickit.looper.board";
const CARD_W = 300;
type Spot = { x: number; y: number };

const ibtn = "grid h-8 min-w-8 place-items-center rounded-lg border border-slate-700 bg-slate-900 px-1.5 text-xs text-slate-200 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400";

/** Where the cards were left (pixels on the canvas), remembered in this browser. */
function useSpots(): [Record<string, Spot>, (id: string, s: Spot) => void] {
  const [spots, setSpots] = useState<Record<string, Spot>>({});
  useEffect(() => {
    try {
      const j = JSON.parse(window.localStorage.getItem(KEY) ?? "null");
      if (j && typeof j === "object") setSpots(j as Record<string, Spot>);
    } catch {
      /* ignore */
    }
  }, []);
  const put = (id: string, s: Spot) =>
    setSpots((o) => {
      const n = { ...o, [id]: s };
      try {
        window.localStorage.setItem(KEY, JSON.stringify(n));
      } catch {
        /* ignore */
      }
      return n;
    });
  return [spots, put];
}

/**
 * The freeform view: one canvas, no Mixer or Looping sections. Groups, loops and sequencers sit on the stage as before;
 * every input and the master bus are cards on the same canvas. Wires between them are drawn by the connection layer.
 * The settings of a group or a sequencer are reached by clicking it, so there is no bus or sequencer strip here.
 */
export default function FreeBoard({ engine, snap, controls, keyboardOpen, onToggleKeyboard, openSeqs, onToggleSeq, openPianos, onTogglePiano }: { engine: LooperEngine; snap: LooperSnapshot; controls: ReactNode; keyboardOpen: boolean; onToggleKeyboard: () => void; openSeqs: string[]; onToggleSeq: (id: string) => void; openPianos: string[]; onTogglePiano: (id: string) => void }) {
  const [spots, put] = useSpots();
  const [adding, setAdding] = useState(false);
  const strips = snap.inputs.filter((i) => i.kind !== "sequencer");
  const hasExtra = snap.inputs.some((i) => i.kind === "extra");
  const ids = ["master", ...strips.map((i) => `in:${i.id}`)];

  const cards = (scale: number) =>
    ids.map((id, n) => {
      const def: Spot = { x: 16 + (n % 3) * (CARD_W + 16), y: VIEW_H * scale - 40 + Math.floor(n / 3) * 150 };
      const at = spots[id] ?? def;
      const grab = (e: RPointerEvent) => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        const sx = e.clientX, sy = e.clientY;
        const move = (ev: PointerEvent) => put(id, { x: Math.max(0, at.x + ev.clientX - sx), y: Math.max(0, at.y + ev.clientY - sy) });
        const up = () => {
          window.removeEventListener("pointermove", move);
        };
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", up, { once: true });
      };
      const inp = strips.find((i) => `in:${i.id}` === id);
      return (
        <div key={id} className="absolute z-10 flex flex-col" style={{ left: at.x, top: at.y, width: CARD_W }}>
          <div onPointerDown={grab} className="flex h-3 cursor-grab items-center justify-center rounded-t-md bg-slate-800/80 text-slate-500 active:cursor-grabbing" style={{ touchAction: "none" }} title="Drag to move" aria-hidden>
            <Icon name="grip" size={12} />
          </div>
          <ul>
            {inp ? (
              <InputStrip engine={engine} inp={inp} devices={snap.devices} anyDevice={snap.devices.length > 0} keyboardOpen={keyboardOpen} onToggleKeyboard={onToggleKeyboard} sequencerOpen={false} onToggleSequencer={() => undefined} pianoOpen={!!inp.sourceId && openPianos.includes(inp.sourceId)} onTogglePiano={() => inp.sourceId && onTogglePiano(inp.sourceId)} seq={undefined} groups={snap.groups} />
            ) : (
              <MasterStrip engine={engine} snap={snap} />
            )}
          </ul>
        </div>
      );
    });

  return (
    <section className="flex flex-col gap-1.5 p-1" style={{ height: "calc(100dvh - 3rem)" }} aria-label="Looper board">
      <div className="flex flex-wrap items-center gap-2">
        {controls}
        <button type="button" className={ibtn} disabled={snap.inputs.length >= MAX_INPUTS} onClick={() => setAdding(true)} title="Add an instrument" aria-label="Add an instrument"><Icon name="plus" size={14} /><Icon name="mic" size={14} /></button>
      </div>
      <LoopStage engine={engine} snap={snap} openSeqs={openSeqs} onToggleSeq={onToggleSeq} fill patchSeq cards={cards} />
      {adding && <AddInputModal engine={engine} snap={snap} hasExtra={hasExtra} onClose={() => setAdding(false)} />}
    </section>
  );
}
