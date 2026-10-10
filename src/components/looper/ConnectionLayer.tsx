"use client";

import { useEffect, useId, useMemo, useRef, useState, type PointerEvent as RPointerEvent, type RefObject } from "react";
import Icon from "@/components/Icon";
import { patchName } from "./PatchNode";
import { whyNot, type PatchKind, type PatchNode, type Port } from "@/lib/looper/patch";
import { destinationPick, destinations, drawnFrom, fanShifts, flowingLinks, linkColour, masterFeeds, outSources, sendColours as sendColoursOf, outward, sidePoint, sidesFor, type Side } from "@/lib/looper/patchView";
import type { LooperEngine, LooperSnapshot } from "@/lib/looper/engine";

interface Rect { x: number; y: number; w: number; h: number }
interface Pt { x: number; y: number }

const MUTED = "#64748b";
/** The Looping widget always plays into the master: that route is drawn in this colour and cannot be changed. */
const FIXED = "#cbd5e1";
/** Sequencers and loops have no connector: sitting inside a group is their connection. */
const OUT_KINDS: PatchKind[] = ["input", "piano", "synth", "fx", "switch", "tuner"];
const TARGET_KINDS: PatchKind[] = ["fx", "switch", "tuner", "group", "master"];

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
 * only what carries sound is drawn. An input has one output for all its buses: one wire per block it reaches, striped in the colours
 * of the groups it reaches there, with an arrow into the target. With `mode: "lines"` the connections are drawn as wires as well.
 * Drag from a connector on the right of a block onto a group (top half: what its loops record, bottom half: what you hear through
 * it), the master, a chain or a switch; every bus of an input gets the link. Click the connector (or an arrow) for the checkbox list
 * of where it sends, to switch each place on or off or remove it. It only calls engine actions, so everything is undoable.
 */
