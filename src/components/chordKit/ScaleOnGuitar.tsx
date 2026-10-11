"use client";

import { useMemo, useState } from "react";
import { Chip, ChipRow, DegreeLegend, Info } from "@/components/ui";
import { useLabelSystem } from "@/features/theory/useLabelSystem";
import type { KeyContext } from "@/features/theory/theory";
import { pentatonicOf, positionsFor, scaleCells, type PositionKind, type ScaleCell, type ScalePosition } from "@/lib/chordKit/scalePositions";
import { PositionBox, ScaleNeck, cellKey } from "./ScaleNeck";
import type { NotePlayer } from "./useNotePlayer";

const playBtn = "rounded-full border border-emerald-500/70 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-100 hover:bg-emerald-500/25";

/**
 * A mode on the guitar: the whole neck, then the positions to learn it in (pentatonic boxes or three notes per string).
 * Tap a note to hear it, play a position up and down, or pick a position to light it up on the neck.
 */
export default function ScaleOnGuitar({ ctx, player }: { ctx: KeyContext; player: NotePlayer }) {
  const [system] = useLabelSystem();
  const [kind, setKind] = useState<PositionKind>("pentatonic");
  const [rings, setRings] = useState(true);
  const [focus, setFocus] = useState<number | null>(null);
  const { active, play, tap } = player;

  const cells = useMemo(() => scaleCells(ctx), [ctx]);
  const pent = useMemo(() => pentatonicOf(ctx.steps), [ctx]);
  const positions = useMemo(() => positionsFor(ctx, kind), [ctx, kind]);
  const pentDegrees = new Set(pent.degrees);
  const big = kind === "pentatonic" ? (c: ScaleCell) => pentDegrees.has(c.degree) : () => true;
  const focused = positions.find((p) => p.number === focus) ?? null;
  const keyName = `${ctx.names[0]} ${ctx.modeName}`;

  const onNote = (c: ScaleCell) => tap(cellKey(c), c.midi);
  const playPosition = (p: ScalePosition) => {
    setFocus(p.number);
    const line = [...p.notes, ...p.notes.slice(0, -1).reverse()];
    play(line.map((c) => ({ key: cellKey(c), midi: c.midi })), 220);
  };

  return (
    <section id="guitar" className="scroll-mt-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-2.5">
      <h2 className="mb-2 text-sm font-medium text-slate-100">
        {keyName} on the guitar
        <Info label="How do I read the neck?">
          Every dot is a note of {keyName}, coloured by its scale degree; the root has a white ring. Tap any note to hear it. In pentatonic mode the five notes of the {pent.name.toLowerCase()} are the big dots and the other two notes of the mode are small rings, so you can see what the mode adds to the pentatonic. Pick a position below to light it up on the neck.
        </Info>
      </h2>

      <div className="mb-3 flex flex-col gap-2">
        <ChipRow label="Positions" info="Pentatonic boxes are the five shapes most players learn first: two notes on every string, so each is easy to finger. Three notes per string covers the full seven-note scale in seven positions; it suits fast runs. Either way, position 1 starts on the root on the low E string and each next position starts on the next note, so the shapes join up along the neck.">
          <Chip on={kind === "pentatonic"} onClick={() => { setKind("pentatonic"); setFocus(null); }}>{pent.name} boxes</Chip>
          <Chip on={kind === "threeNps"} onClick={() => { setKind("threeNps"); setFocus(null); }}>Full scale, 3 notes per string</Chip>
          <span className="mx-1 h-4 w-px bg-slate-700" aria-hidden />
          <Chip on={rings} onClick={() => setRings((v) => !v)}>Other scale notes</Chip>
        </ChipRow>
        <p className="text-xs text-slate-400">
          {kind === "pentatonic" ? (
            <>{pent.name}: <b className="text-slate-200">{pent.degrees.map((d) => ctx.names[d]).join(" ")}</b> <span className="tabular-nums">({pent.formula.join(" ")})</span>. {ctx.modeName} adds {[0, 1, 2, 3, 4, 5, 6].filter((d) => !pentDegrees.has(d)).map((d) => ctx.names[d]).join(" and ")}.</>
          ) : (
            <>All seven notes, three on each string: <b className="text-slate-200">{ctx.names.join(" ")}</b>.</>
          )}
        </p>
      </div>

      <ScaleNeck cells={cells} big={big} rings={rings} focus={focused} active={active} labelSystem={system} onNote={onNote} title={`${keyName} on the guitar neck`} />
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
        <DegreeLegend />
        {focused && (
          <button type="button" onClick={() => setFocus(null)} className="ml-auto rounded-full border border-slate-700 px-2.5 py-1 text-xs text-slate-300 hover:border-sky-400">
            Showing position {focused.number} · show the whole neck
          </button>
        )}
      </div>

      <div className={`mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 ${kind === "pentatonic" ? "xl:grid-cols-5" : "xl:grid-cols-4"}`}>
        {positions.map((p) => {
          const on = focus === p.number;
          return (
            <div key={p.number} className={`flex min-w-0 flex-col gap-1.5 rounded-xl border p-2 transition ${on ? "border-sky-500/70 bg-sky-500/5" : "border-slate-800 bg-slate-950/50"}`}>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => setFocus(on ? null : p.number)} aria-pressed={on} className="text-left text-sm font-medium text-slate-100 hover:text-sky-300" title="Light it up on the neck">
                  Position {p.number}
                  <span className="block text-xs font-normal text-slate-500">frets {p.from}–{p.to} · from {ctx.names[p.startDegree]}</span>
                </button>
                <button type="button" onClick={() => playPosition(p)} className={`${playBtn} ml-auto`}>▶ Play</button>
              </div>
              <PositionBox position={p} cells={cells} rings={rings} active={active} labelSystem={system} onNote={onNote} />
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-slate-500">Play runs up the position from the lowest note and back down. Tap a position&apos;s name to see where it sits on the neck.</p>
    </section>
  );
}
