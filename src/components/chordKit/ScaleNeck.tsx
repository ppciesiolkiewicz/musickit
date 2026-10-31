"use client";

import { FretboardBase, fretGeometry } from "./Fretboard";
import usePhone from "@/components/usePhone";
import { VerticalBoard, vGeometry } from "./VerticalFretboard";
import { hoverLabel, noteLabel, type LabelSystem } from "@/features/theory/labels";
import { SCALE_NECK_FRETS, type ScaleCell, type ScalePosition } from "@/lib/chordKit/scalePositions";
import { useHeardNote } from "./heardNote";
import { NoteDot as Dot } from "./NoteDot";

export const cellKey = (c: { string: number; fret: number }) => `${c.string}-${c.fret}`;


interface NeckProps {
  cells: ScaleCell[];
  /** filled dots; the other scale notes are drawn as rings, or hidden when `rings` is off */
  big: (c: ScaleCell) => boolean;
  /** off also hides every note outside the focused position */
  rings?: boolean;
  /** outline this position on the neck */
  focus?: ScalePosition | null;
  /** fade the notes outside the focused position (off shows every note at full strength) */
  fadeOutside?: boolean;
  active: string | null;
  /** match `active` against "s-f" (exact place), "d<degree>" (every place that degree falls) or "pc<pitch class>" (every place that note falls) */
  labelSystem: LabelSystem;
  onNote: (c: ScaleCell) => void;
  compact?: boolean;
  title: string;
  /** each note's state: hidden ones are not drawn, muted ones dimmed, highlighted ones ringed */
  states?: (c: ScaleCell) => DotState;
  /** places (`cellKey`) sounding now, lit like `active` */
  sounding?: ReadonlySet<string>;
}

const isActive = (active: string | null, c: ScaleCell) => active !== null && (active === cellKey(c) || active === `d${c.degree}` || active === `pc${c.pc}`);

/** a note lights up when it is playing, and wherever the note the microphone hears falls (`HeardNote`) */
function useLit(active: string | null): (c: ScaleCell) => boolean {
  const heard = useHeardNote();
  return (c) => isActive(active, c) || heard === c.pc;
}

/** The whole neck, frets 0-17 (0-12 when compact), with every note of the scale. Tap a note to hear it. */
export function ScaleNeck({ cells, big, rings = true, focus = null, fadeOutside = true, active, labelSystem, onNote, compact = false, title, states, sounding }: NeckProps) {
  const heard = useLit(active);
  const lit = (c: ScaleCell) => heard(c) || !!sounding?.has(cellKey(c));
  const to = compact ? 12 : SCALE_NECK_FRETS;
  // a phone fits the whole neck on screen: narrower frets, so the dots come out bigger once it is scaled down
  const phone = usePhone();
  const g = compact ? fretGeometry(0, to, 34, 22, 36) : phone ? fretGeometry(0, to, 28, 26, 36) : fretGeometry(0, to, 54, 36, 42);
  const r = compact ? 8.5 : phone ? 11 : 14;
  const inFocus = new Set(focus?.notes.map(cellKey));
  const focusFrets = focus?.notes.map((c) => c.fret) ?? [];
  const shown = cells.filter((c) => c.fret <= to && (!states || states(c) !== "hidden") && (rings || (big(c) && (!focus || inFocus.has(cellKey(c))))));
  // rings under the dots, the playing note last so its outline is on top
  shown.sort((a, b) => Number(big(a)) - Number(big(b)) || Number(lit(a)) - Number(lit(b)));
  return (
    <div className="min-w-0">
      <svg viewBox={`0 0 ${g.W} ${g.H}`} width="100%" role="img" aria-label={title}>
        <FretboardBase g={g} markerSize={compact ? 4 : 6} numbersTop />
        {focus && focusFrets.length > 0 && (
          <rect
            x={g.fx(Math.min(...focusFrets)) - r - 5} y={g.sy(5) - r - 5}
            width={g.fx(Math.max(...focusFrets)) - g.fx(Math.min(...focusFrets)) + 2 * r + 10} height={g.sy(0) - g.sy(5) + 2 * r + 10}
            rx={r} fill="rgb(56 189 248 / 0.08)" stroke="rgb(56 189 248 / 0.7)" strokeWidth={2}
          />
        )}
        {shown.map((c) => (
          <Dot
            key={cellKey(c)} c={c} x={g.fx(c.fret)} y={g.sy(c.string)} r={r} ring={!big(c)}
            label={noteLabel(labelSystem, { name: c.name, semi: c.semi, degreeText: c.degreeText })}
            hover={hoverLabel(labelSystem, { name: c.name, semi: c.semi, degreeText: c.degreeText })}
            active={lit(c)} dim={(focus !== null && fadeOutside && !inFocus.has(cellKey(c))) || states?.(c) === "muted"} accent={states?.(c) === "highlighted"} onNote={onNote}
          />
        ))}
      </svg>
    </div>
  );
}

