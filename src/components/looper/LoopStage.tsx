"use client";

import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent as RKeyboardEvent, type PointerEvent as RPointerEvent, type RefObject } from "react";
import Icon from "../Icon";
import EffectsModal from "./EffectsModal";
import EffectWidgets from "./EffectWidgets";
import { setPinSpawn } from "./fxPins";
import InfoTip from "../InfoTip";
import { GROUP_COLOURS, LOOP_R, STAGE_H, STAGE_W, VIEW_W, type ChannelInfo, type GroupInfo, type LooperEngine, type LooperSnapshot } from "@/lib/looper/engine";

const ibtn = "grid h-8 min-w-8 place-items-center rounded-lg border border-slate-700 bg-slate-900 px-1.5 text-xs text-slate-200 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400";
const tbtn = "grid h-6 min-w-6 place-items-center rounded-md border border-slate-700/80 bg-slate-900/80 px-1 text-[10px] text-slate-300 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400";
const RING = 40;
const CIRC = 2 * Math.PI * RING;
const MIN_ZOOM = 0.2;

/** Drag with the pointer: calls onMove with the distance moved in stage units; calls onClick if it never moved. */
function startDrag(e: RPointerEvent, stage: HTMLElement | null, onMove: (dx: number, dy: number) => void, onClick?: () => void) {
  if (!stage || e.button !== 0) return;
  const rect = stage.getBoundingClientRect();
  const sx = e.clientX, sy = e.clientY;
  let moved = false;
  const move = (ev: PointerEvent) => {
    const dx = ev.clientX - sx, dy = ev.clientY - sy;
    if (!moved && Math.hypot(dx, dy) < 4) return;
    moved = true;
    onMove((dx / rect.width) * STAGE_W, (dy / rect.height) * STAGE_H);
  };
  const up = () => {
    window.removeEventListener("pointermove", move);
    if (!moved) onClick?.();
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up, { once: true });
}

const arrowStep = (e: RKeyboardEvent): [number, number] | null => {
  if (!e.altKey) return null;
  const k = e.key;
  const d = e.shiftKey ? 40 : 12;
  return k === "ArrowLeft" ? [-d, 0] : k === "ArrowRight" ? [d, 0] : k === "ArrowUp" ? [0, -d] : k === "ArrowDown" ? [0, d] : null;
};