export default function ConnectionLayer({ engine, snap, wrapper }: { engine: LooperEngine; snap: LooperSnapshot; wrapper: RefObject<HTMLElement | null> }) {
  const patch = snap.patch;
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const [rects, setRects] = useState<Record<string, Rect>>({});
  const [drag, setDrag] = useState<{ from: string; at: Pt } | null>(null);
  /** the element whose list of destinations is open */
  const [menu, setMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [msg, setMsg] = useState<string | null>(null);

  // measure the elements every other frame: layouts move (widgets are dragged, windows resize, the page scrolls)
  useEffect(() => {
    let raf = 0;
    let last = "";
    const tick = () => {
      raf = requestAnimationFrame(tick);
      // measured every frame, so the wires follow a scroll or zoom without lag
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

  // the list closes on a click anywhere else or Escape
  useEffect(() => {
    if (!menu) return;
    const down = (e: PointerEvent) => {
      const t = e.target as Element;
      // a connector toggles the list itself when the click ends
      if (!menuRef.current?.contains(t) && !t.closest?.("[data-out]")) setMenu(null);
    };
    const key = (e: KeyboardEvent) => e.key === "Escape" && setMenu(null);
    window.addEventListener("pointerdown", down);
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("keydown", key);
    };
  }, [menu]);

  const groupColours = useMemo(() => Object.fromEntries(snap.groups.map((g) => [`group:${g.id}`, g.colour])), [snap.groups]);
  const node = (id: string) => patch.nodes.find((n) => n.id === id);
  const name = (n: PatchNode): string => patchName(snap, n);
  const nameOf = (id: string) => {
    const n = node(id);
    return n ? name(n) : id;
  };
  const active = useMemo(() => new Set(snap.patchActive), [snap.patchActive]);
  // draw only where sound really goes: an open link into a bus that a switch has closed leads nowhere
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
  // in the order their other ends lie (left to right, top to bottom), so the wires fan out without crossing
  const centre = (id: string, s: Side) => {
    const r = rects[id];
    return s === "top" || s === "bottom" ? r.x + r.w / 2 : r.y + r.h / 2;
  };
  const fan = (ws: { key: string; from: string; to: string; port: string }[]) => {
    const ends = new Map<string, { wire: string; end: "a" | "b"; along: number }[]>();
    const add = (side: string, wire: string, end: "a" | "b", along: number) => ends.set(side, [...(ends.get(side) ?? []), { wire, end, along }]);
    ws.forEach((w) => {
      if (!rects[w.from] || !rects[w.to]) return;
      const s = sidesFor(rects[w.from], rects[w.to]);
      add(`${w.from}|${s.from}`, w.key, "a", centre(w.to, s.from));
      add(`${w.to}|${w.port}|${s.to}`, w.key, "b", centre(w.from, s.to));
    });
    const shift = new Map<string, number>();
    ends.forEach((list) => fanShifts(list.map((e) => e.along)).forEach((d, i) => shift.set(`${list[i].wire}|${list[i].end}`, d)));
    return (key: string, end: "a" | "b") => shift.get(`${key}|${end}`) ?? 0;
  };
  // every group lives in the Looping widget: a connection into a group ends at that widget (its colour says which group), and the
  // groups' own fixed route into the master is drawn once, from the Looping widget
  const looping = rects.looping;
  interface Wire { key: string; from: string; to: string; port: Port | "fixed"; frac: number; colours: string[]; faint: boolean; label: string }
  const build = (w: Wire, shift: (key: string, end: "a" | "b") => number) => {
    const ra = rects[w.from];
    const rb = rects[w.to];
    if (!ra || !rb) return [];
    const fixed = w.port === "fixed";
    const s = sidesFor(ra, rb);
    const a = sidePoint(ra, s.from, 0.5, shift(w.key, "a"));
    const b = sidePoint(rb, s.to, w.frac, shift(w.key, "b"));
    // the arrow sits on the edge of the target and points into it; the wire ends at its base
    const n = outward(s.to);
    const be = { x: b.x + n.x * ARROW, y: b.y + n.y * ARROW };
    const o = outward(s.from);
    const k = Math.max(40, Math.hypot(be.x - a.x, be.y - a.y) / 2.5);
    const path = `M${a.x},${a.y} C${a.x + o.x * k},${a.y + o.y * k} ${be.x + n.x * k},${be.y + n.y * k} ${be.x},${be.y}`;
    const px = -n.y * 5, py = n.x * 5;
    const arrow = `${b.x},${b.y} ${be.x + px},${be.y + py} ${be.x - px},${be.y - py}`;
    return [{ ...w, a, b, path, arrow, fixed }];
  };
  // only links that carry sound are drawn, gathered into one wire per pair of blocks: all the buses of an input leave from the input
  const wires = new Map<string, Wire>();
  patch.links.forEach((l) => {
    if (node(l.from)?.kind === "group" || !flowing.has(l.id)) return;
    // the link from an input to a bus inside it is shown by the switch rows of its block, not as a wire
    if (node(l.to)?.owner === l.from) return;
    // the master is not wired to: a block that plays to it carries a small master-bus icon tag instead
    if (node(l.to)?.kind === "master") return;
    const from = drawnFrom(patch, l);
    const toGroup = node(l.to)?.kind === "group";
    const port: Port = l.port ?? "bus";
    const to = toGroup && looping ? "looping" : l.to;
    const key = `${from}>${to}${toGroup && !looping ? `|${port}` : ""}`;
    const colour = linkColour(patch, l, groupColours);
    const w = wires.get(key);
    if (w) {
      if (!w.colours.includes(colour)) w.colours.push(colour);
      w.faint &&= l.id.startsWith("rec:");
    } else {
      wires.set(key, { key, from, to, port: toGroup && looping ? "bus" : port, frac: toGroup && !looping ? (port === "rec" ? 0.28 : 0.72) : 0.5, colours: [colour], faint: l.id.startsWith("rec:"), label: `${nameOf(from)} to ${to === "looping" ? "Looping" : nameOf(l.to)}` });
    }
  });
  const all: Wire[] = [
    ...wires.values(),
    ...(looping && rects.master ? [{ key: "fixed:master", from: "looping", to: "master", port: "fixed" as const, frac: 0.5, colours: [FIXED], faint: false, label: "Looping always plays to the master bus (fixed)" }] : []),
  ];
  const shift = fan(all);
  const drawn = all.flatMap((w) => build(w, shift));

  /** Link every place the element sends from (each bus of an input) to a target. */
  const link = (from: string, to: string, port: Port) => {
    const srcs = outSources(patch, from);
    const ok = srcs.filter((s) => !whyNot(patch, s, to, port));
    if (!ok.length) return setMsg(whyNot(patch, srcs[0], to, port));
    const actions = ok.map((s) => ({ type: "patch.link" as const, link: { id: newId("l"), from: s, to, ...(port === "rec" ? { port } : {}) } }));
    engine.do(actions.length === 1 ? actions[0] : { type: "batch", label: "Connect", actions });
  };
  // the destination list is for sound makers and chains; a switch chooses its outputs on its own card
  const hasMenu = (id: string) => !!node(id) && node(id)?.kind !== "switch";
  const toggleDest = (id: string, key: string, on: boolean) => {
    const changes = destinationPick(patch, id, key);
    if (changes.length) engine.do({ type: "batch", label: on ? "Send on" : "Send off", actions: changes.map((c) => ({ type: "patch.mute", what: "link", id: c.id, muted: c.muted })) });
  };

  /** The element and port under a point, for dropping a connection. Cards float above the page, so they win. */
  const targetAt = (p: Pt): { id: string; port: Port } | null => {
    const hits = Object.entries(rects).filter(([id, r]) => TARGET_KINDS.includes(node(id)?.kind as PatchKind) && p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h);
    const pick = hits.find(([id]) => ["fx", "switch", "tuner"].includes(node(id)?.kind ?? "")) ?? hits[0];
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
    const start = toPt(e);
    let moved = false;
    const move = (ev: PointerEvent) => {
      const at = toPt(ev);
      moved ||= Math.hypot(at.x - start.x, at.y - start.y) > 4;
      if (moved) setDrag({ from, at });
    };
    const up = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      setDrag(null);
      // a click without a drag opens the list of where it sends
      if (!moved) return setMenu((m) => (m === from || !hasMenu(from) ? null : from));
      const t = targetAt(toPt(ev));
      if (t) link(from, t.id, t.port);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  /** The colours of the places an element sends sound to right now (none when it sends nowhere). */
  const sendColours = (id: string): string[] => sendColoursOf(patch, id, flowing, groupColours);
  const toMasterNow = useMemo(() => new Set(masterFeeds(patch, flowing)), [patch, flowing]);
  const handleColour = (id: string) => sendColours(id)[0] ?? MUTED;
  /** A fill for several colours side by side: hard stops of a gradient. */
  const stops = (cs: string[], deg: number) => (cs.length < 2 ? cs[0] ?? "#020617" : `linear-gradient(${deg}deg, ${cs.map((c, i) => `${c} ${(i / cs.length) * 100}% ${((i + 1) / cs.length) * 100}%`).join(", ")})`);
  const sel = drag?.from ?? menu;
  const menuRect = menu ? rects[menu] : undefined;
  const menuLeft = menuRect ? Math.max(4, Math.min(menuRect.x + menuRect.w + 14, (wrapper.current?.clientWidth ?? 9999) - 250)) : 0;
  // one wire with several groups is striped: each colour a dash, the dashes taking turns along it
  const STRIPE = 10;

  return (
    <div className="pointer-events-none absolute inset-0 z-20" aria-label="Connections">
      <svg className="absolute inset-0 h-full w-full" aria-hidden={false}>
        {drawn.map((d, i) => {
          const op = d.faint ? 0.55 : 1;
          const n = d.colours.length;
          const grad = `${uid}w${i}`;
          const hot = sel === d.from;
          const pick = d.fixed ? undefined : (e: RPointerEvent) => { e.stopPropagation(); setMenu(hasMenu(d.from) ? d.from : null); };
          return (
            <g key={d.key}>
              {n > 1 && (
                <defs>
                  <linearGradient id={grad}>
                    {d.colours.flatMap((c, k) => [<stop key={`${k}a`} offset={k / n} stopColor={c} />, <stop key={`${k}b`} offset={(k + 1) / n} stopColor={c} />])}
                  </linearGradient>
                </defs>
              )}
              {/* a wire is not clickable (it would block the controls under it); open its list by its arrow or connector */}
              {d.colours.map((c, k) => (
                <path key={c} d={d.path} fill="none" pointerEvents="none" stroke={c} strokeWidth={hot ? 3.5 : d.faint ? 1.5 : 2.75} strokeDasharray={n > 1 ? `${STRIPE} ${(n - 1) * STRIPE}` : undefined} strokeDashoffset={-k * STRIPE} opacity={d.faint ? 0.5 : 0.95} />
              ))}
              <circle cx={d.a.x} cy={d.a.y} r={3.5} fill={n > 1 ? `url(#${grad})` : d.colours[0]} opacity={op} pointerEvents="none" />
              <polygon points={d.arrow} fill={n > 1 ? `url(#${grad})` : d.colours[0]} opacity={op} stroke={hot ? "#f8fafc" : "#020617"} strokeWidth={hot ? 1.5 : 0.75} role={d.fixed ? "img" : "button"} aria-label={d.label} style={{ pointerEvents: d.fixed ? "none" : "auto", cursor: "pointer" }} onPointerDown={pick}>
                <title>{d.label}</title>
              </polygon>
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
          const ok = outSources(patch, drag.from).some((s) => !whyNot(patch, s, id, hf.port));
          return (
            <div key={`${id}:${hf.port}`} className={`absolute grid place-items-center rounded-lg border-2 text-[11px] font-medium ${ok ? "border-emerald-400/80 bg-emerald-400/15 text-emerald-100" : "border-slate-600/40 bg-slate-950/40 text-slate-500"}`} style={{ left: r.x, top: r.y + hf.top, width: r.w, height: hf.h }}>
              {ok && hf.label}
            </div>
          );
        });
      })}
      {/* out connectors: drag from here to add a place, click for the list. An input with buses has one for all of them. */}
      {Object.entries(rects).map(([id, r]) => {
        const n = node(id);
        if (!n || !OUT_KINDS.includes(n.kind) || n.owner) return null;
        const cs = sendColours(id);
        const ring = cs.length ? stops(cs, 90) : MUTED;
        return (
          <span key={`out:${id}`} className="pointer-events-auto absolute grid cursor-crosshair place-items-center" style={{ left: r.x + r.w - 7, top: r.y + r.h / 2 - 12, width: 24, height: 24, touchAction: "none" }} onPointerDown={startWire(id)} data-out={id} title={hasMenu(id) ? `${name(n)}: click to choose where it sends, drag to add a place` : `Drag from ${name(n)} to a group, chain, switch or the master`} role="button" aria-label={`Outputs of ${name(n)}`} aria-haspopup={hasMenu(id) ? "true" : undefined} aria-expanded={hasMenu(id) ? menu === id : undefined}>
            {/* the ring shows every colour it sends in; hollow when it sends nowhere */}
            <span className="grid place-items-center rounded-full" style={{ width: 14, height: 14, background: ring, outline: menu === id ? "2px solid #f8fafc" : undefined }}>
              {!cs.length && <span className="rounded-full" style={{ width: 8, height: 8, background: "#020617" }} />}
            </span>
          </span>
        );
      })}
      {/* instead of a wire across the page: a small master-bus icon by the connector of every block that plays to the master */}
      {Object.entries(rects).map(([id, r]) => (toMasterNow.has(id) ? (
        <span key={`master:${id}`} className="absolute flex items-center gap-0.5 text-[10px] text-slate-400" style={{ left: r.x + r.w + 2, top: r.y + r.h / 2 + 13 }} title={`${nameOf(id)} plays to the master bus`}>
          <span aria-hidden>↳</span>
          <span className="grid place-items-center rounded border border-slate-600 bg-slate-950 p-0.5 text-slate-200" role="img" aria-label="Master bus"><Icon name="audio-lines" size={12} /></span>
        </span>
      ) : null))}
      {menu && menuRect && (
        <div ref={menuRef} role="group" aria-label={`Where ${nameOf(menu)} sends`} className="pointer-events-auto absolute z-30 flex w-60 flex-col gap-0.5 rounded-lg border border-slate-600 bg-slate-950 p-1.5 text-xs text-slate-200 shadow-xl" style={{ left: menuLeft, top: Math.max(4, menuRect.y + menuRect.h / 2 - 16) }}>
          <div className="flex items-center gap-1 px-1 pb-1 text-[10px] uppercase tracking-wide text-slate-500">
            <span className="min-w-0 flex-1 truncate">{nameOf(menu)} sends to</span>
            <button type="button" className="grid h-5 w-5 place-items-center rounded text-slate-400 hover:text-slate-100" onClick={() => setMenu(null)} title="Close" aria-label="Close"><Icon name="x" size={12} /></button>
          </div>
          {destinations(patch, menu).length === 0 && <span className="px-1 py-0.5 text-[11px] text-slate-500">Nowhere yet: drag from the dot</span>}
          {destinations(patch, menu).map((d) => {
            const label = `${nameOf(d.to)}${d.port === "rec" ? " (record)" : ""}`;
            return (
              <div key={d.key} className={`flex items-center gap-1 rounded ${d.on ? "bg-emerald-500/15" : "hover:bg-slate-800"}`}>
                <button type="button" role={node(menu)?.destOne ? "radio" : "checkbox"} aria-checked={d.on} className="flex min-w-0 flex-1 items-center gap-1.5 px-1 py-1 text-left" onClick={() => toggleDest(menu, d.key, !d.on)}>
                  <span className={`grid h-3 w-3 shrink-0 place-items-center ${node(menu)?.destOne ? "rounded-full" : "rounded-sm"} border ${d.on ? "border-emerald-300 bg-emerald-300 text-slate-950" : "border-slate-500"}`}>{d.on && <Icon name="check" size={9} />}</span>
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: linkColour(patch, d.links[0], groupColours) }} />
                  <span className={`truncate ${d.on ? "text-slate-100" : "text-slate-400"}`}>{label}</span>
                </button>
                <button type="button" className="grid h-5 w-5 shrink-0 place-items-center rounded text-slate-500 hover:text-rose-300" onClick={() => engine.do({ type: "batch", label: "Remove a connection", actions: d.links.map((l) => ({ type: "patch.unlink", id: l.id })) })} title="Remove" aria-label={`Stop sending to ${label}`}><Icon name="trash" size={11} /></button>
              </div>
            );
          })}
        </div>
      )}
      {msg && <p role="alert" className="pointer-events-auto fixed bottom-3 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-amber-400/50 bg-slate-950 px-3 py-1.5 text-xs text-amber-200 shadow-xl">{msg}</p>}
    </div>
  );
}
