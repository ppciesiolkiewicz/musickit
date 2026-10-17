"use client";

import { useMemo, useState } from "react";
import { Chip, ChipRow, DegreeLegend, Info } from "@/components/ui";
import { useLabelSystem } from "@/features/theory/useLabelSystem";
import type { KeyContext } from "@/features/theory/theory";
import { pentatonicOf, positionLine, positionsFor, rootStrings, scaleCells, type PositionKind, type ScaleCell, type ScalePosition } from "@/lib/chordKit/scalePositions";
import { PositionBox, ScaleNeck, cellKey } from "./ScaleNeck";
import { STRING_NAMES } from "./Fretboard";
import type { NotePlayer } from "./useNotePlayer";

const playBtn = "rounded-full border border-emerald-500/70 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-100 hover:bg-emerald-500/25";

/**
 * A mode on the guitar: the whole neck, then the five positions to learn it in (the pentatonic boxes, or the full scale in those boxes).
 * Tap a note to hear it, play a position up and down, or pick a position to light it up on the neck.
 */
export default function ScaleOnGuitar({ ctx, player }: { ctx: KeyContext; player: NotePlayer }) {
  const [system] = useLabelSystem();
  const [kind, setKind] = useState<PositionKind>("pentatonic");
  const [rings, setRings] = useState(true);
  const [focus, setFocus] = useState<number | null>(null);
  const [fade, setFade] = useState(true);
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
    const up = positionLine(p);
    const line = [...up, ...up.slice(0, -1).reverse()];
    play(line.map((c) => ({ key: cellKey(c), midi: c.midi })), 220);
  };

  return (
    <section id="guitar" className="scroll-mt-48 rounded-2xl border border-slate-800 bg-slate-900/40 p-2.5">
      <h2 className="mb-2 text-sm font-medium text-slate-100">
        {keyName} on the guitar
        <Info label="How do I read the neck?">
          Every dot is a note of {keyName}, coloured by its scale degree; the root has a white ring. Tap any note to hear it. In pentatonic mode the five notes of the {pent.name.toLowerCase()} are the big dots and the other two notes of the mode are small rings, so you can see what the mode adds to the pentatonic. Pick a position below to light it up on the neck.
        </Info>
      </h2>

      <div className="mb-3 flex flex-col gap-2">
        <ChipRow label="Positions" info="Five positions cover the neck, and each is named by the strings its root is on (counting from the low E): 1 has it on E, D and high e; 2 on D and B; 3 on A and B; 4 on A and G; 5 on G, E and high e. Each box keeps its classic shape: it sits at the root's fret on the low E string. Near the nut a note that would fall below it moves to the next string down (so in E, position 1 is the open position); otherwise a box that would go below the nut or past the 17th fret is shown an octave away, so the numbers can jump along the neck. Every mode uses the same five boxes as the major pentatonic (when it has a major 3rd) or the minor pentatonic (minor 3rd), so the shapes look familiar: each string keeps the frets that box uses, and the mode's notes are placed there. Pentatonic shows the mode's five-note scale. Full scale adds the other two notes into the same five boxes (the CAGED scale shapes), so there are still five positions, not seven: one map of the neck for both, with the pentatonic you know as the frame.">
          <Chip on={kind === "pentatonic"} onClick={() => { setKind("pentatonic"); setFocus(null); }}>{pent.name} boxes</Chip>
          <Chip on={kind === "scale"} onClick={() => { setKind("scale"); setFocus(null); }}>Full scale</Chip>
          <span className="mx-1 h-4 w-px bg-slate-700" aria-hidden />
          <Chip on={rings} onClick={() => setRings((v) => !v)}>Other scale notes</Chip>
        </ChipRow>
        <p className="text-xs text-slate-400">
          {kind === "pentatonic" ? (
            <>{pent.name}: <b className="text-slate-200">{pent.degrees.map((d) => ctx.names[d]).join(" ")}</b> <span className="tabular-nums">({pent.formula.join(" ")})</span>. {ctx.modeName} adds {[0, 1, 2, 3, 4, 5, 6].filter((d) => !pentDegrees.has(d)).map((d) => ctx.names[d]).join(" and ")}.</>
          ) : (
            <>All seven notes, <b className="text-slate-200">{ctx.names.join(" ")}</b>, in the same five boxes as the {pent.name.toLowerCase()}.</>
          )}
        </p>
      </div>

      <ScaleNeck cells={cells} big={big} rings={rings} focus={focused} fadeOutside={fade} active={active} labelSystem={system} onNote={onNote} title={`${keyName} on the guitar neck`} />
      <div className="mt-2">
        <DegreeLegend />
      </div>

      <div className="mt-4 flex min-h-8 flex-wrap items-center gap-2 text-xs text-slate-400">
        {focused ? (
          <>
            <span>Position <b className="text-slate-200">{focused.number}</b> is outlined on the neck.</span>
            <Chip on={!fade} onClick={() => setFade((v) => !v)}>All scale notes</Chip>
            <button type="button" onClick={() => setFocus(null)} className="rounded-full border border-slate-700 px-2.5 py-1 text-slate-300 hover:border-sky-400">
              ✕ Clear position
            </button>
          </>
        ) : (
          <span>Pick a position to outline it on the neck.</span>
        )}
      </div>

      <div className={`mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5`}>
        {positions.map((p) => {
          const on = focus === p.number;
          return (
            <div key={p.number} className={`flex min-w-0 flex-col gap-1.5 rounded-xl border p-2 transition ${on ? "border-sky-500/70 bg-sky-500/5" : "border-slate-800 bg-slate-950/50"}`}>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => setFocus(on ? null : p.number)} aria-pressed={on} className="text-left text-sm font-medium text-slate-100 hover:text-sky-300" title="Light it up on the neck">
                  Position {p.number}
                  <span className="block text-xs font-normal text-slate-300">root on {rootStrings(p).map((s) => STRING_NAMES[s]).join(", ")}</span>
                  <span className="block text-xs font-normal text-slate-500">frets {p.from}–{p.to}</span>
                </button>
                <button type="button" onClick={() => playPosition(p)} className={`${playBtn} ml-auto`}>▶ Play</button>
              </div>
              <PositionBox position={p} cells={cells} rings={rings} active={active} labelSystem={system} onNote={onNote} />
            </div>
          );
        })}
      </div>
      <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded-full bg-slate-300" />{kind === "pentatonic" ? `in the ${pent.name.toLowerCase()}: played` : "in the position: played"}</span>
        {rings && <span className="inline-flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded-full border-2 border-slate-400" />{kind === "pentatonic" ? `other notes of ${ctx.modeName}: not played` : "scale notes outside the position: not played"}</span>}
        <span>Play runs up the position from its lowest note and back down. Tap a position&apos;s name to see it on the neck.</span>
      </p>
    </section>
  );
}