/** The looping stage: loops are circles with a progress ring; coloured groups are boxes you can move and resize. A loop inside a group plays through that group's bus. */
export default function LoopStage({ engine, snap, openSeqs, onToggleSeq, fill = false }: { engine: LooperEngine; snap: LooperSnapshot; getPosition?: () => number | null; openSeqs: string[]; onToggleSeq: (id: string) => void; fill?: boolean }) {
  const stage = useRef<HTMLDivElement>(null);
  const [fxFor, setFxFor] = useState<string | null>(null);
  const ready = snap.status === "ready";
  const busy = snap.channels.some((c) => c.state === "recording" || c.state === "armed");
  const firstTake = snap.loopSeconds === null;
  const baseBars = (() => {
    if (snap.loopSeconds === null) return null;
    const b = (snap.loopSeconds * snap.metronome.bpm) / 60 / snap.metronome.beatsPerBar;
    return Math.round(b) >= 1 && Math.abs(b - Math.round(b)) < 0.02 ? Math.round(b) : null;
  })();
  const fxGroup = snap.groups.find((g) => g.id === fxFor) ?? null;

  // The stage is drawn at its natural size (STAGE_W by STAGE_H) and scaled, so loops, groups and text all scale together.
  // It fits the page width by default; zoom in and the area scrolls.
  const frame = useRef<HTMLDivElement>(null);
  const canvasW = STAGE_W;
  const canvasH = STAGE_H;
  const [width, setWidth] = useState(STAGE_W);
  useLayoutEffect(() => {
    const el = frame.current;
    if (!el) return;
    const measure = () => setWidth(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  // at 100% the part VIEW_W wide fills the widget; the rest of the stage is room to grow into (scroll or drag to reach it)
  const fit = Math.max(MIN_ZOOM, Math.min(4, (width - 2) / VIEW_W));
  const scale = fit;
  // new effect widgets appear in the part of the stage you are looking at
  useEffect(() => {
    setPinSpawn(() => {
      const el = frame.current;
      return el ? { x: el.scrollLeft / scale, y: el.scrollTop / scale } : { x: 0, y: 0 };
    });
    return () => setPinSpawn(null);
  }, [scale]);

  return (
    <div className={`flex flex-col gap-1 ${fill ? "min-h-0 flex-1" : ""}`}>
      <div className="flex items-center justify-end gap-1">
        <InfoTip label="Stage help">
          <p><b>Size:</b> the stage fits its widget. Make the widget bigger or smaller by its corner, or zoom the whole canvas.</p>
          <p><b>Move around:</b> scroll, or drag empty space on the stage.</p>
          <p><b>Effect widgets:</b> open the effects of a bus or an input and press the dashboard button on an effect. Its controls appear to the right of the stage; drag the title to place it.</p>
        </InfoTip>
      </div>
      <div
        ref={frame}
        className={`overflow-auto rounded-xl border border-slate-800 bg-slate-950/60 ${fill ? "min-h-0 flex-1" : "max-h-[75vh]"}`}
        onPointerDown={(e) => {
          // drag empty space to pan
          const el = frame.current;
          if (!el || e.button !== 0 || e.target !== e.currentTarget && !(e.target as HTMLElement).dataset.pan) return;
          const sx = e.clientX, sy = e.clientY, l = el.scrollLeft, t = el.scrollTop;
          const move = (ev: PointerEvent) => {
            el.scrollLeft = l - (ev.clientX - sx);
            el.scrollTop = t - (ev.clientY - sy);
          };
          window.addEventListener("pointermove", move);
          window.addEventListener("pointerup", () => window.removeEventListener("pointermove", move), { once: true });
        }}
      >
        <div data-pan="1" style={{ width: canvasW * scale, height: canvasH * scale }}>
          <div data-pan="1" className="relative select-none" style={{ width: canvasW, height: canvasH, transform: `scale(${scale})`, transformOrigin: "top left" }}>
            <EffectWidgets engine={engine} snap={snap} drag={(e, onMove) => startDrag(e, stage.current, onMove)} />
      <div ref={stage} data-pan="1" className="relative select-none" style={{ width: STAGE_W, height: STAGE_H }}>
        {snap.groups.map((g) => (
          <GroupBox key={g.id} engine={engine} g={g} stage={stage} count={snap.channels.filter((c) => c.groupId === g.id && c.state !== "empty").length + snap.sequencers.filter((q) => q.groupId === g.id).length} running={snap.channels.some((c) => c.groupId === g.id && c.state !== "empty" && c.active && snap.playing) || snap.sequencers.some((q) => q.groupId === g.id && q.playing)} onFx={() => setFxFor(g.id)} />
        ))}
        {snap.channels.map((c) => {
          const g = snap.groups.find((x) => x.id === c.groupId);
          return <LoopCircle key={c.id} engine={engine} ch={c} colour={g?.colour ?? "#94a3b8"} stage={stage} ready={ready} busy={busy} firstTake={firstTake} baseBars={baseBars} />;
        })}
        {snap.sequencers.map((q) => {
          const g = snap.groups.find((x) => x.id === q.groupId);
          return <SeqCircle key={q.id} engine={engine} q={q} colour={g?.colour ?? "#94a3b8"} stage={stage} open={openSeqs.includes(q.id)} onOpen={() => onToggleSeq(q.id)} />;
        })}
      </div>
          </div>
        </div>
      </div>
      {fxGroup && <GroupEffects engine={engine} g={fxGroup} onClose={() => setFxFor(null)} />}
    </div>
  );
}

function LoopCircle({ engine, ch, colour, stage, ready, busy, firstTake, baseBars }: { engine: LooperEngine; ch: ChannelInfo; colour: string; stage: RefObject<HTMLDivElement | null>; ready: boolean; busy: boolean; firstTake: boolean; baseBars: number | null }) {
  const arc = useRef<SVGCircleElement>(null);
  const pulse = useRef<SVGCircleElement>(null);
  const count = useRef<HTMLSpanElement>(null);
  const iconBox = useRef<HTMLSpanElement>(null);
  const recording = ch.state === "recording" || ch.state === "armed";
  const isFreeTake = recording && ch.plan === 0 && (firstTake || ch.state === "recording");
  const running = ch.state === "recording" && ch.plan > 0; // a planned take runs to its end on its own
  const label = isFreeTake ? "Stop the take" : running ? "Recording to the loop end" : recording ? "Cancel" : ch.state === "empty" ? "Record" : "Re-record";
  const act = () => (running ? undefined : recording ? engine.do({ type: "record.stop" }) : engine.do({ type: "loop.record", id: ch.id }));
  const live = ch.state === "recording" ? "#fb7185" : ch.state === "armed" ? "#fbbf24" : colour;

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      if (pulse.current) {
        // recording: a slow pulse that swells and shivers with the signal arriving on this loop
        const lv = engine.getCaptureLevel(ch.id);
        const t = performance.now() / 1000;
        const sc = 1 + 0.06 * Math.sin(t * 4) + lv * 0.28 + lv * 0.05 * Math.sin(t * 38);
        pulse.current.style.transform = `scale(${sc})`;
        pulse.current.style.opacity = String(0.35 + lv * 0.6);
      }
      const cd = engine.getCaptureCountdown(ch.id);
      if (count.current && iconBox.current) {
        count.current.textContent = cd ? String(cd.beats) : "";
        count.current.style.color = cd?.ending ? "#fb7185" : "#fbbf24";
        iconBox.current.style.opacity = cd ? "0.25" : "1";
      }
      const p = ch.state === "recording" ? null : engine.getChannelPosition(ch.id);
      if (arc.current) arc.current.style.strokeDashoffset = String(CIRC * (1 - (ch.state === "empty" || isFreeTake || p === null ? 0 : p)));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [engine, ch.id, ch.state, isFreeTake]);

  const onPointerDown = (e: RPointerEvent) => {
    const base = { x: ch.x, y: ch.y };
    startDrag(e, stage.current, (dx, dy) => engine.do({ type: "loop.move", id: ch.id, x: base.x + dx, y: base.y + dy }), () => ready && !(busy && !recording) && act());
  };
  const onKeyDown = (e: RKeyboardEvent) => {
    const s = arrowStep(e);
    if (s) {
      e.preventDefault();
      engine.do({ type: "loop.move", id: ch.id, x: ch.x + s[0], y: ch.y + s[1] });
    }
  };
  const size = LOOP_R * 2 - 8;
  return (
    <div className="absolute z-10 flex w-24 flex-col items-center gap-0.5" style={{ left: `${(ch.x / STAGE_W) * 100}%`, top: `${(ch.y / STAGE_H) * 100}%`, transform: `translate(-50%, -${LOOP_R - 4}px)` }}>
      <button type="button" onPointerDown={onPointerDown} onKeyDown={onKeyDown} onClick={(e) => e.detail === 0 && ready && !(busy && !recording) && act()} aria-label={`${label}: ${ch.name}. Drag to move; Alt and arrow keys move it.`} title={`${label} (drag to move)`} className="relative grid cursor-grab place-items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-sky-400 active:cursor-grabbing" style={{ width: size, height: size, touchAction: "none" }}>
        <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden>
          <circle cx="50" cy="50" r={RING} fill={ch.state === "empty" ? "none" : `${live}22`} stroke="#1e293b" strokeWidth="8" strokeDasharray={ch.state === "armed" ? "4 5" : undefined} />
          {ch.state === "recording" ? (
            <circle ref={pulse} cx="50" cy="50" r={RING} fill={`${live}55`} stroke={live} strokeWidth="6" style={{ transformBox: "fill-box", transformOrigin: "center" }} />
          ) : (
            <circle ref={arc} cx="50" cy="50" r={RING} fill="none" stroke={live} strokeWidth="8" strokeLinecap="round" strokeDasharray={CIRC} strokeDashoffset={CIRC} transform="rotate(-90 50 50)" opacity={ch.muted || !ch.active ? 0.3 : 1} />
          )}
        </svg>
        <span ref={count} className="pointer-events-none absolute text-lg font-semibold tabular-nums" aria-hidden />
        <span ref={iconBox} className="absolute grid place-items-center" style={{ color: live }}>
          <Icon name={isFreeTake ? "square" : running ? "circle" : recording ? "x" : ch.state === "empty" ? "circle" : "repeat"} size={22} fill={isFreeTake || running || ch.state === "empty"} />
        </span>
      </button>
      <LengthBadge engine={engine} ch={ch} firstTake={firstTake} baseBars={baseBars} />
      <input value={ch.name} onChange={(e) => engine.do({ type: "loop.rename", id: ch.id, name: e.target.value })} aria-label={`Name of ${ch.name}`} className="w-full truncate rounded border border-transparent bg-transparent px-1 text-center text-[11px] font-medium text-slate-200 hover:border-slate-700 focus:border-slate-500 focus:outline-none" />
      <div className="flex items-center gap-0.5">
        <button type="button" className={`${tbtn} ${ch.muted ? "!border-amber-400 !text-amber-200" : ""}`} aria-pressed={ch.muted} disabled={ch.state === "empty"} onClick={() => engine.do({ type: "loop.mute", id: ch.id, muted: !ch.muted })} title="Mute" aria-label={`Mute ${ch.name}`}>M</button>
        <button type="button" className={`${tbtn} ${ch.solo ? "!border-sky-400 !text-sky-200" : ""}`} aria-pressed={ch.solo} disabled={ch.state === "empty"} onClick={() => engine.do({ type: "loop.solo", id: ch.id, solo: !ch.solo })} title="Solo" aria-label={`Solo ${ch.name}`}>S</button>
        <button type="button" className={`${tbtn} ${ch.active && ch.state !== "empty" ? "" : ""}`} disabled={ch.state === "empty"} onClick={() => engine.do({ type: "loop.active", id: ch.id, on: !ch.active })} title={ch.active ? "Stop on the next beat" : "Start on the next beat"} aria-label={ch.active ? `Stop ${ch.name}` : `Start ${ch.name}`} aria-pressed={ch.active}><Icon name={ch.active ? "square" : "play"} size={11} fill /></button>
        <button type="button" className={tbtn} disabled={ch.state === "empty"} onClick={() => engine.do({ type: "loop.clear", id: ch.id })} title="Clear this loop" aria-label={`Clear ${ch.name}`}><Icon name="trash" size={12} /></button>
      </div>
      <input type="range" min={0} max={1} step={0.01} value={ch.volume} onChange={(e) => engine.do({ type: "loop.volume", id: ch.id, value: Number(e.target.value) })} className="h-3 w-16 accent-sky-400" aria-label={`Volume of ${ch.name}`} title={`Volume ${Math.round(ch.volume * 100)}%`} />
    </div>
  );
}

function SeqCircle({ engine, q, colour, stage, open, onOpen }: { engine: LooperEngine; q: LooperSnapshot["sequencers"][number]; colour: string; stage: RefObject<HTMLDivElement | null>; open: boolean; onOpen: () => void }) {
  const arc = useRef<SVGCircleElement>(null);
  const toggle = () => engine.setSequencerPlaying(q.id, !q.playing);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const p = engine.getSequencer(q.id)?.position();
      if (arc.current) arc.current.style.strokeDashoffset = String(CIRC * (1 - (p === null || p === undefined ? 0 : (p + 1) / q.steps)));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [engine, q.id, q.steps]);
  const onPointerDown = (e: RPointerEvent) => {
    const base = { x: q.x, y: q.y };
    startDrag(e, stage.current, (dx, dy) => engine.do({ type: "sequencer.move", id: q.id, x: base.x + dx, y: base.y + dy }), toggle);
  };
  const onKeyDown = (e: RKeyboardEvent) => {
    const s = arrowStep(e);
    if (s) {
      e.preventDefault();
      engine.do({ type: "sequencer.move", id: q.id, x: q.x + s[0], y: q.y + s[1] });
    }
  };
  const size = LOOP_R * 2 - 8;
  const ring = q.playing ? "#34d399" : colour;
  return (
    <div className="absolute z-10 flex w-24 flex-col items-center gap-0.5" style={{ left: `${(q.x / STAGE_W) * 100}%`, top: `${(q.y / STAGE_H) * 100}%`, transform: `translate(-50%, -${LOOP_R - 4}px)` }}>
      <button type="button" onPointerDown={onPointerDown} onKeyDown={onKeyDown} onClick={(e) => e.detail === 0 && toggle()} aria-pressed={q.playing} aria-label={`${q.playing ? "Stop" : "Start"} ${q.name} on the next beat. Drag to move; Alt and arrow keys move it.`} title={`${q.playing ? "Stop" : "Start"} on the next beat (drag to move)`} className="relative grid cursor-grab place-items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-sky-400 active:cursor-grabbing" style={{ width: size, height: size, touchAction: "none" }}>
        <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden>
          <rect x="14" y="14" width="72" height="72" rx="20" fill={q.playing ? `${ring}22` : "none"} stroke="#1e293b" strokeWidth="8" />
          <circle ref={arc} cx="50" cy="50" r={RING} fill="none" stroke={ring} strokeWidth="8" strokeLinecap="round" strokeDasharray={CIRC} strokeDashoffset={CIRC} transform="rotate(-90 50 50)" opacity={q.playing ? 1 : 0.3} />
        </svg>
        <span className="absolute grid place-items-center" style={{ color: ring }}><Icon name="drum" size={24} /></span>
      </button>
      <span className="w-full truncate text-center text-[11px] font-medium text-slate-200" title={q.name}>{q.name}</span>
      <div className="flex items-center gap-0.5">
        <button type="button" className={`${tbtn} ${q.playing ? "!border-emerald-500/70 !text-emerald-200" : ""}`} onClick={toggle} aria-pressed={q.playing} title={q.playing ? "Stop on the next beat" : "Start on the next beat"} aria-label={q.playing ? `Stop ${q.name}` : `Start ${q.name}`}><Icon name={q.playing ? "square" : "play"} size={11} fill /></button>
        <button type="button" className={`${tbtn} ${open ? "!border-sky-400 !text-sky-200" : ""}`} onClick={onOpen} aria-pressed={open} title="Open the step grid" aria-label={`Open the step grid of ${q.name}`}><Icon name="sliders-horizontal" size={12} /></button>
      </div>
    </div>
  );
}

function GroupBox({ engine, g, stage, count, running, onFx }: { engine: LooperEngine; g: GroupInfo; stage: RefObject<HTMLDivElement | null>; count: number; running: boolean; onFx: () => void }) {
  const move = (e: RPointerEvent) => {
    if ((e.target as HTMLElement).closest("button,input,select")) return;
    engine.bringGroupToFront(g.id);
    const base = { x: g.x, y: g.y };
    startDrag(e, stage.current, (dx, dy) => engine.do({ type: "group.set", id: g.id, patch: { x: base.x + dx, y: base.y + dy } }));
  };
  const size = (e: RPointerEvent) => {
    e.stopPropagation();
    engine.bringGroupToFront(g.id);
    const base = { w: g.w, h: g.h };
    startDrag(e, stage.current, (dx, dy) => engine.do({ type: "group.set", id: g.id, patch: { w: base.w + dx, h: base.h + dy } }));
  };
  const onKeyDown = (e: RKeyboardEvent) => {
    const s = arrowStep(e);
    if (!s) return;
    e.preventDefault();
    if (e.shiftKey) engine.do({ type: "group.set", id: g.id, patch: { w: g.w + s[0], h: g.h + s[1] } });
    else engine.do({ type: "group.set", id: g.id, patch: { x: g.x + s[0], y: g.y + s[1] } });
  };
  const nextColour = GROUP_COLOURS[(GROUP_COLOURS.indexOf(g.colour) + 1) % GROUP_COLOURS.length];
  return (
    <div className="absolute rounded-xl border-2" style={{ left: `${(g.x / STAGE_W) * 100}%`, top: `${(g.y / STAGE_H) * 100}%`, width: `${(g.w / STAGE_W) * 100}%`, height: `${(g.h / STAGE_H) * 100}%`, borderColor: `${g.colour}99`, background: `${g.colour}14` }}>
      <div onPointerDown={move} onKeyDown={onKeyDown} tabIndex={0} role="group" aria-label={`Group ${g.name}. Alt and arrow keys move it, Alt Shift and arrows resize it.`} className="flex cursor-grab items-center gap-1 rounded-t-lg px-1.5 py-1 outline-none focus-visible:ring-2 focus-visible:ring-sky-400 active:cursor-grabbing" style={{ touchAction: "none", background: `${g.colour}26` }}>
        <button type="button" onClick={() => engine.do({ type: "group.set", id: g.id, patch: { colour: nextColour } })} className="h-4 w-4 shrink-0 rounded-full border border-white/30" style={{ background: g.colour }} title="Change colour" aria-label="Change colour" />
        <input value={g.name} onChange={(e) => engine.do({ type: "group.set", id: g.id, patch: { name: e.target.value } })} aria-label="Group name" className="min-w-0 flex-1 bg-transparent text-xs font-medium text-slate-100 focus:outline-none" />
        <button type="button" className={`${tbtn} ${running ? "!border-emerald-500/70 !text-emerald-200" : ""}`} disabled={count === 0} onClick={() => engine.do({ type: "group.active", id: g.id, on: !running })} title={running ? "Stop everything in this group on the next beat" : "Start everything in this group on the next beat"} aria-label={running ? `Stop ${g.name}` : `Start ${g.name}`} aria-pressed={running}><Icon name={running ? "square" : "play"} size={11} fill /></button>
        <button type="button" className={`${tbtn} relative`} onClick={onFx} title={`Effects on this bus${g.effects.length ? ` (${g.effects.length})` : ""}`} aria-label={`Effects of ${g.name}`}>
          <Icon name="audio-lines" size={13} />
          {g.effects.length > 0 && <span className="absolute -right-1 -top-1 grid h-3.5 min-w-3.5 place-items-center rounded-full bg-sky-500 px-0.5 text-[9px] font-semibold text-slate-950">{g.effects.length}</span>}
        </button>
        <button type="button" className={tbtn} onClick={() => engine.do({ type: "group.remove", id: g.id })} title={count ? "Remove this group (its loops go to the main output)" : "Remove this group"} aria-label={`Remove ${g.name}`}><Icon name="x" size={12} /></button>
      </div>
      <span onPointerDown={size} className="absolute bottom-0 right-0 h-4 w-4 cursor-nwse-resize rounded-br-lg border-b-2 border-r-2" style={{ borderColor: g.colour, touchAction: "none" }} role="presentation" />
    </div>
  );
}

/** The effects of a group's bus, in the shared effects modal. */
export function GroupEffects({ engine, g, onClose }: { engine: LooperEngine; g: GroupInfo; onClose: () => void }) {
  return (
    <EffectsModal
      title={<span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full" style={{ background: g.colour }} />{g.name}: effects</span>}
      effects={g.effects}
      pinScope={`g:${g.id}`}
      volume={{ value: g.volume, onChange: (v) => engine.do({ type: "group.set", id: g.id, patch: { volume: v } }) }}
      onAdd={(k, post) => engine.do({ type: "fx.add", target: { group: g.id }, fx: { kind: k, post } })}
      onRemove={(id) => engine.do({ type: "fx.remove", target: { group: g.id }, id })}
      onParam={(id, key, v) => engine.do({ type: "effect.param", groupId: g.id, fxId: id, key, value: v })}
      onBypass={(id) => engine.do({ type: "effect.bypass", groupId: g.id, fxId: id, bypass: !g.effects.find((e) => e.id === id)?.bypass })}
      onPost={(id, post) => engine.do({ type: "effect.post", groupId: g.id, fxId: id, post })}
      onClose={onClose}
    />
  );
}

/** Under a loop: its length once recorded (bars, or times the first loop); before that a menu to plan it. */
function LengthBadge({ engine, ch, firstTake, baseBars }: { engine: LooperEngine; ch: ChannelInfo; firstTake: boolean; baseBars: number | null }) {
  const cls = "rounded border border-slate-700 bg-slate-900 px-1 text-[10px] leading-4 text-slate-300";
  const label = (n: number) => (firstTake ? `${n} bar${n === 1 ? "" : "s"}` : baseBars ? `${n * baseBars} bars` : `x${n}`);
  if (ch.multiple > 0) return <span className={cls} title="Length of this loop">{firstTake || baseBars === null ? `x${ch.multiple}` : `${ch.multiple * baseBars} bar${ch.multiple * baseBars === 1 ? "" : "s"}`}</span>;
  if (ch.state !== "empty") return null;
  return (
    <select value={ch.plan} onChange={(e) => engine.do({ type: "loop.plan", id: ch.id, plan: Number(e.target.value) })} aria-label={`Length of ${ch.name}`} title="Length of the next take" className={`${cls} cursor-pointer`}>
      <option value={0}>free</option>
      {[1, 2, 4, 8, 16].map((n) => <option key={n} value={n}>{label(n)}</option>)}
    </select>
  );
}
