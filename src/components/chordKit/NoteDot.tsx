import type { ScaleCell } from "@/lib/chordKit/scalePositions";
import { DOT_INK, degreeColour } from "@/features/theory/scales";
import { DotLabel } from "./DotLabel";

const ACTIVE = "#38bdf8";

/**
 * One note: a filled dot coloured by degree (root ringed in white), or a small ring for a note that is only there for
 * reference. A `finger` (1-4) sits in a small badge on its upper right. It has one highlight, an outer ring: the `accent`
 * colour, and blue while the note plays.
 */
export function NoteDot({ c, x, y, r, ring, label, hover, active, dim, accent = false, finger, onNote }: { c: ScaleCell; x: number; y: number; r: number; ring: boolean; label: string; hover: string; active: boolean; dim: boolean; /** an outer ring: the note the exercise is about (amber), or a colour of its own (a scale-neck's roots, rose) */ accent?: boolean | string; /** the finger that frets it, 1 index ... 4 pinky */ finger?: number; onNote: (c: ScaleCell) => void }) {
  const col = degreeColour(c.degree);
  const isRoot = c.degree === 0;
  const fs = (t: string) => (ring ? 0.85 : 0.9) * r * (t.length > 2 ? 0.68 : 0.88);
  const outer = active ? ACTIVE : accent === true ? "var(--color-amber-300)" : accent || null;
  return (
    <g opacity={dim ? 0.18 : 1} onClick={() => onNote(c)} className="group cursor-pointer">
      {/* a hover and tap area a few px wider than the dot */}
      <circle cx={x} cy={y} r={r + 4} fill="transparent" />
      {outer && <circle cx={x} cy={y} r={(ring ? r * 0.68 : r) + 3} fill="none" stroke={outer} strokeWidth={3} />}
      {ring ? (
        <circle cx={x} cy={y} r={r * 0.68} fill="var(--color-slate-950)" stroke={col} strokeWidth={1.6} />
      ) : (
        <circle cx={x} cy={y} r={r} fill={col} stroke={isRoot ? "var(--color-slate-50)" : "var(--color-slate-950)"} strokeWidth={isRoot ? 2.6 : 1.5} />
      )}
      <DotLabel label={label} hover={hover} size={fs} x={x} y={y + 0.5} textAnchor="middle" dominantBaseline="central" fontWeight={700} fill={ring ? col : DOT_INK} />
      {finger !== undefined && (
        <g aria-label={`finger ${finger}`} pointerEvents="none">
          <circle cx={x + r * 0.8} cy={y - r * 0.8} r={r * 0.48} fill="var(--color-slate-100)" stroke="var(--color-slate-950)" strokeWidth={1.2} />
          <text x={x + r * 0.8} y={y - r * 0.8 + 0.5} textAnchor="middle" dominantBaseline="central" fontSize={r * 0.62} fontWeight={700} fill="var(--color-slate-950)">{finger}</text>
        </g>
      )}
    </g>
  );
}
