"use client";

import type { ReactNode } from "react";
import Icon from "../Icon";
import LoopStage from "./LoopStage";
import { InputStrip, MasterStrip } from "./Mixer";
import { NodeBody, patchName } from "./PatchNode";
import InputBundle from "./InputBundle";
import { PinBody, pinTitle, usePinned } from "./EffectWidgets";
import { togglePin } from "./fxPins";
import { WidgetBoard } from "@/features/widgets";
import { type LooperEngine, type LooperSnapshot } from "@/lib/looper/engine";
import type { DefaultLayout, Layout } from "@/features/widgets/board";


const COL_W = 340;
/** How tall each kind of widget starts. */
const startHeight = (id: string, kind: string | undefined) => (id === "master" ? 150 : kind === "switch" ? 320 : kind === "fx" ? 150 : kind === "pin" ? 280 : kind?.startsWith("input:") ? 230 + Number(kind.slice(6)) * 72 : 210);

/** The Looping stage on the left, everything else in columns to its right. The wires are drawn over it, so where things start hardly matters. */
const freeLayout = (kinds: Record<string, string | undefined>): DefaultLayout => (ids, b) => {
  const out: Layout = {};
  const stageW = Math.round(b.w * 0.56);
  out.stage = { x: 0, y: 0, w: stageW, h: b.h };
  let x = stageW + 16, y = 0;
  ids.filter((id) => id !== "stage").forEach((id) => {
    const h = startHeight(id, kinds[id]);
    if (y > 0 && y + h > b.h) {
      x += COL_W + 12;
      y = 0;
    }
    out[id] = { x, y, w: COL_W, h };
    y += h + 12;
  });
  return out;
};

/**
 * The freeform view, on the same canvas as the Widgets view (zoom at the pointer, pan, fit): the Looping stage (groups, loops and
 * sequencers, whose settings are reached by clicking them), the master bus, every input, and each effect chain and switch are widgets you place anywhere.
 * There are no Mixer or bus sections. The wires between them are drawn over the page by `ConnectionLayer`.
 */
export default function FreeBoard({ engine, snap, controls, keyboardOpen, onToggleKeyboard, openSeqs, onToggleSeq, openPianos, onTogglePiano, resetSignal }: { engine: LooperEngine; snap: LooperSnapshot; controls: ReactNode; keyboardOpen: boolean; onToggleKeyboard: () => void; openSeqs: string[]; onToggleSeq: (id: string) => void; openPianos: string[]; onTogglePiano: (id: string) => void; resetSignal: number }) {
  const pinned = usePinned(engine, snap);
  const strips = snap.inputs.filter((i) => i.kind !== "sequencer");
  // buses that belong to an input live inside that input's block; only the stand-alone ones are widgets of their own
  const cards = snap.patch.nodes.filter((n) => (n.kind === "fx" && !n.owner) || n.kind === "switch");
  const kinds: Record<string, string | undefined> = Object.fromEntries(cards.map((n) => [n.id, n.kind]));
  pinned.forEach((r) => { kinds[`pin:${r.pin.key}`] = "pin"; });
  strips.forEach((i) => { kinds[`in:${i.id}`] = `input:${snap.patch.nodes.filter((n) => n.owner === `in:${i.id}`).length}`; });

  const title = (icon: "mic" | "audio-lines" | "split" | "sliders-horizontal" | "repeat", text: string) => (
    <span className="flex min-w-0 items-center gap-1.5"><Icon name={icon} size={13} className="shrink-0 text-slate-400" /><span className="truncate">{text}</span></span>
  );

  const widgets = [
    {
      id: "stage",
      title: title("repeat", "Looping"),
      node: (
        <section className="flex h-full flex-col gap-1.5 overflow-hidden" aria-label="Looping" data-patch-id="looping">
          <div className="flex flex-wrap items-center gap-2">
            {controls}
          </div>
          <LoopStage engine={engine} snap={snap} openSeqs={openSeqs} onToggleSeq={onToggleSeq} fill patchSeq pins={false} />
        </section>
      ),
    },
    { id: "master", title: title("audio-lines", "Master bus"), node: <ul><MasterStrip engine={engine} snap={snap} /></ul> },
    ...strips.map((inp) => ({
      id: `in:${inp.id}`,
      title: title("mic", inp.name),
      node: (
        <div className="h-full overflow-y-auto">
          <ul>
            <InputStrip engine={engine} inp={inp} devices={snap.devices} anyDevice={snap.devices.length > 0} keyboardOpen={keyboardOpen} onToggleKeyboard={onToggleKeyboard} sequencerOpen={false} onToggleSequencer={() => undefined} pianoOpen={!!inp.sourceId && openPianos.includes(inp.sourceId)} onTogglePiano={() => inp.sourceId && onTogglePiano(inp.sourceId)} seq={undefined} groups={snap.groups} />
          </ul>
          <InputBundle engine={engine} snap={snap} ownerId={`in:${inp.id}`} />
        </div>
      ),
    })),
    ...cards.map((n) => ({
      id: n.id,
      title: (
        <span className="flex min-w-0 flex-1 items-center gap-1.5">
          {title(n.kind === "switch" ? "split" : "sliders-horizontal", patchName(snap, n))}
          <button type="button" className="ml-auto grid h-5 w-5 shrink-0 place-items-center rounded text-slate-400 hover:text-slate-100" aria-pressed={n.muted} onPointerDown={(e) => e.stopPropagation()} onClick={() => engine.do({ type: "patch.mute", what: "node", id: n.id, muted: !n.muted })} title={n.muted ? "Unmute" : "Mute"} aria-label={`${n.muted ? "Unmute" : "Mute"} ${patchName(snap, n)}`}><Icon name={n.muted ? "volume-x" : "volume-2"} size={13} /></button>
        </span>
      ),
      node: <NodeBody engine={engine} snap={snap} node={n} />,
      onClose: () => engine.do({ type: "patch.removeNode", id: n.id }),
    })),
    ...pinned.map((r) => ({ id: `pin:${r.pin.key}`, title: title("sliders-horizontal", pinTitle(r)), node: <PinBody r={r} />, onClose: () => togglePin(r.pin.key) })),
  ];

  return (
    <>
      <WidgetBoard storageKey="musickit.looper.board2" flush place="center" defaults={freeLayout(kinds)} resetSignal={resetSignal} widgets={widgets} />
    </>
  );
}
