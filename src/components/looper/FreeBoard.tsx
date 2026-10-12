"use client";

import { useEffect, type ReactNode } from "react";
import Icon from "../Icon";
import LoopStage from "./LoopStage";
import { InputStrip, MasterStrip } from "./Mixer";
import { NodeBody, patchName } from "./PatchNode";
import InputBundle, { BusSwitch, OutputPlaces } from "./InputBundle";
import InputsMini from "./InputsMini";
import { PinBody, PinTitle, pinTitle, usePinned } from "./EffectWidgets";
import { controlWidget, dropWidgets, toggleWidget, useWidgetRefs } from "./widgets";
import { WidgetBoard, alignLine, attachLayout, bandLayout, type Arrangement, type BandOptions } from "@/features/widgets";
import { VIEW_H, VIEW_W, type LooperEngine, type LooperSnapshot } from "@/lib/looper/engine";
import { drawnFrom } from "@/lib/looper/patchView";
import type { Bounds, DefaultLayout, Layout } from "@/features/widgets/board";


const COL_W = 340;
/** How tall each kind of widget starts. */
const startHeight = (id: string, kind: string | undefined) => (id === "master" ? 150 : kind === "switch" ? 320 : kind === "fx" ? 150 : kind === "tuner" ? 170 : kind === "pin" ? 280 : kind === "control" ? 200 : kind?.startsWith("input:") ? 230 + Number(kind.slice(6)) * 72 : 210);

/** The Looping stage starts big enough to show its default groups whole at 100% (the stage never scales with its widget), plus its controls and padding. */
const stageSize = () => ({ w: VIEW_W + 32, h: VIEW_H + 110 });

/**
 * The widgets in the order the sound goes: inputs, then buses, switches and effects, then the Looping stage, then the master.
 * The middle row follows the inputs that feed it (`fedBy`: the mean place of its sources in the input row), so the wires do not cross.
 */
const flowBands = (ids: string[], kinds: Record<string, string | undefined>, fedBy: Record<string, number>, owned: (id: string) => boolean) => [
  ids.filter((id) => kinds[id]?.startsWith("input:")),
  ids.filter((id) => id !== "stage" && id !== "master" && !kinds[id]?.startsWith("input:") && !owned(id)).map((id, i) => ({ id, i, at: fedBy[id] ?? Infinity })).sort((p, q) => p.at - q.at || p.i - q.i).map((x) => x.id),
  ids.filter((id) => id === "stage"),
  ids.filter((id) => id === "master"),
];

/**
 * Lay the bands out with each widget at its current size (or its starting size), a stage's length apart before wrapping. Pinned effects
 * go under (vertical) or right of (horizontal) the widget they belong to (`ownerOf`: the Looping stage for a group's, the input, bus or master).
 */
const flowLayout = (kinds: Record<string, string | undefined>, fedBy: Record<string, number>, feeds: Record<string, string[]>, ownerOf: Record<string, string>, opts: BandOptions & { wrapBy: number }) => (ids: string[], b: Bounds, current?: Layout): Layout => {
  const stage = current?.stage ?? stageSize();
  const sizes = Object.fromEntries(ids.map((id) => [id, current?.[id] ?? (id === "stage" ? stage : { w: COL_W, h: startHeight(id, kinds[id]) })]));
  const owned = (id: string) => !!ownerOf[id] && ids.includes(ownerOf[id]);
  const bands = flowBands(ids, kinds, fedBy, owned);
  const placed = bandLayout(bands, sizes, { ...opts, wrap: (opts.direction === "vertical" ? stage.w : stage.h) * opts.wrapBy });
  // each block of the middle row sits by the inputs that feed it (a tuner under the guitar), so a wire from another input does not run through it
  const v = opts.direction === "vertical";
  const mid = (id: string) => (v ? placed[id].x + placed[id].w / 2 : placed[id].y + placed[id].h / 2);
  const want = Object.fromEntries(bands[1].flatMap((id) => {
    const from = (feeds[id] ?? []).filter((f) => placed[f]);
    return from.length ? [[id, from.reduce((a, f) => a + mid(f), 0) / from.length]] : [];
  }));
  const aligned = alignLine(placed, bands[1], want, opts.direction, opts.gap);
  const attach: Record<string, string[]> = {};
  ids.filter(owned).forEach((id) => (attach[ownerOf[id]] ??= []).push(id));
  return attachLayout(aligned, attach, sizes, opts.direction, opts.gap, opts.bandGap);
};

