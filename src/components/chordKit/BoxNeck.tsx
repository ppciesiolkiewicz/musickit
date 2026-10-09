"use client";

import { Badge } from "./Fretboard";
import { VerticalBoard, vGeometry } from "./VerticalFretboard";
import type { CagedBox, CagedCell } from "@/lib/chordKit/caged";
import { degreeColour } from "@/lib/chordKit/scales";
import { fmtDegree, noteLabel, type LabelSystem } from "@/lib/chordKit/labels";

export interface Layers {
  chord: boolean;
  arp: boolean;
  pent: boolean;
  scale: boolean;
}

type Tier = "chord" | "arp" | "pent" | "scale";
const RADIUS: Record<Tier, number> = { chord: 14, arp: 14, pent: 14, scale: 14 };
const OUT = "#f43f5e";

/** A vertical slice of the neck for one CAGED box. Every layer uses the same dot size and degree colours. */
export default function BoxNeck({ cells, box, layers, labelSystem, badges = true, onNote }: { cells: CagedCell[]; box: CagedBox; layers: Layers; labelSystem: LabelSystem; badges?: boolean; onNote: (c: CagedCell) => void }) {
  const g = vGeometry(box.from, box.to);
  const labelFor = (c: CagedCell) => noteLabel(labelSystem, { name: c.name, semi: c.semi, degreeText: c.degreeText, role: c.arpRole });
  const showBadge = badges && labelSystem === "note";

  const tier = (c: CagedCell): Tier | null => {
    if (layers.chord && c.inChord) return "chord";
    if (layers.arp && c.arpRole) return "arp";
    if (layers.pent && c.inPent) return "pent";
    if (layers.scale && c.inScale) return "scale";
    return null;
  };
  const order: Tier[] = ["scale", "pent", "arp", "chord"];
  const placed = cells.map((c) => ({ c, t: tier(c) })).filter((x): x is { c: CagedCell; t: Tier } => x.t !== null);
  placed.sort((a, b) => order.indexOf(a.t) - order.indexOf(b.t));

  return (
    <div>
      <svg viewBox={`0 0 ${g.W} ${g.H}`} style={{ width: "100%", maxWidth: 280, height: "auto" }} className="mx-auto" role="img" aria-label={`${box.letter} shape box, frets ${box.from} to ${box.to}`}>
        <VerticalBoard g={g} />
        {placed.map(({ c, t }) => {
          const x = g.sx(c.string), y = g.fy(c.fret), r = RADIUS[t];
          const colour = c.scaleDegree === null ? OUT : degreeColour(c.scaleDegree);
          const label = labelFor(c);
          const key = `${c.string}-${c.fret}`;
          return (
            <g key={key} onClick={() => onNote(c)} style={{ cursor: "pointer" }}>
              <circle cx={x} cy={y} r={r} fill={colour} stroke={c.isRoot ? "#ffffff" : "#0d1526"} strokeWidth={c.isRoot ? 2.5 : 1.5} />
              <text x={x} y={y + 0.5} textAnchor="middle" dominantBaseline="central" fontSize={label.length > 2 ? 9.5 : 12.5} fontWeight={700} fill="#0b1220" pointerEvents="none">{label}</text>
            </g>
          );
        })}
        {showBadge && placed.map(({ c, t }) => (
          <Badge key={`b${c.string}-${c.fret}`} x={g.sx(c.string)} y={g.fy(c.fret)} r={RADIUS[t]} text={fmtDegree(c.degreeText)} colour={c.scaleDegree === null ? OUT : degreeColour(c.scaleDegree)} />
        ))}
      </svg>
      <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500" aria-label="Key to the dots">
        <li className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded-full bg-slate-100 ring-2 ring-white/80 ring-offset-1 ring-offset-slate-900" />root</li>
      </ul>
    </div>
  );
}
