"use client";

import { FretboardBase, fretGeometry } from "./Fretboard";
import { VerticalBoard, vGeometry } from "./VerticalFretboard";
import { DOT_INK, degreeColour } from "@/features/theory/scales";
import { noteLabel, type LabelSystem } from "@/features/theory/labels";
import { SCALE_NECK_FRETS, type ScaleCell, type ScalePosition } from "@/lib/chordKit/scalePositions";

const ACTIVE = "#38bdf8";
export const cellKey = (c: { string: number; fret: number }) => `${c.string}-${c.fret}`;

/** One note: a filled dot coloured by degree (root ringed in white), or a small ring for a note that is only there for reference. */
function Dot({ c, x, y, r, ring, label, active, dim, onNote }: { c: ScaleCell; x: number; y: number; r: number; ring: boolean; label: string; active: boolean; dim: boolean; onNote: (c: ScaleCell) => void }) {
  const col = degreeColour(c.degree);
  const isRoot = c.degree === 0;
  const fs = (ring ? 0.85 : 0.9) * r * (label.length > 2 ? 0.68 : 0.88);
  return (
    <g opacity={dim ? 0.18 : 1} onClick={() => onNote(c)} style={{ cursor: "pointer" }}>
      <title>{`${c.name} · degree ${c.degreeText}`}</title>
      {ring ? (
        <circle cx={x} cy={y} r={r * 0.68} fill="var(--color-slate-950)" stroke={active ? ACTIVE : col} strokeWidth={active ? 3 : 1.6} />
      ) : (
        <circle cx={x} cy={y} r={active ? r + 2.5 : r} fill={col} stroke={active ? ACTIVE : isRoot ? "var(--color-slate-50)" : "var(--color-slate-950)"} strokeWidth={active ? 3.5 : isRoot ? 2.6 : 1.5} />
      )}
      <text x={x} y={y + 0.5} textAnchor="middle" dominantBaseline="central" fontSize={fs} fontWeight={700} fill={ring ? col : DOT_INK} pointerEvents="none">{label}</text>
    </g>
  );
}

interface NeckProps {
  cells: ScaleCell[];
  /** filled dots; the other scale notes are drawn as rings, or hidden when `rings` is off */
  big: (c: ScaleCell) => boolean;
  rings?: boolean;
  /** light this position up and fade the rest */
  focus?: ScalePosition | null;
  active: string | null;
  /** match `active` against "s-f" (exact place) or "d<degree>" (every place that degree falls) */
  labelSystem: LabelSystem;
  onNote: (c: ScaleCell) => void;
  compact?: boolean;
  title: string;
}

const isActive = (active: string | null, c: ScaleCell) => active !== null && (active === cellKey(c) || active === `d${c.degree}`);

/** The whole neck, frets 0-17 (0-12 when compact), with every note of the scale. Tap a note to hear it. */
export function ScaleNeck({ cells, big, rings = true, focus = null, active, labelSystem, onNote, compact = false, title }: NeckProps) {
  const to = compact ? 12 : SCALE_NECK_FRETS;
  const g = compact ? fretGeometry(0, to, 34, 22, 36) : fretGeometry(0, to, 54, 36, 42);
  const r = compact ? 8.5 : 14;
  const inFocus = new Set(focus?.notes.map(cellKey));
  const shown = cells.filter((c) => c.fret <= to && (big(c) || rings));
  // rings under the dots, the playing note last so its outline is on top
  shown.sort((a, b) => Number(big(a)) - Number(big(b)) || Number(isActive(active, a)) - Number(isActive(active, b)));
  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${g.W} ${g.H}`} width="100%" style={{ minWidth: compact ? 440 : 820 }} role="img" aria-label={title}>
        <FretboardBase g={g} markerSize={compact ? 4 : 6} numbersTop />
        {shown.map((c) => (
          <Dot
            key={cellKey(c)} c={c} x={g.fx(c.fret)} y={g.sy(c.string)} r={r} ring={!big(c)}
            label={noteLabel(labelSystem, { name: c.name, semi: c.semi, degreeText: c.degreeText })}
            active={isActive(active, c)} dim={focus !== null && !inFocus.has(cellKey(c))} onNote={onNote}
          />
        ))}
      </svg>
    </div>
  );
}

/** One position as a vertical box: its notes as dots, and (optionally) the other scale notes inside its frets as rings. */
export function PositionBox({ position, cells, rings, active, labelSystem, onNote }: { position: ScalePosition; cells: ScaleCell[]; rings: boolean; active: string | null; labelSystem: LabelSystem; onNote: (c: ScaleCell) => void }) {
  // a box at the first fret also shows the open strings
  const from = position.from <= 1 ? 0 : position.from;
  const g = vGeometry(from, position.to, 38, 40, 34);
  const mine = new Set(position.notes.map(cellKey));
  const extra = rings ? cells.filter((c) => c.fret >= from && c.fret <= position.to && !mine.has(cellKey(c))) : [];
  const label = (c: ScaleCell) => noteLabel(labelSystem, { name: c.name, semi: c.semi, degreeText: c.degreeText });
  return (
    <svg viewBox={`0 0 ${g.W} ${g.H}`} style={{ width: "100%", maxWidth: 260, height: "auto" }} className="mx-auto" role="img" aria-label={`Position ${position.number}, frets ${position.from} to ${position.to}`}>
      <VerticalBoard g={g} numbersRight />
      {extra.map((c) => <Dot key={cellKey(c)} c={c} x={g.sx(c.string)} y={g.fy(c.fret)} r={14} ring label={label(c)} active={isActive(active, c)} dim={false} onNote={onNote} />)}
      {position.notes.map((c) => <Dot key={cellKey(c)} c={c} x={g.sx(c.string)} y={g.fy(c.fret)} r={14} ring={false} label={label(c)} active={isActive(active, c)} dim={false} onNote={onNote} />)}
    </svg>
  );
}
