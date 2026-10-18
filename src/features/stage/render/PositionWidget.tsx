"use client";

import { useMemo } from "react";
import { ScaleNeck, cellKey } from "@/components/chordKit/ScaleNeck";
import { useNotePlayer } from "@/components/chordKit/useNotePlayer";
import type { KeyContext } from "@/features/theory";
import { useLabelSystem } from "@/features/theory/useLabelSystem";
import { pentatonicOf, positionsFor, scaleCells, type PositionKind, type ScaleCell } from "@/lib/chordKit/scalePositions";

/** One position of a scale lit up on the whole neck (the others faded). Tap a note to hear it. */
export default function PositionWidget({ ctx, kind, index }: { ctx: KeyContext; kind: PositionKind; index: number }) {
  const [system] = useLabelSystem();
  const player = useNotePlayer();
  const cells = useMemo(() => scaleCells(ctx), [ctx]);
  const positions = useMemo(() => positionsFor(ctx, kind), [ctx, kind]);
  const pent = useMemo(() => new Set(pentatonicOf(ctx.steps).degrees), [ctx]);
  const big = kind === "pentatonic" ? (c: ScaleCell) => pent.has(c.degree) : () => true;
  const focus = positions[Math.min(index, positions.length - 1)] ?? null;
  const title = `${ctx.names[0]} ${ctx.modeName}`;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-2">
      <ScaleNeck cells={cells} big={big} focus={focus} fadeOutside active={player.active} labelSystem={system} onNote={(c) => player.tap(cellKey(c), c.midi)} title={title} />
    </div>
  );
}