/** One position as a vertical box: its notes as dots, and (optionally) the other scale notes inside its frets as rings. */
/** How a note is drawn (see `noteState` in src/features/exercises/cues/visibility.ts). */
export type DotState = "hidden" | "muted" | "normal" | "highlighted";

export function PositionBox({ position, cells, rings, active, labelSystem, onNote, highlight, states, seam }: {
  position: ScalePosition; cells: ScaleCell[]; rings: boolean; active: string | null; labelSystem: LabelSystem; onNote: (c: ScaleCell) => void;
  /** pitch classes to stand out: every other note is dimmed (none: all notes alike) */
  highlight?: ReadonlySet<number>;
  /** each pitch class's state; replaces `highlight` when given: hidden notes are not drawn, muted ones dimmed, highlighted ones ringed */
  states?: (pc: number) => DotState;
  /** places (`cellKey`) circled with a dashed ring: where two boxes join */
  seam?: ReadonlySet<string>;
}) {
  const lit = useLit(active);
  // a box at the first fret also shows the open strings
  const from = position.from <= 1 ? 0 : position.from;
  const g = vGeometry(from, position.to, 38, 40, 34);
  const mine = new Set(position.notes.map(cellKey));
  const extra = rings ? cells.filter((c) => c.fret >= from && c.fret <= position.to && !mine.has(cellKey(c))) : [];
  const label = (c: ScaleCell) => noteLabel(labelSystem, { name: c.name, semi: c.semi, degreeText: c.degreeText });
  const hover = (c: ScaleCell) => hoverLabel(labelSystem, { name: c.name, semi: c.semi, degreeText: c.degreeText });
  const drawn = (c: ScaleCell) => !states || states(c.pc) !== "hidden";
  const dim = (c: ScaleCell) => (states ? states(c.pc) === "muted" : !!highlight && !highlight.has(c.pc));
  const accent = (c: ScaleCell) => !!states && states(c.pc) === "highlighted";
  return (
    <svg viewBox={`0 0 ${g.W} ${g.H}`} style={{ width: "100%", maxWidth: 260, height: "auto" }} className="mx-auto" role="img" aria-label={`Position ${position.number}, frets ${position.from} to ${position.to}`}>
      <VerticalBoard g={g} numbersRight />
      {extra.filter(drawn).map((c) => <Dot key={cellKey(c)} c={c} x={g.sx(c.string)} y={g.fy(c.fret)} r={14} ring label={label(c)} hover={hover(c)} active={lit(c)} dim={dim(c)} accent={accent(c)} onNote={onNote} />)}
      {position.notes.filter(drawn).map((c) => <Dot key={cellKey(c)} c={c} x={g.sx(c.string)} y={g.fy(c.fret)} r={14} ring={false} label={label(c)} hover={hover(c)} active={lit(c)} dim={dim(c)} accent={accent(c)} onNote={onNote} />)}
      {seam && position.notes.filter((c) => seam.has(cellKey(c))).map((c) => <circle key={`seam-${cellKey(c)}`} cx={g.sx(c.string)} cy={g.fy(c.fret)} r={19} fill="none" stroke="var(--color-amber-300)" strokeWidth={2} strokeDasharray="4 3" pointerEvents="none" />)}
    </svg>
  );
}
