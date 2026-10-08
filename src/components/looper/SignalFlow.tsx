"use client";

import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { LooperEngine, LooperSnapshot } from "@/lib/looper/engine";
import { spotInGroup, spotOutside } from "@/lib/looper/layout";

const W = 1000;
const X = { src: 20, rec: 290, loop: 470, bus: 640, master: 860 };
const ROW = 40;
const TOP = 34;

const curve = (x1: number, y1: number, x2: number, y2: number) => {
  const m = (x1 + x2) / 2;
  return `M${x1},${y1} C${m},${y1} ${m},${y2} ${x2},${y2}`;
};

/**
 * The signal path at a glance: inputs and sequencers on the left, the recorder, the loops, the group buses with their effects, and the master.
 * Drag a loop or sequencer onto a bus (puts it in that group on the stage), onto the master (outside every group), or a sequencer onto the recorder (record). The mixer and stage follow.
 */
type Drag = { kind: "loop" | "seq"; id: number | string; x: number; y: number };

export default function SignalFlow({ snap, engine }: { snap: LooperSnapshot; engine: LooperEngine }) {
  const svg = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const seqs = snap.sequencers;
  const seqById = new Map(seqs.map((q) => [q.id, q]));
  // Sources are what feeds the recorder. A sequencer only appears there when it is switched to record; otherwise it lives on the stage with the loops.
  const strips = snap.inputs.filter((i) => i.kind !== "sequencer" || seqById.get(i.sourceId ?? "")?.dest === "record");
  const loops = snap.channels;
  const groups = snap.groups;
  const stage = loops.length + seqs.length;
  const rows = Math.max(strips.length, stage, groups.length, 2);
  const H = TOP + rows * ROW + 16;
  const mid = TOP + (rows * ROW) / 2;

  const srcY = (i: number) => TOP + i * ROW + ROW / 2 + ((rows - strips.length) * ROW) / 2;
  const stageY = (i: number) => TOP + i * ROW + ROW / 2 + ((rows - stage) * ROW) / 2;
  const loopY = stageY;
  const seqY = (i: number) => stageY(loops.length + i);
  const busY = (i: number) => TOP + i * ROW + ROW / 2 + ((rows - groups.length) * ROW) / 2;
  const busIndex = new Map(groups.map((g, i) => [g.id, i]));
  const masterY = mid;
  const recY = mid;

  const toSvg = (e: { clientX: number; clientY: number }) => {
    const el = svg.current;
    const m = el?.getScreenCTM();
    if (!el || !m) return { x: 0, y: 0 };
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    return { x: p.x, y: p.y };
  };
  /** which drop target is under the point */
  const targetAt = (x: number, y: number): { type: "bus"; id: string } | { type: "master" } | { type: "recorder" } | null => {
    for (let i = 0; i < groups.length; i++) if (x >= X.bus && x <= X.bus + 140 && Math.abs(y - busY(i)) <= 18) return { type: "bus", id: groups[i].id };
    if (x >= X.master && x <= X.master + 120 && Math.abs(y - masterY) <= 32) return { type: "master" };
    if (x >= X.rec && x <= X.rec + 120 && Math.abs(y - recY) <= 42) return { type: "recorder" };
    return null;
  };
  const taken = [...snap.channels.map((c) => ({ x: c.x, y: c.y })), ...snap.sequencers.map((q) => ({ x: q.x, y: q.y }))];
  const drop = (d: Drag, x: number, y: number) => {
    const t = targetAt(x, y);
    setHint(null);
    if (!t) return;
    const others = (id: number | string) => taken.filter((_, i) => (d.kind === "loop" ? i !== id : i !== snap.channels.length + snap.sequencers.findIndex((q) => q.id === id)));
    if (t.type === "recorder") {
      if (d.kind === "seq") engine.setSequencerDest(String(d.id), "record");
      return;
    }
    if (d.kind === "seq") engine.setSequencerDest(String(d.id), "auto");
    const spot = t.type === "bus" ? spotInGroup(snap.groups, t.id, others(d.id)) : spotOutside(snap.groups, others(d.id));
    if (!spot) {
      setHint("No room outside the groups on the stage: shrink or move a group first.");
      return;
    }
    if (d.kind === "loop") engine.moveChannel(Number(d.id), spot.x, spot.y);
    else engine.moveSequencer(String(d.id), spot.x, spot.y);
  };
  const begin = (e: ReactPointerEvent, kind: Drag["kind"], id: number | string) => {
    e.preventDefault();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    const p = toSvg(e);
    setHint(null);
    setDrag({ kind, id, ...p });
  };
  const move = (e: ReactPointerEvent) => drag && setDrag({ ...drag, ...toSvg(e) });
  const end = (e: ReactPointerEvent) => {
    if (!drag) return;
    const p = toSvg(e);
    drop(drag, p.x, p.y);
    setDrag(null);
  };
  const over = drag ? targetAt(drag.x, drag.y) : null;
  const grab = { cursor: "grab", touchAction: "none" } as const;

  return (
    <svg ref={svg} onPointerMove={move} onPointerUp={end} onPointerCancel={() => setDrag(null)} viewBox={`0 0 ${W} ${H}`} className="w-full select-none text-slate-300" role="img" aria-label="Signal flow from inputs through the recorder, loops and group buses to the master output">
      {[
        ["Inputs", X.src],
        ["Recorder", X.rec],
        ["Loops + sequencers", X.loop],
        ["Buses", X.bus],
        ["Master", X.master],
      ].map(([label, x]) => (
        <text key={String(label)} x={Number(x)} y={16} fontSize="11" fill="#64748b" style={{ letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</text>
      ))}

      {/* connections first, nodes on top */}
      {strips.map((s, i) => <path key={s.id} d={curve(X.src + 150, srcY(i), X.rec, recY)} stroke="#38bdf8" strokeWidth="2" fill="none" opacity={s.muted ? 0.25 : 1} />)}
      {strips.length > 0 && loops.map((c, i) => <path key={`r${c.id}`} d={curve(X.rec + 120, recY, X.loop, loopY(i))} stroke="#38bdf8" strokeWidth="1" fill="none" opacity={c.state === "empty" ? 0.15 : 0.4} strokeDasharray="3 4" />)}
      {loops.map((c, i) => {
        const gi = c.groupId ? busIndex.get(c.groupId) : undefined;
        const g = gi === undefined ? null : groups[gi];
        const y = loopY(i);
        const o = c.state === "empty" ? 0.2 : c.muted ? 0.3 : 1;
        return g && gi !== undefined ? <path key={`l${c.id}`} d={curve(X.loop + 22, y, X.bus, busY(gi))} stroke={g.colour} strokeWidth="2" fill="none" opacity={o} /> : <path key={`l${c.id}`} d={curve(X.loop + 22, y, X.master, masterY + 10)} stroke="#94a3b8" strokeWidth="2" fill="none" opacity={o} />;
      })}
      {seqs.map((q, i) => {
        const gi = q.groupId ? busIndex.get(q.groupId) : undefined;
        const g = gi === undefined ? null : groups[gi];
        const y = seqY(i);
        return g && gi !== undefined ? <path key={`q${q.id}`} d={curve(X.loop + 22, y, X.bus, busY(gi))} stroke={g.colour} strokeWidth="2" fill="none" strokeDasharray="5 4" /> : <path key={`q${q.id}`} d={curve(X.loop + 22, y, X.master, masterY + 10)} stroke="#94a3b8" strokeWidth="2" fill="none" strokeDasharray="5 4" />;
      })}
      {groups.map((g, i) => <path key={`b${g.id}`} d={curve(X.bus + 140, busY(i), X.master, masterY)} stroke={g.colour} strokeWidth="2.5" fill="none" />)}

      {strips.map((s, i) => (
        <g key={s.id} transform={`translate(${X.src}, ${srcY(i) - 14})`}>
          <rect width="150" height="28" rx="8" fill="#0f172a" stroke={s.live ? "#38bdf8" : "#334155"} />
          <text x="10" y="18" fontSize="12" fill="currentColor">{s.name.slice(0, 18)}</text>
          {s.effects.length > 0 && <text x="140" y="18" fontSize="10" fill="#a78bfa" textAnchor="end">fx {s.effects.length}</text>}
        </g>
      ))}

      <g transform={`translate(${X.rec}, ${recY - 40})`}>
        <rect width="120" height="80" rx="12" fill="#0f172a" stroke="#38bdf8" strokeWidth={over?.type === "recorder" ? 4 : 1} />
        <text x="60" y="36" fontSize="13" fill="currentColor" textAnchor="middle">Recorder</text>
        <text x="60" y="54" fontSize="10" fill="#94a3b8" textAnchor="middle">{strips.filter((i) => i.live).length} live input{strips.filter((i) => i.live).length === 1 ? "" : "s"}</text>
      </g>

      {loops.map((c, i) => {
        const g = c.groupId ? groups.find((x) => x.id === c.groupId) : null;
        const col = g?.colour ?? "#94a3b8";
        return (
          <g key={c.id} transform={`translate(${drag?.kind === "loop" && drag.id === c.id ? `${drag.x}, ${drag.y}` : `${X.loop + 22}, ${loopY(i)}`})`} style={grab} onPointerDown={(e) => begin(e, "loop", c.id)} opacity={drag?.kind === "loop" && drag.id === c.id ? 0.85 : 1}>
            <title>Drag onto a bus or the master</title>
            <circle r="16" fill="#0f172a" stroke={col} strokeWidth="2.5" opacity={c.state === "empty" ? 0.4 : 1} />
            <text x="26" y="4" fontSize="11" fill="currentColor">{c.name.slice(0, 12)}</text>
          </g>
        );
      })}
      {seqs.map((q, i) => {
        const g = q.groupId ? groups.find((x) => x.id === q.groupId) : null;
        const col = g?.colour ?? "#94a3b8";
        return (
          <g key={q.id} transform={`translate(${drag?.kind === "seq" && drag.id === q.id ? `${drag.x}, ${drag.y}` : `${X.loop + 22}, ${seqY(i)}`})`} style={grab} onPointerDown={(e) => begin(e, "seq", q.id)} opacity={drag?.kind === "seq" && drag.id === q.id ? 0.85 : 1}>
            <title>Drag onto a bus, the master or the recorder</title>
            <rect x="-15" y="-15" width="30" height="30" rx="7" fill="#0f172a" stroke={col} strokeWidth="2.5" strokeDasharray={q.running ? undefined : "4 3"} />
            <text x="26" y="4" fontSize="11" fill="currentColor">{q.name.slice(0, 12)}</text>
          </g>
        );
      })}

      {groups.map((g, i) => (
        <g key={g.id} transform={`translate(${X.bus}, ${busY(i) - 16})`}>
          <rect width="140" height="32" rx="8" fill={`${g.colour}22`} stroke={g.colour} strokeWidth={over?.type === "bus" && over.id === g.id ? 4 : 1} />
          <text x="10" y="14" fontSize="12" fill="currentColor">{g.name.slice(0, 16)}</text>
          <text x="10" y="26" fontSize="9.5" fill="#94a3b8">{g.effects.length ? g.effects.filter((e) => !e.bypass).map((e) => (e.kind === "tapeDelay" ? "delay" : "reverb") + (e.post ? "·post" : "")).join(" → ") || "bypassed" : "dry"}</text>
        </g>
      ))}

      <g transform={`translate(${X.master}, ${masterY - 30})`}>
        <rect width="120" height="60" rx="12" fill="#0f172a" stroke="#e2e8f0" strokeWidth={over?.type === "master" ? 4 : 1} />
        <text x="60" y="36" fontSize="13" fill="currentColor" textAnchor="middle">Master</text>
      </g>
      {hint && <text x={W / 2} y={H - 4} fontSize="11" fill="#fbbf24" textAnchor="middle">{hint}</text>}
    </svg>
  );
}
