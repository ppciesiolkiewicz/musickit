"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent, type RefObject } from "react";
import Icon from "@/components/Icon";
import EffectsModal from "./EffectsModal";
import { whyNot, type PatchKind, type PatchLink, type PatchNode, type Port } from "@/lib/looper/patch";
import { linkColour, sourceColours } from "@/lib/looper/patchView";
import type { LooperEngine, LooperSnapshot } from "@/lib/looper/engine";

interface Rect { x: number; y: number; w: number; h: number }
interface Pt { x: number; y: number }

const MUTED = "#64748b";
const CARD_W = 168;
const OUT_KINDS: PatchKind[] = ["input", "piano", "sequencer", "synth", "fx", "switch"];
const TARGET_KINDS: PatchKind[] = ["fx", "switch", "group", "master"];

let counter = 0;
const newId = (p: string) => `${p}${Date.now().toString(36)}${(counter++).toString(36)}`;

/** The part of an element that can be seen: clipped by every scrolling or clipping ancestor. Null when none of it shows. */
function visibleRect(el: HTMLElement): DOMRect | null {
  const r = el.getBoundingClientRect();
  let { left, top, right, bottom } = r;
  for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
    const cs = getComputedStyle(p);
    if (cs.overflowX === "visible" && cs.overflowY === "visible") continue;
    const b = p.getBoundingClientRect();
    left = Math.max(left, b.left);
    top = Math.max(top, b.top);
    right = Math.min(right, b.right);
    bottom = Math.min(bottom, b.bottom);
  }
  return right - left > 4 && bottom - top > 4 ? new DOMRect(left, top, right - left, bottom - top) : null;
}

/**
 * Draws the patch over the page. Every sound maker, group and the master that carries a `data-patch-id` gets coloured
 * connectors; effect chains and switches are small cards that float over the page. With `mode: "lines"` the connections
 * are drawn as wires as well. Drag from a connector on the right of a strip or card onto a group (top half: what its loops
 * record, bottom half: what you hear through it), the master, a chain or a switch. Click a connector or wire to mute or remove it.
 * It only calls engine actions, so everything is undoable.
 */
