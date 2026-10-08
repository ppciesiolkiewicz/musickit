"use client";

import { useEffect, useRef, useState, type KeyboardEvent as RKeyboardEvent, type PointerEvent as RPointerEvent, type RefObject } from "react";
import Icon from "../Icon";
import EffectsModal from "./EffectsModal";
import { GROUP_COLOURS, LOOP_R, STAGE_H, STAGE_W, type ChannelInfo, type GroupInfo, type LooperEngine, type LooperSnapshot } from "@/lib/looper/engine";

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
export default function LoopStage({ engine, snap, getPosition, openSeqs, onToggleSeq }: { engine: LooperEngine; snap: LooperSnapshot; getPosition: () => number | null; openSeqs: string[]; onToggleSeq: (id: string) => void }) {
  const stage = useRef<HTMLDivElement>(null);
  const [fxFor, setFxFor] = useState<string | null>(null);
  const ready = snap.status === "ready";
  const busy = snap.channels.some((c) => c.state === "recording" || c.state === "armed");
  const firstTake = snap.loopSeconds === null;
  const fxGroup = snap.groups.find((g) => g.id === fxFor) ?? null;

  return (
    <div className="overflow-x-auto">
      <div ref={stage} className="relative min-w-[860px] select-none rounded-xl border border-slate-800 bg-slate-950/60" style={{ aspectRatio: `${STAGE_W} / ${STAGE_H}` }}>
        {snap.groups.map((g) => (
          <GroupBox key={g.id} engine={engine} g={g} stage={stage} count={snap.channels.filter((c) => c.groupId === g.id && c.state !== "empty").length + snap.sequencers.filter((q) => q.groupId === g.id).length} running={snap.channels.some((c) => c.groupId === g.id && c.state !== "empty" && c.active && snap.playing) || snap.sequencers.some((q) => q.groupId === g.id && q.playing)} onFx={() => setFxFor(g.id)} />
        ))}
        {snap.channels.map((c) => {
          const g = snap.groups.find((x) => x.id === c.groupId);
          return <LoopCircle key={c.id} engine={engine} ch={c} colour={g?.colour ?? "#94a3b8"} stage={stage} ready={ready} busy={busy} firstTake={firstTake} getPosition={getPosition} />;
        })}
        {snap.sequencers.map((q) => {
          const g = snap.groups.find((x) => x.id === q.groupId);
          return <SeqCircle key={q.id} engine={engine} q={q} colour={g?.colour ?? "#94a3b8"} stage={stage} open={openSeqs.includes(q.id)} onOpen={() => onToggleSeq(q.id)} />;
        })}
      </div>
      {fxGroup && <GroupEffects engine={engine} g={fxGroup} onClose={() => setFxFor(null)} />}
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
            <circle ref={arc} cx="50" cy="50" r={RING} fill="none" stroke={live} strokeWidth="8" strokeLinecap="round" strokeDasharray={CIRC} strokeDashoffset={CIRC} transform="rotate(-90 50 50)" opacity={ch.muted || !ch.active ? 0.3 : 1} />
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
        <button type="button" className={`${tbtn} ${ch.active && ch.state !== "empty" ? "" : ""}`} disabled={ch.state === "empty"} onClick={() => engine.setLoopActive(ch.id, !ch.active)} title={ch.active ? "Stop on the next beat" : "Start on the next beat"} aria-label={ch.active ? `Stop ${ch.name}` : `Start ${ch.name}`} aria-pressed={ch.active}><Icon name={ch.active ? "square" : "play"} size={11} fill /></button>
        <button type="button" className={tbtn} disabled={ch.state === "empty"} onClick={() => engine.clear(ch.id)} title="Clear this loop" aria-label={`Clear ${ch.name}`}><Icon name="trash" size={12} /></button>
      </div>
      <input type="range" min={0} max={1} step={0.01} value={ch.volume} onChange={(e) => engine.setVolume(ch.id, Number(e.target.value))} className="h-3 w-16 accent-sky-400" aria-label={`Volume of ${ch.name}`} title={`Volume ${Math.round(ch.volume * 100)}%`} />
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
    startDrag(e, stage.current, (dx, dy) => engine.moveSequencer(q.id, base.x + dx, base.y + dy), toggle);
  };
  const onKeyDown = (e: RKeyboardEvent) => {
    const s = arrowStep(e);
    if (s) {
      e.preventDefault();
      engine.moveSequencer(q.id, q.x + s[0], q.y + s[1]);
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
        <button type="button" className={`${tbtn} ${running ? "!border-emerald-500/70 !text-emerald-200" : ""}`} disabled={count === 0} onClick={() => engine.setGroupActive(g.id, !running)} title={running ? "Stop everything in this group on the next beat" : "Start everything in this group on the next beat"} aria-label={running ? `Stop ${g.name}` : `Start ${g.name}`} aria-pressed={running}><Icon name={running ? "square" : "play"} size={11} fill /></button>
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

/** The effects of a group's bus, in the shared effects modal. */
export function GroupEffects({ engine, g, onClose }: { engine: LooperEngine; g: GroupInfo; onClose: () => void }) {
  return (
    <EffectsModal
      title={<span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full" style={{ background: g.colour }} />{g.name}: effects</span>}
      effects={g.effects}
      volume={{ value: g.volume, onChange: (v) => engine.updateGroup(g.id, { volume: v }) }}
      onAdd={(k, post) => engine.addEffect(g.id, k, post)}
      onRemove={(id) => engine.removeEffect(g.id, id)}
      onParam={(id, key, v) => engine.setEffectParam(g.id, id, key, v)}
      onBypass={(id) => engine.toggleEffectBypass(g.id, id)}
      onPost={(id, post) => engine.setEffectPost(g.id, id, post)}
      onClose={onClose}
    />
  );
}
