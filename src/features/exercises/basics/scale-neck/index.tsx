"use client";

import { noteState, type Others, type Visibility } from "../../cues/visibility";
import { pickBox, type Placement } from "../../cues/placement";
import { useCallback, useMemo, useState } from "react";
import { PositionBox, ScaleNeck, cellKey } from "@/components/chordKit/ScaleNeck";
import { useNotePlayer } from "@/components/chordKit/useNotePlayer";
import { useLabelSystem } from "@/features/theory/useLabelSystem";
import { ChipRow, Chip, Hint } from "@/components/ui";
import { strum } from "@/lib/chordKit/playback";
import { positionTriads, stringGroupOf, voicingKeys } from "@/lib/chordKit/scaleChords";
import { STRING_GROUPS } from "@/lib/chordKit/triads";
import type { ScaleCell } from "@/lib/chordKit/scalePositions";
import { useCoverage } from "@/features/guide/useCoverage";
import { positionLine, type ScalePosition } from "@/lib/chordKit/scalePositions";
import { SHARP, scaleBoxes, shiftPosition } from "./boxes";
import { GuitarView } from "./Guitar";

type Part = "positions" | "neck";
type PartMode = "on" | "off" | "always";
export type Parts = Partial<Record<Part, PartMode>>;
const PART_LABELS: Record<Part, string> = { positions: "Positions", neck: "Neck" };
const BOXES_ONLY: Parts = { positions: "always" };
/** the strings a triad sits on, as a player says them */
const GROUP_WORDS: Record<string, string> = { "321": "G, B and high e", "432": "D, G and B", "543": "A, D and G", "654": "low E, A and D" };

/**
 * The scale's positions on the neck, only the boxes asked for, with any added notes played in them; tap a note to hear
 * it, ▶ to run the box up and down. `parts` adds the whole neck above them, the same notes in play on it and one
 * position framed (the only one shown, else the one whose name was tapped), and chips for the parts the student may
 * show or hide. `chords` (degrees of the key, 0-based) adds a chip per chord: pressing one rings that triad wherever the
 * shown positions hold it on the `chordStrings` set (the rest of the position faded), on the neck too, and strums it.
 */
