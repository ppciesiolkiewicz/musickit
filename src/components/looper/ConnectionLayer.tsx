"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent, type RefObject } from "react";
import Icon from "@/components/Icon";
import { patchName } from "./PatchNode";
import { whyNot, type PatchKind, type PatchLink, type PatchNode, type Port } from "@/lib/looper/patch";
import { flowingLinks, linkColour, outward, sidePoint, sidesFor, spread } from "@/lib/looper/patchView";
import type { LooperEngine, LooperSnapshot } from "@/lib/looper/engine";

interface Rect { x: number; y: number; w: number; h: number }
interface Pt { x: number; y: number }

const MUTED = "#64748b";
/** The Looping widget always plays into the master: that route is drawn in this colour and cannot be changed. */
const FIXED = "#cbd5e1";
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
 * Draws the patch over the page. Every sound maker, group and the master that carries a `data-patch-id` gets connectors:
 * each connection leaves one block and arrives at another on whichever sides face each other, with an arrow into the target, in the colour of the group it reaches. With `mode: "lines"` the connections
 * are drawn as wires as well. Drag from a connector on the right of a strip or card onto a group (top half: what its loops
 * record, bottom half: what you hear through it), the master, a chain or a switch. Click a connector or wire to mute or remove it.
 * It only calls engine actions, so everything is undoable.
 */
