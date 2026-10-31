import type { ScaleCell } from "@/lib/chordKit/scalePositions";
import { DOT_INK, degreeColour } from "@/features/theory/scales";
import { DotLabel } from "./DotLabel";

const ACTIVE = "#38bdf8";

/** One note: a filled dot coloured by degree (root ringed in white), or a small ring for a note that is only there for reference. */
export function NoteDot({ c, x, y, r, ring, label, hover, active, dim, accent = false, onNote }: { c: ScaleCell; x: number; y: number; r: number; ring: boolean; label: string; hover: string; active: boolean; dim: boolean; /** an outer ring: the note the exercise is about */ accent?: boolean; onNote: (c: ScaleCell) => void }) {
  const col = degreeColour(c.degree);
  const isRoot = c.degree === 0;
  const fs = (t: string) => (ring ? 0.85 : 0.9) * r * (t.length > 2 ? 0.68 : 0.88);
  return (
    <g opacity={dim ? 0.18 : 1} onClick={() => onNote(c)} className="group cursor-pointer">
      {/* a hover and tap area a few px wider than the dot */}
      <circle cx={x} cy={y} r={r + 4} fill="transparent" />
      {accent && <circle cx={x} cy={y} r={r + 3} fill="none" stroke="var(--color-amber-300)" strokeWidth={3} />}
      {ring ? (
        <circle cx={x} cy={y} r={r * 0.68} fill="var(--color-slate-950)" stroke={active ? ACTIVE : col} strokeWidth={active ? 3 : 1.6} />
      ) : (
        <circle cx={x} cy={y} r={active ? r + 2.5 : r} fill={col} stroke={active ? ACTIVE : isRoot ? "var(--color-slate-50)" : "var(--color-slate-950)"} strokeWidth={active ? 3.5 : isRoot ? 2.6 : 1.5} />
      )}
      <DotLabel label={label} hover={hover} size={fs} x={x} y={y + 0.5} textAnchor="middle" dominantBaseline="central" fontWeight={700} fill={ring ? col : DOT_INK} />
    </g>
  );
}