export default function ConnectionLayer({ engine, snap, mode, wrapper }: { engine: LooperEngine; snap: LooperSnapshot; mode: "colors" | "lines"; wrapper: RefObject<HTMLElement | null> }) {
  const patch = snap.patch;
  const [rects, setRects] = useState<Record<string, Rect>>({});
  const [drag, setDrag] = useState<{ from: string; at: Pt } | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const [fxId, setFxId] = useState<string | null>(null);
  const [pos, setPos] = useState<Record<string, Pt>>({});
  const [msg, setMsg] = useState<string | null>(null);

  // measure the elements every other frame: layouts move (widgets are dragged, windows resize, the page scrolls)
  useEffect(() => {
    let raf = 0;
    let n = 0;
    let last = "";
    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (n++ % 2) return;
      const root = wrapper.current;
      if (!root) return;
      const base = root.getBoundingClientRect();
      const next: Record<string, Rect> = {};
      root.querySelectorAll<HTMLElement>("[data-patch-id]").forEach((el) => {
        const id = el.dataset.patchId as string;
        if (next[id]) return;
        const r = visibleRect(el);
        if (r) next[id] = { x: Math.round(r.left - base.left), y: Math.round(r.top - base.top), w: Math.round(r.width), h: Math.round(r.height) };
      });
      const key = JSON.stringify(next);
      if (key !== last) {
        last = key;
        setRects(next);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [wrapper]);

  useEffect(() => {
    if (!msg) return;
    const t = window.setTimeout(() => setMsg(null), 3500);
    return () => window.clearTimeout(t);
  }, [msg]);

  const colours = useMemo(() => sourceColours(patch), [patch]);
  const node = (id: string) => patch.nodes.find((n) => n.id === id);
  const name = (n: PatchNode): string => {
    if (n.name) return n.name;
    if (n.kind === "input" || n.kind === "piano") return snap.inputs.find((i) => `in:${i.id}` === n.id)?.name ?? "Input";
    if (n.kind === "sequencer") return snap.sequencers.find((q) => `seq:${q.id}` === n.id)?.name ?? "Sequencer";
    if (n.kind === "group") return snap.groups.find((g) => `group:${g.id}` === n.id)?.name ?? "Group";
    if (n.kind === "master") return "Master";
    return n.kind === "switch" ? "Switch" : "Effects";
  };
  const nameOf = (id: string) => {
    const n = node(id);
    return n ? name(n) : id;
  };
  const active = useMemo(() => new Set(snap.patchActive), [snap.patchActive]);

  const outPt = (id: string): Pt | null => {
    const r = rects[id];
    return r ? { x: r.x + r.w, y: r.y + r.h / 2 } : null;
  };
  const inPt = (id: string, port: Port): Pt | null => {
    const r = rects[id];
    if (!r) return null;
    return node(id)?.kind === "group" ? { x: r.x, y: r.y + r.h * (port === "rec" ? 0.28 : 0.72) } : { x: r.x, y: r.y + r.h / 2 };
  };
  const curve = (a: Pt, b: Pt) => {
    const dx = Math.max(40, Math.abs(b.x - a.x) / 2);
    return `M${a.x},${a.y} C${a.x + dx},${a.y} ${b.x - dx},${b.y} ${b.x},${b.y}`;
  };

  const drawn = patch.links.flatMap((l) => {
    // a group always plays into the master: that fixed route is not drawn
    if (node(l.from)?.kind === "group") return [];
    const a = outPt(l.from);
    const b = inPt(l.to, l.port ?? "bus");
    return a && b ? [{ l, a, b, colour: linkColour(patch, l, colours) }] : [];
  });
  // several connections into one input stack their tabs down the edge
  const slot = new Map<string, number>();
  const tabs = drawn.map((d) => {
    const key = `${d.l.to}|${d.l.port ?? "bus"}`;
    const i = slot.get(key) ?? 0;
    slot.set(key, i + 1);
    return { ...d, i };
  });
  const selLink = patch.links.find((l) => l.id === sel);
  const selDrawn = drawn.find((d) => d.l.id === sel);

  const link = (from: string, to: string, port: Port) => {
    const why = whyNot(patch, from, to, port);
    if (why) return setMsg(why);
    engine.do({ type: "patch.link", link: { id: newId("l"), from, to, ...(port === "rec" ? { port } : {}) } });
  };

  /** The element and port under a point, for dropping a connection. Cards float above the page, so they win. */
  const targetAt = (p: Pt): { id: string; port: Port } | null => {
    const hits = Object.entries(rects).filter(([id, r]) => TARGET_KINDS.includes(node(id)?.kind as PatchKind) && p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h);
    const pick = hits.find(([id]) => node(id)?.kind === "fx" || node(id)?.kind === "switch") ?? hits[0];
    if (!pick) return null;
    const [id, r] = pick;
    return { id, port: node(id)?.kind === "group" && p.y < r.y + r.h / 2 ? "rec" : "bus" };
  };

  const startWire = (from: string) => (e: RPointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const root = wrapper.current;
    if (!root) return;
    const toPt = (ev: { clientX: number; clientY: number }): Pt => {
      const b = root.getBoundingClientRect();
      return { x: ev.clientX - b.left, y: ev.clientY - b.top };
    };
    setSel(null);
    setDrag({ from, at: toPt(e) });
    const move = (ev: PointerEvent) => setDrag({ from, at: toPt(ev) });
    const up = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      setDrag(null);
      const t = targetAt(toPt(ev));
      if (t) link(from, t.id, t.port);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const startMove = (n: PatchNode) => (e: RPointerEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    e.preventDefault();
    const origin = pos[n.id] ?? { x: n.x, y: n.y };
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
        const { [n.id]: gone, ...rest } = p;
        void gone;
        return rest;
      });
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const handleColour = (id: string) => {
    const l = patch.links.find((x) => x.from === id);
    return l ? linkColour(patch, l, colours) : colours[id] ?? MUTED;
  };

  const cards = patch.nodes.filter((n) => n.kind === "fx" || n.kind === "switch");
  const fxNode = patch.nodes.find((n) => n.id === fxId && n.kind === "fx");

  return (
    <div className="pointer-events-none absolute inset-0 z-20" aria-label="Connections">
      {mode === "lines" && (
        <svg className="absolute inset-0 h-full w-full" aria-hidden>
          {drawn.map((d) => {
            const faint = d.l.id.startsWith("rec:");
            const on = active.has(d.l.id);
            return (
              <g key={d.l.id}>
                <path d={curve(d.a, d.b)} fill="none" stroke="transparent" strokeWidth={12} style={{ pointerEvents: "stroke", cursor: "pointer" }} onPointerDown={(e) => { e.stopPropagation(); setSel(d.l.id); }} />
                <path d={curve(d.a, d.b)} fill="none" pointerEvents="none" stroke={sel === d.l.id ? "#f8fafc" : d.colour} strokeWidth={sel === d.l.id ? 3 : faint ? 1.25 : 2.25} strokeDasharray={d.l.muted ? "4 4" : undefined} opacity={d.l.muted ? 0.5 : on ? (faint ? 0.45 : 0.95) : 0.3} />
              </g>
            );
          })}
        </svg>
      )}
      {drag && (
        <svg className="absolute inset-0 h-full w-full" aria-hidden>
          {outPt(drag.from) && <path d={curve(outPt(drag.from) as Pt, drag.at)} fill="none" stroke={handleColour(drag.from)} strokeWidth={2.5} strokeDasharray="4 4" />}
        </svg>
      )}
      {/* where a dragged connection can land */}
      {drag && Object.entries(rects).map(([id, r]) => {
        const n = node(id);
        if (!n || !TARGET_KINDS.includes(n.kind) || id === drag.from) return null;
        const halves: { port: Port; top: number; h: number; label: string }[] = n.kind === "group" ? [{ port: "rec", top: 0, h: r.h / 2, label: "record" }, { port: "bus", top: r.h / 2, h: r.h / 2, label: "hear" }] : [{ port: "bus", top: 0, h: r.h, label: "" }];
        return halves.map((hf) => {
          const ok = !whyNot(patch, drag.from, id, hf.port);
          return (
            <div key={`${id}:${hf.port}`} className={`absolute grid place-items-center rounded-lg border-2 text-[11px] font-medium ${ok ? "border-emerald-400/80 bg-emerald-400/15 text-emerald-100" : "border-slate-600/40 bg-slate-950/40 text-slate-500"}`} style={{ left: r.x, top: r.y + hf.top, width: r.w, height: hf.h }}>
              {ok && hf.label}
            </div>
          );
        });
      })}
      {/* in connectors: a coloured tab on the left edge for every connection arriving */}
      {tabs.map((t) => (
        <button key={`in:${t.l.id}`} type="button" aria-label={`Connection from ${nameOf(t.l.from)} to ${nameOf(t.l.to)}${t.l.port === "rec" ? " (record)" : ""}`} className="pointer-events-auto absolute rounded-l-md border-y border-l border-slate-950/60" style={{ left: t.b.x - 8, top: t.b.y - 5 + t.i * 10, width: 9, height: 9, background: t.colour, opacity: t.l.muted ? 0.35 : active.has(t.l.id) ? 1 : 0.5, outline: sel === t.l.id ? "2px solid #f8fafc" : undefined }} onPointerDown={(e) => { e.stopPropagation(); setSel(t.l.id); }} title={`${nameOf(t.l.from)} → ${nameOf(t.l.to)}${t.l.port === "rec" ? " (record)" : ""}`} />
      ))}
      {/* out connectors: drag from here */}
      {Object.entries(rects).map(([id, r]) => {
        const n = node(id);
        if (!n || !OUT_KINDS.includes(n.kind)) return null;
        const c = handleColour(id);
        const used = patch.links.some((l) => l.from === id);
        return (
          <span key={`out:${id}`} className="pointer-events-auto absolute grid cursor-crosshair place-items-center" style={{ left: r.x + r.w - 6, top: r.y + r.h / 2 - 11, width: 22, height: 22, touchAction: "none" }} onPointerDown={startWire(id)} title={`Drag from ${name(n)} to a group, chain, switch or the master`} role="presentation">
            <span className="rounded-full border-2" style={{ width: 12, height: 12, borderColor: c, background: used ? c : "#020617" }} />
          </span>
        );
      })}
      {/* effect chains and switches float over the page */}
      {cards.map((n) => {
        const p = pos[n.id] ?? { x: n.x, y: n.y };
        const outs = patch.links.filter((l) => l.from === n.id);
        return (
          <div key={n.id} data-patch-id={n.id} className={`pointer-events-auto absolute rounded-lg border bg-slate-900 text-xs shadow-xl shadow-black/50 ${n.muted ? "border-slate-700 opacity-60" : "border-slate-500"}`} style={{ left: p.x, top: p.y, width: CARD_W }}>
            <div className="flex cursor-grab touch-none items-center gap-1 rounded-t-lg border-b border-slate-800 bg-slate-800/70 px-1.5 py-1 active:cursor-grabbing" onPointerDown={startMove(n)}>
              <Icon name={n.kind === "switch" ? "split" : "sliders-horizontal"} size={13} className="shrink-0 text-slate-400" />
              <span className="min-w-0 flex-1 truncate font-medium text-slate-100" title={name(n)}>{name(n)}</span>
              <button type="button" className="text-slate-400 hover:text-slate-100" aria-pressed={n.muted} onClick={() => engine.do({ type: "patch.mute", what: "node", id: n.id, muted: !n.muted })} title={n.muted ? "Unmute" : "Mute"} aria-label={`${n.muted ? "Unmute" : "Mute"} ${name(n)}`}><Icon name={n.muted ? "volume-x" : "volume-2"} size={13} /></button>
              <button type="button" className="text-slate-500 hover:text-rose-300" onClick={() => engine.do({ type: "patch.removeNode", id: n.id })} title="Remove" aria-label={`Remove ${name(n)}`}><Icon name="x" size={13} /></button>
            </div>
            <div className="flex flex-col gap-0.5 px-1.5 py-1.5 pr-3">
              {n.kind === "fx" && (
                <button type="button" className="flex items-center gap-1 rounded border border-slate-700 px-1 py-0.5 text-left text-[11px] text-slate-300 hover:border-slate-500" onClick={() => setFxId(n.id)} title="Edit the effects" aria-label={`Edit ${name(n)}`}>
                  <Icon name="sliders-horizontal" size={11} />
                  <span className="truncate">{n.effects?.length ? n.effects.map((e) => e.kind).join(" + ") : "empty: add effects"}</span>
                </button>
              )}
              {n.kind === "switch" && (
                <div className="flex flex-col gap-0.5" role="radiogroup" aria-label="Open output">
                  {outs.length === 0 && <span className="text-[10px] text-slate-500">Drag from the dot on the right to a group</span>}
                  {outs.map((l: PatchLink, i) => (
                    <button key={l.id} type="button" role="radio" aria-checked={(n.selected ?? 0) === i} className={`flex items-center gap-1 rounded px-1 py-0.5 text-left text-[11px] ${(n.selected ?? 0) === i ? "bg-emerald-500/20 text-emerald-100" : "text-slate-400 hover:bg-slate-800"}`} onClick={() => engine.do({ type: "patch.switch", id: n.id, selected: i })} title={`Open the output to ${nameOf(l.to)}`}>
                      <span className={`h-2 w-2 shrink-0 rounded-full border ${(n.selected ?? 0) === i ? "border-emerald-300 bg-emerald-300" : "border-slate-500"}`} />
                      <span className="truncate">{nameOf(l.to)}{l.port === "rec" ? " (rec)" : ""}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
      {selLink && selDrawn && (
        <div className="pointer-events-auto absolute z-10 flex items-center gap-1.5 rounded-lg border border-slate-600 bg-slate-950 px-2 py-1 text-xs text-slate-200 shadow-xl" style={{ left: Math.max(4, selDrawn.b.x - 260), top: Math.max(4, selDrawn.b.y - 36) }}>
          <span className="max-w-[24ch] truncate">{nameOf(selLink.from)} → {nameOf(selLink.to)}{selLink.port === "rec" ? " (record)" : ""}</span>
          <button type="button" className="grid h-6 w-6 place-items-center rounded border border-slate-700 hover:border-slate-500" aria-pressed={selLink.muted} onClick={() => engine.do({ type: "patch.mute", what: "link", id: selLink.id, muted: !selLink.muted })} title={selLink.muted ? "Unmute the connection" : "Mute the connection"} aria-label={selLink.muted ? "Unmute the connection" : "Mute the connection"}><Icon name={selLink.muted ? "volume-x" : "volume-2"} size={13} /></button>
          <button type="button" className="grid h-6 w-6 place-items-center rounded border border-slate-700 hover:border-rose-400" onClick={() => { engine.do({ type: "patch.unlink", id: selLink.id }); setSel(null); }} title="Remove the connection" aria-label="Remove the connection"><Icon name="trash" size={13} /></button>
          <button type="button" className="grid h-6 w-6 place-items-center rounded border border-slate-700 hover:border-slate-500" onClick={() => setSel(null)} title="Close" aria-label="Close"><Icon name="x" size={13} /></button>
        </div>
      )}
      {msg && <p role="alert" className="pointer-events-auto fixed bottom-3 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-amber-400/50 bg-slate-950 px-3 py-1.5 text-xs text-amber-200 shadow-xl">{msg}</p>}
      {fxNode && (
        <div className="pointer-events-auto">
          <EffectsModal
            title={<span className="flex items-center gap-2"><Icon name="sliders-horizontal" size={16} />{name(fxNode)}: effects</span>}
            effects={fxNode.effects ?? []}
            onAdd={(k) => engine.do({ type: "fx.add", target: { element: fxNode.id }, fx: { kind: k } })}
            onRemove={(id) => engine.do({ type: "fx.remove", target: { element: fxNode.id }, id })}
            onParam={(id, key, value) => engine.do({ type: "fx.param", target: { element: fxNode.id }, id, key, value })}
            onBypass={(id) => engine.do({ type: "fx.bypass", target: { element: fxNode.id }, id, bypass: !fxNode.effects?.find((e) => e.id === id)?.bypass })}
            onClose={() => setFxId(null)}
          />
        </div>
      )}
    </div>
  );
}
