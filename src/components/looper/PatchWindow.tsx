"use client";

import { useLayoutEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from "react";
import Icon from "@/components/Icon";
import EffectsModal from "./EffectsModal";
import { place, whyNot, type PatchKind, type PatchLink, type PatchNode, type Port } from "@/lib/looper/patch";
import type { LooperEngine, LooperSnapshot } from "@/lib/looper/engine";

const ibtn = "grid h-7 min-w-7 place-items-center rounded-md border border-slate-700 bg-slate-900 px-1 text-xs text-slate-200 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400";
const W = 168;
const ICON: Record<PatchKind, string> = { input: "mic", piano: "piano", sequencer: "drum", synth: "audio-lines", fx: "sliders-horizontal", switch: "split", group: "rows-3", loop: "repeat", master: "volume-2" };

let counter = 0;
const newId = (p: string) => `${p}${Date.now().toString(36)}${(counter++).toString(36)}`;

interface Pt { x: number; y: number }
interface Drag { from: string; at: Pt; start: Pt }

/**
 * The patch canvas: every sound maker, effect chain, switch, group and the master as a box, every connection as a wire.
 * Drag a box by its title, drag from an output dot to an input dot to connect, click a wire to mute or remove it.
 * It only calls engine actions, so everything here is undoable and recordable.
 */
export default function PatchWindow({ engine, snap }: { engine: LooperEngine; snap: LooperSnapshot }) {
  const patch = snap.patch;
  const canvas = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<Record<string, Pt>>({});
  const [ports, setPorts] = useState<Record<string, Pt>>({});
  const [drag, setDrag] = useState<Drag | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const [fxId, setFxId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const name = (n: PatchNode): string => {
    if (n.name) return n.name;
    if (n.kind === "input" || n.kind === "piano") return snap.inputs.find((i) => `in:${i.id}` === n.id)?.name ?? "Input";
    if (n.kind === "sequencer") return snap.sequencers.find((q) => `seq:${q.id}` === n.id)?.name ?? "Sequencer";
    if (n.kind === "group") return snap.groups.find((g) => `group:${g.id}` === n.id)?.name ?? "Group";
    if (n.kind === "master") return "Master";
    if (n.kind === "switch") return "Switch";
    return "Effects";
  };
  const nameOf = (id: string) => {
    const n = patch.nodes.find((m) => m.id === id);
    return n ? name(n) : id;
  };
  const at = (n: PatchNode): Pt => pos[n.id] ?? { x: n.x, y: n.y };

  // measure the port dots after every render, so wires meet them wherever the boxes grew to
  useLayoutEffect(() => {
    const root = canvas.current;
    if (!root) return;
    const base = root.getBoundingClientRect();
    const next: Record<string, Pt> = {};
    root.querySelectorAll<HTMLElement>("[data-port]").forEach((el) => {
      const r = el.getBoundingClientRect();
      next[el.dataset.port as string] = { x: r.left - base.left + root.scrollLeft + r.width / 2, y: r.top - base.top + root.scrollTop + r.height / 2 };
    });
    setPorts((old) => {
      const keys = Object.keys(next);
      if (keys.length === Object.keys(old).length && keys.every((k) => old[k] && Math.abs(old[k].x - next[k].x) < 0.5 && Math.abs(old[k].y - next[k].y) < 0.5)) return old;
      return next;
    });
  });

  const outKey = (id: string) => `out:${id}`;
  const inKey = (id: string, port: Port) => `in:${id}:${port}`;

  const link = (from: string, to: string, port: Port) => {
    const why = whyNot(patch, from, to, port);
    if (why) {
      setMsg(why);
      return;
    }
    setMsg(null);
    engine.do({ type: "patch.link", link: { id: newId("l"), from, to, ...(port === "rec" ? { port } : {}) } });
  };

  const startWire = (from: string) => (e: RPointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const root = canvas.current;
    const p = ports[outKey(from)];
    if (!root || !p) return;
    const toPt = (ev: { clientX: number; clientY: number }): Pt => {
      const b = root.getBoundingClientRect();
      return { x: ev.clientX - b.left + root.scrollLeft, y: ev.clientY - b.top + root.scrollTop };
    };
    setDrag({ from, at: toPt(e), start: p });
    const move = (ev: PointerEvent) => setDrag((d) => (d ? { ...d, at: toPt(ev) } : d));
    const up = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      setDrag(null);
      const el = document.elementFromPoint(ev.clientX, ev.clientY)?.closest<HTMLElement>("[data-in]");
      if (el) {
        const [to, port] = (el.dataset.in as string).split("|");
        link(from, to, port as Port);
      }
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const startMove = (n: PatchNode) => (e: RPointerEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    e.preventDefault();
    const origin = at(n);
    const sx = e.clientX;
    const sy = e.clientY;
    let last = origin;
    const move = (ev: PointerEvent) => {
      last = { x: Math.max(0, origin.x + ev.clientX - sx), y: Math.max(0, origin.y + ev.clientY - sy) };
      setPos((p) => ({ ...p, [n.id]: last }));
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      if (last.x !== origin.x || last.y !== origin.y) engine.do({ type: "patch.move", id: n.id, x: Math.round(last.x), y: Math.round(last.y) });
      setPos((p) => {
        const { [n.id]: _gone, ...rest } = p;
        void _gone;
        return rest;
      });
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const addNode = (kind: "fx" | "switch") => {
    const n = patch.nodes.filter((m) => m.kind === kind).length + 1;
    engine.do({ type: "patch.node", node: { id: newId(kind === "fx" ? "fx:" : "sw:"), kind, ...place(patch, kind), name: kind === "fx" ? `Chain ${n}` : `Switch ${n}` } });
  };

  const wires = patch.links.map((l) => {
    const a = ports[outKey(l.from)];
    const b = ports[inKey(l.to, l.port ?? "bus")];
    return a && b ? { l, a, b } : null;
  });
  const active = useMemo(() => new Set(snap.patchActive), [snap.patchActive]);
  const selLink = patch.links.find((l) => l.id === sel);
  const curve = (a: Pt, b: Pt) => {
    const dx = Math.max(40, Math.abs(b.x - a.x) / 2);
    return `M${a.x},${a.y} C${a.x + dx},${a.y} ${b.x - dx},${b.y} ${b.x},${b.y}`;
  };
  const fxNode = patch.nodes.find((n) => n.id === fxId && n.kind === "fx");

  const port = (key: string, cls = "") => <span data-port={key} className={`block h-3 w-3 rounded-full border-2 border-slate-400 bg-slate-900 ${cls}`} />;

  const inPort = (n: PatchNode, p: Port, label?: string) => {
    const ok = drag ? !whyNot(patch, drag.from, n.id, p) : false;
    return (
      <span data-in={`${n.id}|${p}`} className={`-ml-[19px] flex items-center gap-1 py-0.5 pr-1 ${drag ? (ok ? "text-emerald-300" : "opacity-40") : ""}`}>
        {port(inKey(n.id, p), ok ? "!border-emerald-400" : "")}
        {label && <span className="text-[10px] text-slate-400">{label}</span>}
      </span>
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <button type="button" className={ibtn} onClick={() => addNode("fx")} title="Add an effect chain" aria-label="Add an effect chain"><Icon name="sliders-horizontal" size={14} /><span className="ml-1">chain</span></button>
        <button type="button" className={ibtn} onClick={() => addNode("switch")} title="Add a switch: one input, several outputs, one open at a time" aria-label="Add a switch"><Icon name="split" size={14} /><span className="ml-1">switch</span></button>
        {selLink ? (
          <span className="ml-auto flex items-center gap-1.5 text-slate-300">
            <span className="max-w-[18ch] truncate">{nameOf(selLink.from)} → {nameOf(selLink.to)}{selLink.port === "rec" ? " (rec)" : ""}</span>
            <button type="button" className={ibtn} aria-pressed={selLink.muted} onClick={() => engine.do({ type: "patch.mute", what: "link", id: selLink.id, muted: !selLink.muted })} title={selLink.muted ? "Unmute the connection" : "Mute the connection"} aria-label={selLink.muted ? "Unmute the connection" : "Mute the connection"}><Icon name={selLink.muted ? "volume-x" : "volume-2"} size={14} /></button>
            <button type="button" className={ibtn} onClick={() => { engine.do({ type: "patch.unlink", id: selLink.id }); setSel(null); }} title="Remove the connection" aria-label="Remove the connection"><Icon name="trash" size={14} /></button>
          </span>
        ) : (
          <span className="ml-auto text-[11px] text-slate-500">Drag from a dot on the right to a dot on the left</span>
        )}
      </div>
      {msg && <p role="alert" className="text-[11px] text-amber-200">{msg}</p>}
      <div ref={canvas} className="relative min-h-0 flex-1 overflow-auto rounded-lg border border-slate-800 bg-slate-950/60" onPointerDown={() => setSel(null)}>
        <div className="relative" style={{ width: 1400, height: 900 }}>
          <svg className="absolute inset-0 h-full w-full" aria-hidden>
            {wires.map((w) =>
              w && (
                <g key={w.l.id}>
                  <path d={curve(w.a, w.b)} fill="none" stroke="transparent" strokeWidth={14} className="cursor-pointer" onPointerDown={(e) => { e.stopPropagation(); setSel(w.l.id); }} />
                  <path d={curve(w.a, w.b)} fill="none" pointerEvents="none" strokeWidth={sel === w.l.id ? 3 : 2} strokeDasharray={w.l.muted ? "4 4" : undefined} stroke={sel === w.l.id ? "#38bdf8" : active.has(w.l.id) ? "#34d399" : "#64748b"} opacity={w.l.muted ? 0.6 : active.has(w.l.id) ? 1 : 0.55} />
                </g>
              ),
            )}
            {drag && <path d={curve(drag.start, drag.at)} fill="none" stroke="#38bdf8" strokeWidth={2} strokeDasharray="3 3" pointerEvents="none" />}
          </svg>
          {patch.nodes.map((n) => {
            const p = at(n);
            const outs = patch.links.filter((l) => l.from === n.id);
            const kindOut = n.kind !== "master" && n.kind !== "loop";
            return (
              <div key={n.id} data-node={n.id} className={`absolute rounded-lg border bg-slate-900 text-xs shadow ${n.muted ? "border-slate-700 opacity-60" : "border-slate-600"}`} style={{ left: p.x, top: p.y, width: W }}>
                <div className="flex cursor-grab touch-none items-center gap-1 rounded-t-lg border-b border-slate-800 bg-slate-800/60 px-1.5 py-1 active:cursor-grabbing" onPointerDown={startMove(n)}>
                  <Icon name={ICON[n.kind] as never} size={13} className="shrink-0 text-slate-400" />
                  <span className="min-w-0 flex-1 truncate font-medium text-slate-100" title={name(n)}>{name(n)}</span>
                  {n.kind !== "master" && <button type="button" className="text-slate-400 hover:text-slate-100" aria-pressed={n.muted} onClick={() => engine.do({ type: "patch.mute", what: "node", id: n.id, muted: !n.muted })} title={n.muted ? "Unmute" : "Mute"} aria-label={`${n.muted ? "Unmute" : "Mute"} ${name(n)}`}><Icon name={n.muted ? "volume-x" : "volume-2"} size={13} /></button>}
                  {(n.kind === "fx" || n.kind === "switch") && <button type="button" className="text-slate-500 hover:text-rose-300" onClick={() => engine.do({ type: "patch.removeNode", id: n.id })} title="Remove" aria-label={`Remove ${name(n)}`}><Icon name="x" size={13} /></button>}
                </div>
                <div className="flex items-stretch justify-between gap-1 px-1.5 py-1">
                  <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
                    {n.kind === "group" ? (
                      <>
                        {inPort(n, "rec", "rec")}
                        {inPort(n, "bus", "bus")}
                      </>
                    ) : (n.kind === "fx" || n.kind === "switch" || n.kind === "master") ? inPort(n, "bus") : null}
                    {n.kind === "fx" && (
                      <button type="button" className="mt-0.5 flex items-center gap-1 rounded border border-slate-700 px-1 py-0.5 text-left text-[11px] text-slate-300 hover:border-slate-500" onClick={() => setFxId(n.id)} title="Edit the effects" aria-label={`Edit ${name(n)}`}>
                        <Icon name="sliders-horizontal" size={11} />
                        <span className="truncate">{n.effects?.length ? n.effects.map((e) => e.kind).join(" + ") : "empty"}</span>
                      </button>
                    )}
                    {n.kind === "switch" && (
                      <div className="mt-0.5 flex flex-col gap-0.5" role="radiogroup" aria-label="Open output">
                        {outs.length === 0 && <span className="text-[10px] text-slate-500">no outputs yet</span>}
                        {outs.map((l: PatchLink, i) => (
                          <button key={l.id} type="button" role="radio" aria-checked={(n.selected ?? 0) === i} className={`flex items-center gap-1 rounded px-1 py-0.5 text-left text-[11px] ${(n.selected ?? 0) === i ? "bg-emerald-500/20 text-emerald-100" : "text-slate-400 hover:bg-slate-800"}`} onClick={() => engine.do({ type: "patch.switch", id: n.id, selected: i })} title={`Open the output to ${nameOf(l.to)}`}>
                            <span className={`h-2 w-2 shrink-0 rounded-full border ${(n.selected ?? 0) === i ? "border-emerald-300 bg-emerald-300" : "border-slate-500"}`} />
                            <span className="truncate">{nameOf(l.to)}{l.port === "rec" ? " (rec)" : ""}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {kindOut && (
                    <span className="-mr-[19px] flex items-center self-center" onPointerDown={startWire(n.id)} title="Drag to an input to connect" style={{ cursor: "crosshair", touchAction: "none" }}>
                      <span className="p-1">{port(outKey(n.id), "hover:!bg-sky-400")}</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {fxNode && (
        <EffectsModal
          title={<span className="flex items-center gap-2"><Icon name="sliders-horizontal" size={16} />{name(fxNode)}: effects</span>}
          effects={fxNode.effects ?? []}
          onAdd={(k) => engine.do({ type: "fx.add", target: { element: fxNode.id }, fx: { kind: k } })}
          onRemove={(id) => engine.do({ type: "fx.remove", target: { element: fxNode.id }, id })}
          onParam={(id, key, value) => engine.do({ type: "fx.param", target: { element: fxNode.id }, id, key, value })}
          onBypass={(id) => engine.do({ type: "fx.bypass", target: { element: fxNode.id }, id, bypass: !fxNode.effects?.find((e) => e.id === id)?.bypass })}
          onClose={() => setFxId(null)}
        />
      )}
    </div>
  );
}