/** Inputs on top, Looping below them, the master at the bottom: how the canvas starts. The wires are drawn over it. */
const freeLayout = (kinds: Record<string, string | undefined>, fedBy: Record<string, number>, feeds: Record<string, string[]>, ownerOf: Record<string, string>): DefaultLayout => flowLayout(kinds, fedBy, feeds, ownerOf, { direction: "vertical", gap: 96, bandGap: 200, wrapBy: 1.5 });

const arrangements = (kinds: Record<string, string | undefined>, fedBy: Record<string, number>, feeds: Record<string, string[]>, ownerOf: Record<string, string>): Arrangement[] => [
  { id: "vertical", label: "Vertical", hint: "Inputs on top, Looping below, the master at the bottom", icon: "rows-3", layout: flowLayout(kinds, fedBy, feeds, ownerOf, { direction: "vertical", gap: 96, bandGap: 200, wrapBy: 1.5 }) },
  { id: "vertical-tight", label: "Vertical tight", hint: "The same, close together and no wider than Looping", icon: "rows-3", layout: flowLayout(kinds, fedBy, feeds, ownerOf, { direction: "vertical", gap: 32, bandGap: 72, wrapBy: 1 }) },
  { id: "horizontal", label: "Horizontal", hint: "Inputs on the left, Looping in the middle, the master on the right", icon: "columns-3", layout: flowLayout(kinds, fedBy, feeds, ownerOf, { direction: "horizontal", gap: 96, bandGap: 200, wrapBy: 1.5 }) },
  { id: "horizontal-tight", label: "Horizontal tight", hint: "The same, close together and no taller than Looping", icon: "columns-3", layout: flowLayout(kinds, fedBy, feeds, ownerOf, { direction: "horizontal", gap: 32, bandGap: 72, wrapBy: 1 }) },
];

/**
 * The freeform view, on the same canvas as the Widgets view (zoom at the pointer, pan, fit): the Looping stage (groups, loops and
 * sequencers, whose settings are reached by clicking them), the master bus, every input, and each effect chain, switch and tuner are widgets you place anywhere.
 * There are no Mixer or bus sections. The wires between them are drawn over the page by `ConnectionLayer`.
 */
