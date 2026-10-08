"use client";

import { useEffect, useRef, useState, type KeyboardEvent as RKeyboardEvent, type PointerEvent as RPointerEvent, type RefObject } from "react";
import Icon from "../Icon";
import Modal from "../Modal";
import { EFFECT_DEFS, EFFECT_KINDS, GROUP_COLOURS, LOOP_R, STAGE_H, STAGE_W, type ChannelInfo, type EffectKind, type GroupInfo, type LooperEngine, type LooperSnapshot } from "@/lib/looper/engine";

const ibtn = "grid h-8 min-w-8 place-items-center rounded-lg border border-slate-700 bg-slate-900 px-1.5 text-xs text-slate-200 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400";
const tbtn = "grid h-6 min-w-6 place-items-center rounded-md border border-slate-700/80 bg-slate-900/80 px-1 text-[10px] text-slate-300 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400";
const RING = 40;
const CIRC = 2 * Math.PI * RING;

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
export default function LoopStage({ engine, snap, getPosition }: { engine: LooperEngine; snap: LooperSnapshot; getPosition: () => number | null }) {
  const stage = useRef<HTMLDivElement>(null);
  const [fxFor, setFxFor] = useState<string | null>(null);
  const ready = snap.status === "ready";
  const busy = snap.channels.some((c) => c.state === "recording" || c.state === "armed");
  const firstTake = snap.loopSeconds === null;
  const fxGroup = snap.groups.find((g) => g.id === fxFor) ?? null;

  return (
    <div className="overflow-x-auto">
      <div ref={stage} className="relative min-w-[680px] select-none rounded-xl border border-slate-800 bg-slate-950/60" style={{ aspectRatio: `${STAGE_W} / ${STAGE_H}` }}>
        {snap.groups.map((g) => (
          <GroupBox key={g.id} engine={engine} g={g} stage={stage} count={snap.channels.filter((c) => c.groupId === g.id).length} onFx={() => setFxFor(g.id)} />
        ))}
        {snap.channels.map((c) => {
          const g = snap.groups.find((x) => x.id === c.groupId);
          return <LoopCircle key={c.id} engine={engine} ch={c} colour={g?.colour ?? "#94a3b8"} stage={stage} ready={ready} busy={busy} firstTake={firstTake} getPosition={getPosition} />;
        })}
      </div>
      {fxGroup && <GroupFxModal engine={engine} g={fxGroup} onClose={() => setFxFor(null)} />}
    </div>
  );
}

