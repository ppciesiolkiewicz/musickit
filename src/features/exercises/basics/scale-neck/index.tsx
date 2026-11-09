"use client";

import { noteState, type Others, type Visibility } from "../../cues/visibility";
import { pickBox, type Placement } from "../../cues/placement";
import { useCallback, useMemo } from "react";
import { PositionBox, cellKey } from "@/components/chordKit/ScaleNeck";
import { useNotePlayer } from "@/components/chordKit/useNotePlayer";
import { useLabelSystem } from "@/features/theory/useLabelSystem";
import { positionLine, type ScalePosition } from "@/lib/chordKit/scalePositions";
import { SHARP, scaleBoxes, shiftPosition } from "./boxes";
import { GuitarView } from "./Guitar";

/**
 * The scale's positions on the neck, only the boxes asked for, with any added notes played in them; tap a note to hear
 * it, ▶ to run the box up and down.
 */
function Boxes({ slug, pc, boxes, placement, add, enable, highlight, mute, hide: hidden, others }: { slug: string; pc: number; boxes?: number[]; placement?: Placement; add?: number[]; enable?: number[]; highlight?: number[]; mute?: number[]; hide?: number[]; others?: Others }) {
  // the marks are semitones above the key; the states work on pitch classes
  const vis = useMemo((): Visibility => {
    const pcs = (semis?: number[]) => semis?.map((semi) => (pc + semi) % 12);
    return { enable: pcs(enable), highlight: pcs(highlight), mute: pcs(mute), hide: pcs(hidden), add, others };
  }, [pc, enable, highlight, mute, hidden, add, others]);
  const state = useCallback((p: number) => noteState(vis, p), [vis]);
  const litNames = [...new Set([...(vis.highlight ?? []), ...(add ?? [])])].filter((p) => state(p) === "highlighted").map((p) => SHARP[p]);
  const [system] = useLabelSystem();
  const { active, running, play, tap, stop } = useNotePlayer();
  const { title, cells: allCells, positions: allPositions } = useMemo(() => scaleBoxes(slug, pc, add), [slug, pc, add]);
  // hidden notes leave the boxes and the rings, and the ▶ run
  const cells = useMemo(() => allCells.filter((c) => state(c.pc) !== "hidden"), [allCells, state]);
  const positions = useMemo(() => allPositions.map((p) => ({ ...p, notes: p.notes.filter((c) => state(c.pc) !== "hidden") })), [allPositions, state]);
  const shown = useMemo(() => {
    if (boxes?.length) return positions.filter((p) => boxes.includes(p.number));
    // a placement picks one box (from all of it, hidden notes too), maybe an octave down; nothing fits: every box, as without one
    const picked = placement && placement.by !== "chords"
      ? pickBox(allPositions.map((p) => ({ number: p.number, from: p.from, to: p.to, roots: p.notes.filter((c) => c.semi === 0).map((c) => ({ string: c.string, fret: c.fret })) })), placement)
      : null;
    const box = picked && positions.find((p) => p.number === picked.number);
    return box ? [shiftPosition(box, picked.shift)] : positions;
  }, [boxes, placement, positions, allPositions]);
  const run = (p: ScalePosition) => {
    const up = positionLine(p).map((n) => ({ key: cellKey(n), midi: n.midi }));
    play([...up, ...up.slice(0, -1).reverse()], undefined, `box-${p.number}`);
  };
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-slate-400">{title}{litNames.length ? ` · ${litNames.join(" ")} lit` : ""}{boxes?.length ? ` · position${boxes.length > 1 ? "s" : ""} ${boxes.join(" & ")}` : ""}</p>
      <div className="grid gap-3 lg:grid-cols-2">
        {shown.map((p) => (
          <div key={p.number} className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <span>Position {p.number}</span>
              <button type="button" onClick={() => (running === `box-${p.number}` ? stop() : run(p))} className="rounded border border-slate-700 px-2 py-0.5 text-[11px] text-slate-300 hover:border-slate-500">{running === `box-${p.number}` ? "■ Stop" : "▶ Play"}</button>
            </div>
            <PositionBox position={p} cells={cells} rings active={active} labelSystem={system} onNote={(c) => tap(cellKey(c), c.midi)} states={state} />
          </div>
        ))}
      </div>
    </div>
  );
}

type ViewProps = Parameters<typeof Boxes>[0] & { neck?: boolean; positions?: boolean };

/** The boxes alone (the plan's exercises), or with `neck` (or no boxes) the scales page's interactive guitar section. */
export function View({ neck, positions, ...rest }: ViewProps) {
  if (neck || positions === false) return <GuitarView slug={rest.slug} pc={rest.pc} boxes={rest.boxes} neck={neck === true} positions={positions !== false} />;
  return <Boxes {...rest} />;
}