export default function ConnectionLayer({ engine, snap, mode, wrapper }: { engine: LooperEngine; snap: LooperSnapshot; mode: "colors" | "lines"; wrapper: RefObject<HTMLElement | null> }) {
  const patch = snap.patch;
  const [rects, setRects] = useState<Record<string, Rect>>({});
  const [drag, setDrag] = useState<{ from: string; at: Pt } | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  // measure the elements every other frame: layouts move (widgets are dragged, windows resize, the page scrolls)
  useEffect(() => {
    let raf = 0;
    let n = 0;
    let last = "";
    const tick = () => {
      raf = requestAnimationFrame(tick);
      // the wires follow a scroll or zoom without lag in the wires view; the quieter views measure every other frame
      if (mode !== "lines" && n++ % 2) return;
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
  }, [wrapper, mode]);

  useEffect(() => {
    if (!msg) return;
    const t = window.setTimeout(() => setMsg(null), 3500);
    return () => window.clearTimeout(t);
  }, [msg]);

  const groupColours = useMemo(() => Object.fromEntries(snap.groups.map((g) => [`group:${g.id}`, g.colour])), [snap.groups]);
  const node = (id: string) => patch.nodes.find((n) => n.id === id);
  const name = (n: PatchNode): string => patchName(snap, n);
  const nameOf = (id: string) => {
    const n = node(id);
    return n ? name(n) : id;
  };
  const active = useMemo(() => new Set(snap.patchActive), [snap.patchActive]);
  // bold only where sound really goes: an open link into a bus that a switch has closed leads nowhere
  const flowing = useMemo(() => flowingLinks(patch, active), [patch, active]);

  const outPt = (id: string): Pt | null => {
    const r = rects[id];
    return r ? { x: r.x + r.w, y: r.y + r.h / 2 } : null;
  };
  const ARROW = 9;
  const wireCurve = (a: Pt, b: Pt) => {
    const dx = Math.max(40, Math.abs(b.x - a.x) / 2);
    return `M${a.x},${a.y} C${a.x + dx},${a.y} ${b.x - dx},${b.y} ${b.x},${b.y}`;
  };

  // each connection leaves and arrives on the sides of the two blocks that face each other; several on one side are spread along it
  const slots = new Map<string, number>();
  const take = (key: string) => {
    const i = slots.get(key) ?? 0;
    slots.set(key, i + 1);
    return i;
  };
  // every group lives in the Looping widget: a connection into a group ends at that widget (its colour says which group), and the
  // groups' own fixed route into the master is drawn once, from the Looping widget
  const looping = rects.looping;
  const build = (l: PatchLink, fromId: string, toId: string, frac: number, fixed: boolean) => {
    const ra = rects[fromId];
    const rb = rects[toId];
    if (!ra || !rb) return [];
    const s = sidesFor(ra, rb);
    const a = sidePoint(ra, s.from, 0.5, spread(take(`${fromId}|${s.from}`)));
    const b = sidePoint(rb, s.to, frac, spread(take(`${toId}|${fixed ? "fixed" : l.port ?? "bus"}|${s.to}`)));
    // the arrow sits on the edge of the target and points into it; the wire ends at its base
    const n = outward(s.to);
    const be = { x: b.x + n.x * ARROW, y: b.y + n.y * ARROW };
    const o = outward(s.from);
    const k = Math.max(40, Math.hypot(be.x - a.x, be.y - a.y) / 2.5);
    const path = `M${a.x},${a.y} C${a.x + o.x * k},${a.y + o.y * k} ${be.x + n.x * k},${be.y + n.y * k} ${be.x},${be.y}`;
    const px = -n.y * 5, py = n.x * 5;
    const arrow = `${b.x},${b.y} ${be.x + px},${be.y + py} ${be.x - px},${be.y - py}`;
    return [{ l, a, b, path, arrow, fixed, colour: fixed ? FIXED : linkColour(patch, l, groupColours) }];
  };
  const drawn = [
    ...patch.links.flatMap((l) => {
      if (node(l.from)?.kind === "group") return [];
      // the link from an input to a bus inside it is shown by the switch rows of its block, not as a wire
      if (node(l.to)?.owner === l.from) return [];
      const toGroup = node(l.to)?.kind === "group";
      if (toGroup && looping) return build(l, l.from, "looping", 0.5, false);
      return build(l, l.from, l.to, toGroup ? ((l.port ?? "bus") === "rec" ? 0.28 : 0.72) : 0.5, false);
    }),
    ...(looping && rects.master ? build({ id: "fixed:master", from: "looping", to: "master", muted: false }, "looping", "master", 0.5, true) : []),
  ];
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

  const handleColour = (id: string) => {
    const l = patch.links.find((x) => x.from === id);
    return l ? linkColour(patch, l, groupColours) : MUTED;
  };


  return (
    <div className="pointer-events-none absolute inset-0 z-20" aria-label="Connections">
      <svg className="absolute inset-0 h-full w-full" aria-hidden={false}>
        {drawn.map((d) => {
          const faint = d.l.id.startsWith("rec:");
          // only what carries sound is drawn bold; closed and muted connections are thin, dashed and quiet
          const on = d.fixed || flowing.has(d.l.id);
          const op = on ? (faint ? 0.55 : 1) : 0.4;
          const label = d.fixed ? "Looping always plays to the master bus (fixed)" : `Connection from ${nameOf(d.l.from)} to ${nameOf(d.l.to)}${d.l.port === "rec" ? " (record)" : ""}${on ? "" : " (off)"}`;
          const pick = d.fixed ? undefined : (e: RPointerEvent) => { e.stopPropagation(); setSel(d.l.id); };
          return (
            <g key={d.l.id}>
              {mode === "lines" && (
                <>
                  {/* a wire is not clickable (it would block the controls under it); select a connection by its arrow */}
                  <path d={d.path} fill="none" pointerEvents="none" stroke={sel === d.l.id ? "#f8fafc" : d.colour} strokeWidth={sel === d.l.id ? 3 : on ? (faint ? 1.5 : 2.75) : 1} strokeDasharray={on ? undefined : "3 4"} opacity={on ? (faint ? 0.5 : 0.95) : 0.28} />
                </>
              )}
              <circle cx={d.a.x} cy={d.a.y} r={on ? 3.5 : 2} fill={d.colour} opacity={op} pointerEvents="none" />
              {on ? (
              <polygon points={d.arrow} fill={d.colour} opacity={op} stroke={sel === d.l.id ? "#f8fafc" : "#020617"} strokeWidth={sel === d.l.id ? 1.5 : 0.75} role={d.fixed ? "img" : "button"} aria-label={label} style={{ pointerEvents: d.fixed ? "none" : "auto", cursor: "pointer" }} onPointerDown={pick}>
                  <title>{label}</title>
                </polygon>
              ) : (
                <circle cx={d.b.x} cy={d.b.y} r={2} fill={d.colour} opacity={0.35} pointerEvents="none" />
              )}
            </g>
          );
        })}
      </svg>
      {drag && (
        <svg className="absolute inset-0 h-full w-full" aria-hidden>
          {outPt(drag.from) && <path d={wireCurve(outPt(drag.from) as Pt, drag.at)} fill="none" stroke={handleColour(drag.from)} strokeWidth={2.5} strokeDasharray="4 4" />}
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
      {/* out connectors: drag from here */}
      {Object.entries(rects).map(([id, r]) => {
        const n = node(id);
        if (!n || !OUT_KINDS.includes(n.kind)) return null;
        // an input with buses of its own sends its sound out through them
        if (patch.nodes.some((m) => m.owner === id)) return null;
        const c = handleColour(id);
        const used = patch.links.some((l) => l.from === id);
        return (
          <span key={`out:${id}`} className="pointer-events-auto absolute grid cursor-crosshair place-items-center" style={{ left: r.x + r.w - 6, top: r.y + r.h / 2 - 11, width: 22, height: 22, touchAction: "none" }} onPointerDown={startWire(id)} title={`Drag from ${name(n)} to a group, chain, switch or the master`} role="presentation">
            <span className="rounded-full border-2" style={{ width: 12, height: 12, borderColor: c, background: used ? c : "#020617" }} />
          </span>
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
    </div>
  );
}