function LoopCircle({ engine, ch, colour, stage, ready, busy, firstTake, getPosition }: { engine: LooperEngine; ch: ChannelInfo; colour: string; stage: RefObject<HTMLDivElement | null>; ready: boolean; busy: boolean; firstTake: boolean; getPosition: () => number | null }) {
  const arc = useRef<SVGCircleElement>(null);
  const recording = ch.state === "recording" || ch.state === "armed";
  const isFreeTake = recording && firstTake;
  const label = isFreeTake ? "Stop the take" : recording ? "Cancel" : ch.state === "empty" ? "Record" : "Re-record";
  const act = () => (recording ? engine.stopRecording() : engine.record(ch.id));
  const live = ch.state === "recording" ? "#fb7185" : ch.state === "armed" ? "#fbbf24" : colour;

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const p = getPosition();
      if (arc.current) arc.current.style.strokeDashoffset = String(CIRC * (1 - (ch.state === "empty" || isFreeTake || p === null ? 0 : p)));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [getPosition, ch.state, isFreeTake]);

  const onPointerDown = (e: RPointerEvent) => {
    const base = { x: ch.x, y: ch.y };
    startDrag(e, stage.current, (dx, dy) => engine.moveChannel(ch.id, base.x + dx, base.y + dy), () => ready && !(busy && !recording) && act());
  };
  const onKeyDown = (e: RKeyboardEvent) => {
    const s = arrowStep(e);
    if (s) {
      e.preventDefault();
      engine.moveChannel(ch.id, ch.x + s[0], ch.y + s[1]);
    }
  };
  const size = LOOP_R * 2 - 8;
  return (
    <div className="absolute z-10 flex w-24 flex-col items-center gap-0.5" style={{ left: `${(ch.x / STAGE_W) * 100}%`, top: `${(ch.y / STAGE_H) * 100}%`, transform: `translate(-50%, -${LOOP_R - 4}px)` }}>
      <button type="button" onPointerDown={onPointerDown} onKeyDown={onKeyDown} onClick={(e) => e.detail === 0 && ready && !(busy && !recording) && act()} aria-label={`${label}: ${ch.name}. Drag to move; Alt and arrow keys move it.`} title={`${label} (drag to move)`} className="relative grid cursor-grab place-items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-sky-400 active:cursor-grabbing" style={{ width: size, height: size, touchAction: "none" }}>
        <svg viewBox="0 0 100 100" width={size} height={size} className={isFreeTake ? "animate-spin [animation-duration:2.4s]" : ""} aria-hidden>
          <circle cx="50" cy="50" r={RING} fill={ch.state === "empty" ? "none" : `${live}22`} stroke="#1e293b" strokeWidth="8" strokeDasharray={ch.state === "armed" ? "4 5" : undefined} />
          {isFreeTake ? (
            <circle cx="50" cy="50" r={RING} fill="none" stroke={live} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${CIRC * 0.25} ${CIRC}`} />
          ) : (
            <circle ref={arc} cx="50" cy="50" r={RING} fill="none" stroke={live} strokeWidth="8" strokeLinecap="round" strokeDasharray={CIRC} strokeDashoffset={CIRC} transform="rotate(-90 50 50)" opacity={ch.muted ? 0.35 : 1} />
          )}
        </svg>
        <span className="absolute grid place-items-center" style={{ color: live }}>
          <Icon name={isFreeTake ? "square" : recording ? "x" : ch.state === "empty" ? "circle" : "repeat"} size={22} fill={isFreeTake || ch.state === "empty"} />
        </span>
      </button>
      <input value={ch.name} onChange={(e) => engine.rename(ch.id, e.target.value)} aria-label={`Name of ${ch.name}`} className="w-full truncate rounded border border-transparent bg-transparent px-1 text-center text-[11px] font-medium text-slate-200 hover:border-slate-700 focus:border-slate-500 focus:outline-none" />
      <div className="flex items-center gap-0.5">
        <button type="button" className={`${tbtn} ${ch.muted ? "!border-amber-400 !text-amber-200" : ""}`} aria-pressed={ch.muted} disabled={ch.state === "empty"} onClick={() => engine.toggleMute(ch.id)} title="Mute" aria-label={`Mute ${ch.name}`}>M</button>
        <button type="button" className={`${tbtn} ${ch.solo ? "!border-sky-400 !text-sky-200" : ""}`} aria-pressed={ch.solo} disabled={ch.state === "empty"} onClick={() => engine.toggleSolo(ch.id)} title="Solo" aria-label={`Solo ${ch.name}`}>S</button>
        <button type="button" className={tbtn} disabled={ch.state === "empty"} onClick={() => engine.clear(ch.id)} title="Clear this loop" aria-label={`Clear ${ch.name}`}><Icon name="trash" size={12} /></button>
      </div>
      <input type="range" min={0} max={1} step={0.01} value={ch.volume} onChange={(e) => engine.setVolume(ch.id, Number(e.target.value))} className="h-3 w-16 accent-sky-400" aria-label={`Volume of ${ch.name}`} title={`Volume ${Math.round(ch.volume * 100)}%`} />
    </div>
  );
}

function GroupBox({ engine, g, stage, count, onFx }: { engine: LooperEngine; g: GroupInfo; stage: RefObject<HTMLDivElement | null>; count: number; onFx: () => void }) {
  const move = (e: RPointerEvent) => {
    if ((e.target as HTMLElement).closest("button,input,select")) return;
    engine.bringGroupToFront(g.id);
    const base = { x: g.x, y: g.y };
    startDrag(e, stage.current, (dx, dy) => engine.updateGroup(g.id, { x: base.x + dx, y: base.y + dy }));
  };
  const size = (e: RPointerEvent) => {
    e.stopPropagation();
    engine.bringGroupToFront(g.id);
    const base = { w: g.w, h: g.h };
    startDrag(e, stage.current, (dx, dy) => engine.updateGroup(g.id, { w: base.w + dx, h: base.h + dy }));
  };
  const onKeyDown = (e: RKeyboardEvent) => {
    const s = arrowStep(e);
    if (!s) return;
    e.preventDefault();
    if (e.shiftKey) engine.updateGroup(g.id, { w: g.w + s[0], h: g.h + s[1] });
    else engine.updateGroup(g.id, { x: g.x + s[0], y: g.y + s[1] });
  };
  const nextColour = GROUP_COLOURS[(GROUP_COLOURS.indexOf(g.colour) + 1) % GROUP_COLOURS.length];
  return (
    <div className="absolute rounded-xl border-2" style={{ left: `${(g.x / STAGE_W) * 100}%`, top: `${(g.y / STAGE_H) * 100}%`, width: `${(g.w / STAGE_W) * 100}%`, height: `${(g.h / STAGE_H) * 100}%`, borderColor: `${g.colour}99`, background: `${g.colour}14` }}>
      <div onPointerDown={move} onKeyDown={onKeyDown} tabIndex={0} role="group" aria-label={`Group ${g.name}. Alt and arrow keys move it, Alt Shift and arrows resize it.`} className="flex cursor-grab items-center gap-1 rounded-t-lg px-1.5 py-1 outline-none focus-visible:ring-2 focus-visible:ring-sky-400 active:cursor-grabbing" style={{ touchAction: "none", background: `${g.colour}26` }}>
        <button type="button" onClick={() => engine.updateGroup(g.id, { colour: nextColour })} className="h-4 w-4 shrink-0 rounded-full border border-white/30" style={{ background: g.colour }} title="Change colour" aria-label="Change colour" />
        <input value={g.name} onChange={(e) => engine.updateGroup(g.id, { name: e.target.value })} aria-label="Group name" className="min-w-0 flex-1 bg-transparent text-xs font-medium text-slate-100 focus:outline-none" />
        <button type="button" className={`${tbtn} relative`} onClick={onFx} title={`Effects on this bus${g.effects.length ? ` (${g.effects.length})` : ""}`} aria-label={`Effects of ${g.name}`}>
          <Icon name="audio-lines" size={13} />
          {g.effects.length > 0 && <span className="absolute -right-1 -top-1 grid h-3.5 min-w-3.5 place-items-center rounded-full bg-sky-500 px-0.5 text-[9px] font-semibold text-slate-950">{g.effects.length}</span>}
        </button>
        <button type="button" className={tbtn} onClick={() => engine.removeGroup(g.id)} title={count ? "Remove this group (its loops go to the main output)" : "Remove this group"} aria-label={`Remove ${g.name}`}><Icon name="x" size={12} /></button>
      </div>
      <span onPointerDown={size} className="absolute bottom-0 right-0 h-4 w-4 cursor-nwse-resize rounded-br-lg border-b-2 border-r-2" style={{ borderColor: g.colour, touchAction: "none" }} role="presentation" />
    </div>
  );
}

/** The effects on a group's bus: add tape delay or reverb, tweak, bypass, remove. */
function GroupFxModal({ engine, g, onClose }: { engine: LooperEngine; g: GroupInfo; onClose: () => void }) {
  return (
    <Modal title={<span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full" style={{ background: g.colour }} />{g.name}: effects</span>} onClose={onClose}>
      <div className="flex flex-col gap-3">
        <label className="flex items-center gap-2 text-xs text-slate-400">
          <Icon name="volume-2" /> Group volume
          <input type="range" min={0} max={1.5} step={0.01} value={g.volume} onChange={(e) => engine.updateGroup(g.id, { volume: Number(e.target.value) })} className="flex-1 accent-sky-400" aria-label="Group volume" />
          <span className="w-10 tabular-nums">{Math.round(g.volume * 100)}%</span>
        </label>
        {g.effects.length === 0 && <p className="rounded-lg border border-dashed border-slate-700 p-2 text-xs text-slate-400">No effects. Loops in this group play dry. Add one below.</p>}
        {g.effects.map((fx) => {
          const def = EFFECT_DEFS[fx.kind];
          return (
            <section key={fx.id} className={`flex flex-col gap-1.5 rounded-xl border border-slate-800 bg-slate-900/50 p-2.5 ${fx.bypass ? "opacity-60" : ""}`}>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium text-slate-100">{def.name}</h3>
                <button type="button" className={`${ibtn} ml-auto ${fx.bypass ? "" : "!border-emerald-500/70 !text-emerald-200"}`} aria-pressed={!fx.bypass} onClick={() => engine.toggleEffectBypass(g.id, fx.id)} title={fx.bypass ? "Bypassed (tap to switch on)" : "On (tap to bypass)"} aria-label={`${def.name} on or off`}><Icon name="power" /></button>
                <button type="button" className={ibtn} onClick={() => engine.removeEffect(g.id, fx.id)} title="Remove" aria-label={`Remove ${def.name}`}><Icon name="trash" /></button>
              </div>
              <div className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
                {def.params.map((p) => (
                  <label key={p.key} className="flex items-center gap-2 text-xs text-slate-400">
                    <span className="w-14">{p.label}</span>
                    <input type="range" min={p.min} max={p.max} step={p.step} value={fx.params[p.key]} onChange={(e) => engine.setEffectParam(g.id, fx.id, p.key, Number(e.target.value))} className="flex-1 accent-sky-400" aria-label={`${def.name} ${p.label}`} />
                    <span className="w-16 text-right tabular-nums">{p.unit ? `${Math.round(fx.params[p.key] * 100) / 100} ${p.unit}` : Math.round(fx.params[p.key] * 100) + "%"}</span>
                  </label>
                ))}
              </div>
            </section>
          );
        })}
        <div className="flex flex-wrap gap-2">
          {EFFECT_KINDS.map((k: EffectKind) => (
            <button key={k} type="button" disabled={g.effects.length >= 6} className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 hover:border-sky-400 disabled:opacity-40" onClick={() => engine.addEffect(g.id, k)}>
              <Icon name="plus" size={14} /> {EFFECT_DEFS[k].name}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-500">Effects run in order, top first. Loops sit in this group when their circle is inside its box; drag a circle in or out to change that.</p>
      </div>
    </Modal>
  );
}