export default function FreeBoard({ engine, snap, controls, openSeqs, onToggleSeq, openPianos, onTogglePiano }: { engine: LooperEngine; snap: LooperSnapshot; controls: ReactNode; openSeqs: string[]; onToggleSeq: (id: string) => void; openPianos: string[]; onTogglePiano: (id: string) => void }) {
  const pinned = usePinned(engine, snap);
  const strips = snap.inputs.filter((i) => i.kind !== "sequencer");
  // the other widgets: an input's buses switch, its outputs, the Inputs list. Those of an input that is gone are dropped.
  const refs = useWidgetRefs();
  const hasOwner = (ownerId: string) => snap.patch.nodes.some((n) => n.id === ownerId);
  const others = refs.flatMap((r) => {
    const c = controlWidget(r.key);
    return c ? [{ key: r.key, c }] : [];
  });
  const staleKey = others.filter(({ c }) => c.kind !== "inputs" && !hasOwner(c.ownerId)).map((x) => x.key).join("|");
  useEffect(() => {
    if (staleKey) dropWidgets(staleKey.split("|"));
  }, [staleKey]);
  const shownControls = others.filter(({ c }) => c.kind === "inputs" || hasOwner(c.ownerId));
  // buses that belong to an input live inside that input's block; only the stand-alone ones are widgets of their own
  const cards = snap.patch.nodes.filter((n) => (n.kind === "fx" && !n.owner) || n.kind === "switch" || n.kind === "tuner");
  const kinds: Record<string, string | undefined> = Object.fromEntries(cards.map((n) => [n.id, n.kind]));
  pinned.forEach((r) => { kinds[`pin:${r.pin.key}`] = "pin"; });
  shownControls.forEach(({ key }) => { kinds[`pin:${key}`] = "control"; });
  // the widget each pinned effect belongs to: a group's live on the Looping stage, a bus of an input inside that input's block
  const ownerOf: Record<string, string> = {};
  pinned.forEach((r) => {
    const kind = r.pin.key.slice(0, r.pin.key.indexOf(":"));
    const owner = r.pin.key.slice(kind.length + 1, r.pin.key.lastIndexOf(":"));
    const bus = kind === "e" ? snap.patch.nodes.find((n) => n.id === owner) : undefined;
    const at = kind === "g" ? "stage" : kind === "m" ? "master" : kind === "i" ? `in:${owner}` : bus ? (bus.owner ?? bus.id) : undefined;
    if (at) ownerOf[`pin:${r.pin.key}`] = at;
  });
  // an input's switch and outputs widgets go by that input's block
  shownControls.forEach(({ key, c }) => { if (c.kind !== "inputs") ownerOf[`pin:${key}`] = c.ownerId; });
  strips.forEach((i) => { kinds[`in:${i.id}`] = `input:${snap.patch.nodes.filter((n) => n.owner === `in:${i.id}`).length}`; });
  // where in the input row the sound of each block comes from, following links on through chains (a tuner, then a switch)
  const fedBy: Record<string, number> = {};
  const feeds: Record<string, string[]> = {};
  const inputAt = (id: string, seen: string[] = []): number[] => {
    const i = strips.findIndex((x) => `in:${x.id}` === id);
    if (i >= 0) return [i];
    if (seen.includes(id)) return [];
    return snap.patch.links.filter((l) => l.to === id).flatMap((l) => inputAt(drawnFrom(snap.patch, l), [...seen, id]));
  };
  Object.keys(kinds).forEach((id) => {
    const at = inputAt(id);
    if (!at.length || kinds[id]?.startsWith("input:")) return;
    fedBy[id] = at.reduce((a, b) => a + b, 0) / at.length;
    feeds[id] = [...new Set(at)].map((i) => `in:${strips[i].id}`);
  });

  const title = (icon: "mic" | "piano" | "audio-lines" | "split" | "sliders-horizontal" | "repeat" | "gauge" | "list" | "git-merge", text: string) => (
    <span className="flex min-w-0 items-center gap-1.5"><Icon name={icon} size={13} className="shrink-0 text-slate-400" /><span className="truncate">{text}</span></span>
  );

  const widgets = [
    {
      id: "stage",
      back: true,
      title: title("repeat", "Looping"),
      node: (
        <section className="flex h-full flex-col gap-1.5 overflow-hidden" aria-label="Looping" data-patch-id="looping">
          <div className="flex flex-wrap items-center gap-2">
            {controls}
          </div>
          <LoopStage engine={engine} snap={snap} openSeqs={openSeqs} onToggleSeq={onToggleSeq} fill natural patchSeq pins={false} />
        </section>
      ),
    },
    { id: "master", fit: true, title: title("audio-lines", "Master bus"), node: <ul><MasterStrip engine={engine} snap={snap} /></ul> },
    ...strips.map((inp) => ({
      id: `in:${inp.id}`,
      fit: true,
      title: title(inp.kind === "instrument" ? "piano" : "mic", inp.name),
      node: (
        // the whole block (strip and buses) is where the input's one output leaves from; the widget is as tall as it
        <div data-patch-id={`in:${inp.id}`}>
          <ul>
            <InputStrip engine={engine} inp={inp} devices={snap.devices} anyDevice={snap.devices.length > 0} sequencerOpen={false} onToggleSequencer={() => undefined} pianoOpen={!!inp.sourceId && openPianos.includes(inp.sourceId)} onTogglePiano={() => inp.sourceId && onTogglePiano(inp.sourceId)} seq={undefined} inst={snap.instruments.find((q) => q.id === inp.sourceId)} groups={snap.groups} />
          </ul>
          <InputBundle engine={engine} snap={snap} ownerId={`in:${inp.id}`} />
        </div>
      ),
    })),
    ...cards.map((n) => ({
      id: n.id,
      fit: true,
      title: title(n.kind === "switch" ? "split" : n.kind === "tuner" ? "gauge" : "sliders-horizontal", patchName(snap, n)),
      name: patchName(snap, n),
      node: <NodeBody engine={engine} snap={snap} node={n} />,
      // the tuner is pinnable, but not a widget: deleting its block deletes the tuner
      pinnable: n.kind === "tuner",
      onDelete: () => engine.do({ type: "patch.removeNode", id: n.id }),
      deleteTitle: n.kind === "tuner" ? "Delete tuner" : n.kind === "switch" ? "Delete switch" : "Delete bus",
    })),
    ...pinned.map((r) => ({ id: `pin:${r.pin.key}`, fit: true, pinnable: true, name: pinTitle(r), title: <PinTitle r={r} />, node: <PinBody r={r} />, onDelete: () => toggleWidget(r.pin.key), deleteTitle: "Delete widget (the effect stays)" })),
    ...shownControls.map(({ key, c }) => {
      const common = { id: `pin:${key}`, fit: true, pinnable: true, onDelete: () => toggleWidget(key) };
      if (c.kind === "inputs") {
        return { ...common, pinStart: { x: 8, y: 8 }, deleteTitle: "Delete widget (the inputs stay)", name: "Inputs", title: title("list", "Inputs"), node: <InputsMini engine={engine} snap={snap} openPianos={openPianos} onTogglePiano={onTogglePiano} embedded /> };
      }
      const owner = snap.patch.nodes.find((n) => n.id === c.ownerId);
      const name = owner ? patchName(snap, owner) : "Input";
      return c.kind === "switch"
        ? { ...common, deleteTitle: "Delete widget (the buses stay)", name: `${name} · Switch between buses`, title: title("split", `${name} · Switch between buses`), node: <BusSwitch engine={engine} snap={snap} ownerId={c.ownerId} patchIds={false} bare /> }
        : { ...common, deleteTitle: "Delete widget (the connections stay)", name: `${name} · Groups and buses`, title: title("git-merge", `${name} · Groups and buses`), node: <OutputPlaces engine={engine} snap={snap} ownerId={c.ownerId} bare /> };
    }),
  ];

  // Delete on several selected blocks: the buses, switches and tuners go in one undo step; widgets (effects, input switches and outputs, the Inputs list) are deleted
  const onDelete = (ids: string[]) => {
    const nodes = ids.filter((id) => cards.some((n) => n.id === id));
    if (nodes.length === 1) engine.do({ type: "patch.removeNode", id: nodes[0] });
    else if (nodes.length) engine.do({ type: "batch", label: `Remove ${nodes.length} blocks`, actions: nodes.map((id) => ({ type: "patch.removeNode", id })) });
    ids.filter((id) => id.startsWith("pin:")).forEach((id) => toggleWidget(id.slice(4)));
  };

  return (
    <>
      <WidgetBoard onDelete={onDelete} storageKey="musickit.looper.board2" flush place="center" defaults={freeLayout(kinds, fedBy, feeds, ownerOf)} arrangements={arrangements(kinds, fedBy, feeds, ownerOf)} start="vertical" fitMargin={56} widgets={widgets} />
    </>
  );
}
