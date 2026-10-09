"use client";

import { fretWidthFactor } from "./Fretboard";
import { HUES } from "./palette";
import { fmtInterval } from "@/features/theory/labels";
import { intervalLabel, OPEN_PITCH } from "@/lib/chordKit/shapeTools";
import { intervalText, NECK_FRETS, type Instance, type Move } from "@/lib/chordKit/progressions";

interface Props {
  title: string;
  specs: Instance[];
  moves: Move[];
  /** scale pitch classes counted from E */
  scalePcs: number[];
  /** highlight one chord (by uniq index) and dim the rest */
  focus?: number | null;
}

const colW = 48, left = 62, top = 92, rowH = 28;

/** The whole neck (frets 0-17) with every position of every chord, plus lanes showing how the root moves between them. */
export default function NeckDiagram({ title, specs, moves, scalePcs, focus = null }: Props) {
  // fret lines are spaced like a real neck: wider at the nut, narrower up the neck
  const edge = (f: number) => left + Array.from({ length: f }, (_, k) => colW * fretWidthFactor(k + 1)).reduce((a, b) => a + b, 0);
  const W = edge(NECK_FRETS) + 30;
  const fx = (f: number) => (f === 0 ? left - 16 : (edge(f - 1) + edge(f)) / 2);
  const sy = (r: number) => top + r * rowH;

  const boxes = specs.map((sp) => {
    const pts = sp.pts.map((p) => ({ ...p, x: fx(p.a), y: sy(5 - p.i) }));
    const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
    return { sp, pts, xmin: Math.min(...xs), xmax: Math.max(...xs), ymin: Math.min(...ys), ymax: Math.max(...ys), cx: (Math.min(...xs) + Math.max(...xs)) / 2, label: `${sp.chord.name} · fret ${sp.rootFret}` };
  });

  const laneTop = sy(5) + 80;
  const H = laneTop + Math.max(0, moves.length - 1) * 58 + 34;
  const dim = (ci: number) => (focus !== null && focus !== ci ? 0.18 : 1);

  // stack the chord labels in up to three rows so they do not overlap
  const rowEnd = [-1e9, -1e9, -1e9];
  const labels = boxes.slice().sort((a, b) => a.cx - b.cx).map((b) => {
    const w = b.label.length * 6.6 + 18, x0 = b.cx - w / 2;
    let row = rowEnd.findIndex((e) => e < x0 - 6);
    if (row < 0) row = rowEnd.indexOf(Math.min(...rowEnd));
    rowEnd[row] = x0 + w;
    return { b, w, x0, cy: top - (row === 0 ? 66 : row === 1 ? 45 : 24) };
  });

  const grid = "#475569";
  const dots = [3, 5, 7, 9, 15, 17];

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ minWidth: Math.round(W * 0.8) }} role="img" aria-label={title}>
        <defs>
          <marker id="neck-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M0,0 L10,5 L0,10 z" fill="#94a3b8" />
          </marker>
        </defs>
        {dots.map((f) => <circle key={f} cx={fx(f)} cy={(sy(2) + sy(3)) / 2} r={6} fill="#334155" opacity={0.8} />)}
        <circle cx={fx(12)} cy={(sy(1) + sy(2)) / 2} r={6} fill="#334155" opacity={0.8} />
        <circle cx={fx(12)} cy={(sy(3) + sy(4)) / 2} r={6} fill="#334155" opacity={0.8} />
        {Array.from({ length: NECK_FRETS + 1 }, (_, f) => (
          <line key={`f${f}`} x1={edge(f)} x2={edge(f)} y1={sy(0) - 6} y2={sy(5) + 6} stroke={grid} strokeWidth={f === 0 ? 3 : 1} />
        ))}
        {Array.from({ length: 6 }, (_, r) => (
          <line key={`s${r}`} x1={left} x2={edge(NECK_FRETS)} y1={sy(r)} y2={sy(r)} stroke={grid} strokeWidth={1 + r * 0.12} />
        ))}
        {Array.from({ length: NECK_FRETS }, (_, i) => (
          <text key={`n${i}`} x={fx(i + 1)} y={sy(5) + 26} textAnchor="middle" fontSize={11} fill="#94a3b8">{i + 1}</text>
        ))}
        {Array.from({ length: 6 }, (_, i) =>
          Array.from({ length: NECK_FRETS + 1 }, (_, f) =>
            scalePcs.includes((OPEN_PITCH[i] + f) % 12) ? <circle key={`d${i}-${f}`} cx={fx(f)} cy={sy(5 - i)} r={3.2} fill="#64748b" opacity={0.6} /> : null,
          ),
        )}

        {boxes.map(({ sp, xmin, xmax, ymin, ymax }, k) => {
          const h = HUES[sp.hue];
          return <rect key={`b${k}`} x={xmin - 16} y={ymin - 16} width={xmax - xmin + 32} height={ymax - ymin + 32} rx={12} fill={h.leaf} fillOpacity={0.45 * dim(sp.ci)} stroke={h.hub} strokeWidth={1.7} strokeOpacity={dim(sp.ci)} />;
        })}

        {labels.map(({ b, w, x0, cy }, k) => {
          const h = HUES[b.sp.hue];
          return (
            <g key={`l${k}`} opacity={dim(b.sp.ci)}>
              <rect x={x0} y={cy - 10} width={w} height={20} rx={10} fill={h.hub} />
              <text x={b.cx} y={cy} textAnchor="middle" dominantBaseline="central" fill={h.onHub} fontSize={11.5} fontWeight={600}>{b.label}</text>
            </g>
          );
        })}

        {boxes.map(({ sp, pts }, k) => {
          const h = HUES[sp.hue];
          return (
            <g key={`p${k}`} opacity={dim(sp.ci)}>
              {pts.map((p) => {
                const lab = fmtInterval(intervalLabel(sp.shape, p.semi));
                const root = p.semi === 0;
                return (
                  <g key={p.i}>
                    <circle cx={p.x} cy={p.y} r={10.5} fill={root ? h.hub : h.leaf} stroke={h.line} strokeWidth={1.3} />
                    <text x={p.x} y={p.y} textAnchor="middle" dominantBaseline="central" fill={root ? h.onHub : h.text} fontSize={lab.length > 2 ? 8 : 10} fontWeight={600}>{lab}</text>
                  </g>
                );
              })}
            </g>
          );
        })}

        {moves.map((m, ti) => {
          const A = m.from, B = m.to, y = laneTop + ti * 58;
          let xa = fx(A.rootFret), xb = fx(B.rootFret);
          const wA = Math.max(38, A.chord.name.length * 7.6 + 18), wB = Math.max(38, B.chord.name.length * 7.6 + 18);
          const gap = wA / 2 + wB / 2 + 52;
          if (Math.abs(xb - xa) < gap) {
            const mid = (xa + xb) / 2, d = xb >= xa ? 1 : -1;
            xa = mid - (d * gap) / 2;
            xb = mid + (d * gap) / 2;
          }
          const dir = xb >= xa ? 1 : -1;
          const fd = m.frets;
          const extra = fd === 0 ? " · same fret" : ` · ${Math.abs(fd)} fret${Math.abs(fd) === 1 ? "" : "s"}`;
          const text = `${A.chord.roman} → ${B.chord.roman}   ${intervalText(m.rootDiff)}${extra}`;
          const pw = text.length * 6.2 + 20, mx = (xa + xb) / 2;
          const hA = HUES[A.hue], hB = HUES[B.hue];
          return (
            <g key={`m${ti}`}>
              <line x1={xa + (dir * wA) / 2} x2={xb - (dir * wB) / 2 - 2} y1={y} y2={y} stroke="#94a3b8" strokeWidth={1.7} markerEnd="url(#neck-arrow)" />
              <rect x={xa - wA / 2} y={y - 12} width={wA} height={24} rx={12} fill={hA.hub} />
              <text x={xa} y={y} textAnchor="middle" dominantBaseline="central" fill={hA.onHub} fontSize={11.5} fontWeight={600}>{A.chord.name}</text>
              <rect x={xb - wB / 2} y={y - 12} width={wB} height={24} rx={12} fill={hB.hub} />
              <text x={xb} y={y} textAnchor="middle" dominantBaseline="central" fill={hB.onHub} fontSize={11.5} fontWeight={600}>{B.chord.name}</text>
              <rect x={mx - pw / 2} y={y - 36} width={pw} height={20} rx={10} fill="#0f172a" stroke="#334155" />
              <text x={mx} y={y - 26} textAnchor="middle" dominantBaseline="central" fill="#e2e8f0" fontSize={11.5} fontWeight={500}>{text}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
