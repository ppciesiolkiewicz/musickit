"use client";

import type { LooperSnapshot } from "@/lib/looper/engine";

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
 * Read-only: change routing with each sequencer's destination menu and by moving loops into groups.
 */
export default function SignalFlow({ snap }: { snap: LooperSnapshot }) {
  const strips = snap.inputs;
  const loops = snap.channels;
  const groups = snap.groups;
  const rows = Math.max(strips.length, loops.length, groups.length, 2);
  const H = TOP + rows * ROW + 24;
  const mid = TOP + (rows * ROW) / 2;

  const srcY = (i: number) => TOP + i * ROW + ROW / 2 + ((rows - strips.length) * ROW) / 2;
  const loopY = (i: number) => TOP + i * ROW + ROW / 2 + ((rows - loops.length) * ROW) / 2;
  const busY = (i: number) => TOP + i * ROW + ROW / 2 + ((rows - groups.length) * ROW) / 2;
  const busIndex = new Map(groups.map((g, i) => [g.id, i]));
  const masterY = mid;
  const recY = mid;

  const seqDest = (id?: string) => {
    const q = snap.sequencers.find((x) => x.id === id);
    return !q ? "master" : q.dest === "record" ? "record" : q.groupId ?? "master";
  };
  const feedsRecorder = (i: (typeof strips)[number]) => (i.kind === "sequencer" ? seqDest(i.sourceId) === "record" : true);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full text-slate-300" role="img" aria-label="Signal flow from inputs through the recorder, loops and group buses to the master output">
      {[
        ["Sources", X.src],
        ["Recorder", X.rec],
        ["Loops", X.loop],
        ["Buses", X.bus],
        ["Master", X.master],
      ].map(([label, x]) => (
        <text key={String(label)} x={Number(x)} y={16} fontSize="11" fill="#64748b" style={{ letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</text>
      ))}

      {/* connections first, nodes on top */}
      {strips.map((s, i) => {
        const dest = s.kind === "sequencer" ? seqDest(s.sourceId) : "record";
        const y = srcY(i);
        const dim = s.muted ? 0.25 : 1;
        if (feedsRecorder(s)) return <path key={s.id} d={curve(X.src + 150, y, X.rec, recY)} stroke="#38bdf8" strokeWidth="2" fill="none" opacity={dim} />;
        if (dest === "master") {
          // run along the bottom so it does not cross the recorder, loops or buses
          const yb = H - 12 - (i % 3) * 5;
          return <path key={s.id} d={`M${X.src + 150},${y} C${X.src + 210},${y} ${X.src + 200},${yb} ${X.src + 270},${yb} L${X.master + 20},${yb} C${X.master + 60},${yb} ${X.master + 60},${masterY + 60} ${X.master + 60},${masterY + 30}`} stroke="#64748b" strokeWidth="2" fill="none" strokeDasharray="5 4" />;
        }
        const gi = busIndex.get(dest);
        const g = gi === undefined ? null : groups[gi];
        return g && gi !== undefined ? <path key={s.id} d={curve(X.src + 150, y, X.bus, busY(gi))} stroke={g.colour} strokeWidth="2" fill="none" strokeDasharray="5 4" /> : null;
      })}
      {strips.some(feedsRecorder) && loops.map((c, i) => <path key={`r${c.id}`} d={curve(X.rec + 60, recY, X.loop, loopY(i))} stroke="#38bdf8" strokeWidth="1" fill="none" opacity={c.state === "empty" ? 0.15 : 0.4} strokeDasharray="3 4" />)}
      {loops.map((c, i) => {
        const gi = c.groupId ? busIndex.get(c.groupId) : undefined;
        const g = gi === undefined ? null : groups[gi];
        const y = loopY(i);
        const o = c.state === "empty" ? 0.2 : c.muted ? 0.3 : 1;
        return g && gi !== undefined ? <path key={`l${c.id}`} d={curve(X.loop + 22, y, X.bus, busY(gi))} stroke={g.colour} strokeWidth="2" fill="none" opacity={o} /> : <path key={`l${c.id}`} d={curve(X.loop + 22, y, X.master, masterY + 10)} stroke="#94a3b8" strokeWidth="2" fill="none" opacity={o} />;
      })}
      {groups.map((g, i) => <path key={`b${g.id}`} d={curve(X.bus + 140, busY(i), X.master, masterY)} stroke={g.colour} strokeWidth="2.5" fill="none" />)}

      {strips.map((s, i) => (
        <g key={s.id} transform={`translate(${X.src}, ${srcY(i) - 14})`}>
          <rect width="150" height="28" rx="8" fill="#0f172a" stroke={s.live ? "#38bdf8" : "#334155"} />
          <text x="10" y="18" fontSize="12" fill="currentColor">{s.name.slice(0, 18)}</text>
          {s.kind === "sequencer" && <text x="140" y="18" fontSize="10" fill="#94a3b8" textAnchor="end">{seqDest(s.sourceId) === "master" ? "→ master" : seqDest(s.sourceId) === "record" ? "→ rec" : "→ bus"}</text>}
        </g>
      ))}

      <g transform={`translate(${X.rec}, ${recY - 40})`}>
        <rect width="120" height="80" rx="12" fill="#0f172a" stroke="#38bdf8" />
        <text x="60" y="36" fontSize="13" fill="currentColor" textAnchor="middle">Recorder</text>
        <text x="60" y="54" fontSize="10" fill="#94a3b8" textAnchor="middle">{snap.inputs.filter((i) => i.live && feedsRecorder(i)).length} live input{snap.inputs.filter((i) => i.live && feedsRecorder(i)).length === 1 ? "" : "s"}</text>
      </g>

      {loops.map((c, i) => {
        const g = c.groupId ? groups.find((x) => x.id === c.groupId) : null;
        const col = g?.colour ?? "#94a3b8";
        return (
          <g key={c.id} transform={`translate(${X.loop + 22}, ${loopY(i)})`}>
            <circle r="16" fill="#0f172a" stroke={col} strokeWidth="2.5" opacity={c.state === "empty" ? 0.4 : 1} />
            <text x="26" y="4" fontSize="11" fill="currentColor">{c.name.slice(0, 12)}</text>
          </g>
        );
      })}

      {groups.map((g, i) => (
        <g key={g.id} transform={`translate(${X.bus}, ${busY(i) - 16})`}>
          <rect width="140" height="32" rx="8" fill={`${g.colour}22`} stroke={g.colour} />
          <text x="10" y="14" fontSize="12" fill="currentColor">{g.name.slice(0, 16)}</text>
          <text x="10" y="26" fontSize="9.5" fill="#94a3b8">{g.effects.length ? g.effects.filter((e) => !e.bypass).map((e) => (e.kind === "tapeDelay" ? "delay" : "reverb")).join(" → ") || "bypassed" : "dry"}</text>
        </g>
      ))}

      <g transform={`translate(${X.master}, ${masterY - 30})`}>
        <rect width="120" height="60" rx="12" fill="#0f172a" stroke="#e2e8f0" />
        <text x="60" y="36" fontSize="13" fill="currentColor" textAnchor="middle">Master</text>
      </g>
    </svg>
  );
}