function Boxes({ slug, pc, boxes, placement, add, enable, highlight, mute, hide: hidden, others, parts = BOXES_ONLY, chords, chordStrings }: { slug: string; pc: number; boxes?: number[]; placement?: Placement; add?: number[]; enable?: number[]; highlight?: number[]; mute?: number[]; hide?: number[]; others?: Others; parts?: Parts; chords?: number[]; chordStrings?: string }) {
  useCoverage({ hints: 1 });
  // the marks are semitones above the key; the states work on pitch classes
  const vis = useMemo((): Visibility => {
    const pcs = (semis?: number[]) => semis?.map((semi) => (pc + semi) % 12);
    return { enable: pcs(enable), highlight: pcs(highlight), mute: pcs(mute), hide: pcs(hidden), add, others };
  }, [pc, enable, highlight, mute, hidden, add, others]);
  const state = useCallback((p: number) => noteState(vis, p), [vis]);
  const litNames = [...new Set([...(vis.highlight ?? []), ...(add ?? [])])].filter((p) => state(p) === "highlighted").map((p) => SHARP[p]);
  const [system] = useLabelSystem();
  const { active, running, play, tap, stop } = useNotePlayer();
  const { title, ctx, cells: allCells, positions: allPositions } = useMemo(() => scaleBoxes(slug, pc, add), [slug, pc, add]);
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
  // the neck draws the scale's own notes (a pentatonic's five, not the mode it is cut from) and the added ones
  const neckCells = useMemo(() => {
    const own = new Set(allPositions.flatMap((p) => p.notes.map((c) => c.pc)));
    return cells.filter((c) => own.has(c.pc));
  }, [cells, allPositions]);
  // the chords of the key inside the shown positions, and the one picked, ringed on its places
  const group = stringGroupOf(chordStrings ?? "321") ?? STRING_GROUPS[3];
  const [picked, setPicked] = useState<number | null>(null);
  const inBoxes = useMemo(() => (chords?.length ? shown.map((p) => ({ number: p.number, triads: positionTriads(ctx, p, group, chords) })) : []), [chords, shown, ctx, group]);
  const chordChips = useMemo(() => (chords ?? []).flatMap((d) => {
    const all = inBoxes.flatMap((b) => b.triads.filter((t) => t.degree === d));
    return all.length ? [{ degree: d, name: all[0].name, roman: all[0].roman, voicings: all.flatMap((t) => t.voicings) }] : [];
  }), [chords, inBoxes]);
  const boxRings = useMemo(() => new Map(inBoxes.map((b) => [b.number, new Set(b.triads.filter((t) => t.degree === picked).flatMap((t) => t.voicings.flatMap(voicingKeys)))])), [inBoxes, picked]);
  const neckRings = useMemo(() => new Set(picked === null ? [] : positionTriads(ctx, { notes: neckCells }, group, [picked]).flatMap((t) => t.voicings.flatMap(voicingKeys))), [picked, ctx, neckCells, group]);
  const ringed = (rings: Set<string> | undefined, c: ScaleCell) => {
    const s = state(c.pc);
    if (picked === null || s === "hidden") return s;
    return rings?.has(cellKey(c)) ? "highlighted" : "muted";
  };
  const pickChord = (chip: (typeof chordChips)[number]) => {
    if (picked === chip.degree) return setPicked(null);
    setPicked(chip.degree);
    if (chip.voicings[0]) strum(chip.voicings[0].midi, { gapMs: 60, holdMs: 1600 });
  };
  const offered = (["positions", "neck"] as Part[]).filter((p) => parts[p]);
  const [open, setOpen] = useState<Record<Part, boolean>>({ positions: !!parts.positions && parts.positions !== "off", neck: !!parts.neck && parts.neck !== "off" });
  // the position framed on the neck: the one tapped, else the only one shown
  const [tapped, setTapped] = useState<number | null>(null);
  const focus = shown.find((p) => p.number === tapped) ?? (shown.length === 1 ? shown[0] : null);
  const canFocus = open.neck && shown.length > 1;
  const run = (p: ScalePosition) => {
    const up = positionLine(p).map((n) => ({ key: cellKey(n), midi: n.midi }));
    play([...up, ...up.slice(0, -1).reverse()], undefined, `box-${p.number}`);
  };
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-slate-400">{title}{litNames.length ? ` · ${litNames.join(" ")} lit` : ""}{boxes?.length ? ` · position${boxes.length > 1 ? "s" : ""} ${boxes.join(" & ")}` : ""}</p>
      {offered.some((p) => parts[p] !== "always") && (
        <div className="flex flex-wrap gap-1" role="group" aria-label="What is shown">
          {offered.map((p) => {
            const fixed = parts[p] === "always";
            return (
              <button key={p} type="button" aria-pressed={open[p]} aria-disabled={fixed || undefined} onClick={() => !fixed && setOpen((o) => ({ ...o, [p]: !o[p] }))} title={fixed ? `${PART_LABELS[p]} always show in this exercise` : undefined}
                className={`rounded-full border px-2.5 py-0.5 text-[11px] transition ${fixed ? "cursor-default border-sky-400/40 bg-sky-500/25 text-sky-100" : open[p] ? "border-sky-400/70 bg-sky-500/15 text-sky-100" : "border-slate-700 text-slate-500 hover:border-slate-500"}`}>
                {PART_LABELS[p]}
              </button>
            );
          })}
        </div>
      )}
      {chordChips.length > 0 && (
        <ChipRow label="Chords" info={`Chords of the key, inside the position, on the ${GROUP_WORDS[group.id]} strings. Press a chord to ring its notes and hear it. Press it again to see the whole position.`}>
          {chordChips.map((c) => (
            <Chip key={c.degree} on={picked === c.degree} onClick={() => pickChord(c)} title={`Ring ${c.name} in the position and hear it`}>{c.name} · {c.roman}</Chip>
          ))}
        </ChipRow>
      )}
      {open.neck && <ScaleNeck cells={neckCells} big={() => true} focus={focus} active={active} labelSystem={system} onNote={(c) => tap(cellKey(c), c.midi)} title={`${title} on the guitar neck`} states={(c) => ringed(neckRings, c)} />}
      {open.positions && <div data-tour="scale-neck-boxes" className="grid gap-3 lg:grid-cols-2">
        {shown.map((p) => (
          <div key={p.number} className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              {canFocus
                ? <button type="button" aria-pressed={focus?.number === p.number} onClick={() => setTapped(focus?.number === p.number ? null : p.number)} title="Frame it on the neck" className={`rounded px-1 hover:text-sky-300 ${focus?.number === p.number ? "text-sky-300" : ""}`}>Position {p.number}</button>
                : <span>Position {p.number}</span>}
              <Hint title="Play" description="Runs this position up and back down.">
                <button type="button" data-tour="scale-neck-play" onClick={() => (running === `box-${p.number}` ? stop() : run(p))} className="rounded border border-slate-700 px-2 py-0.5 text-[11px] text-slate-300 hover:border-slate-500">{running === `box-${p.number}` ? "■ Stop" : "▶ Play"}</button>
              </Hint>
            </div>
            <PositionBox position={p} cells={cells} rings active={active} labelSystem={system} onNote={(c) => tap(cellKey(c), c.midi)} states={(_, c) => ringed(boxRings.get(p.number), c)} />
          </div>
        ))}
      </div>}
    </div>
  );
}

type ViewProps = Parameters<typeof Boxes>[0] & { neck?: boolean; positions?: boolean };

/** The boxes alone or with `parts` (the plan's exercises), or with `neck` (or no boxes) the scales page's interactive guitar section. */
export function View({ neck, positions, ...rest }: ViewProps) {
  if (!rest.parts && (neck || positions === false)) return <GuitarView slug={rest.slug} pc={rest.pc} boxes={rest.boxes} neck={neck === true} positions={positions !== false} />;
  return <Boxes {...rest} />;
}
