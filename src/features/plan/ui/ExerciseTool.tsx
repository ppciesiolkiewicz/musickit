"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useRef, useState } from "react";
import ChordDiagram from "@/components/chordKit/ChordDiagram";
import { PositionBox, cellKey } from "@/components/chordKit/ScaleNeck";
import { useNotePlayer } from "@/components/chordKit/useNotePlayer";
import { useMicPitch } from "@/components/practice/useMicPitch";
import MicButton from "@/components/theory/singing/MicButton";
import SingingStaff from "@/components/theory/singing/SingingStaff";
import { getSharedPiano, wakeAudio } from "@/features/sound";
import { useLabelSystem } from "@/features/theory/useLabelSystem";
import { findPentatonic, pentatonicContext } from "@/features/theory/pentatonics";
import { findModePage } from "@/features/theory/scales";
import { makeKeyContext, type KeyContext } from "@/features/theory/theory";
import { VOICES, buildLadder, clefFor, hzToMidi } from "@/features/theory/singing";
import { createSmoother, type Pitch } from "@/features/tuner/pitch";
import { parseChordQuery } from "@/lib/chordKit/chordSearch";
import { shapesForTones } from "@/lib/chordKit/chordShapes";
import { strumShape } from "@/lib/chordKit/playback";
import { extraCells, pentatonicPositions, positionLine, positionsFor, scaleCells, type ExtraNote, type ScaleCell, type ScalePosition } from "@/lib/chordKit/scalePositions";
import { parseEarSettings } from "@/lib/practice/earGame";
import { parseNoteSettings } from "@/lib/practice/noteGame";
import type { PlanTool } from "../model/tools";

// the games and the band carry their own sound engines: loaded only when an exercise shows them
const loading = () => <p className="p-3 text-sm text-slate-500">Loading…</p>;
const NoteGame = dynamic(() => import("@/components/practice/NoteGame"), { ssr: false, loading });
const EarGame = dynamic(() => import("@/components/practice/EarGame"), { ssr: false, loading });
const PracticeBand = dynamic(() => import("@/features/instruments").then((m) => m.PracticeBand), { ssr: false, loading });

/** One tool of an exercise, as the AI set it up: the thing to play with and nothing to configure. */
export default function ExerciseTool({ tool }: { tool: PlanTool }) {
  switch (tool.type) {
    case "scale":
      return <ScaleBoxes slug={tool.scale} pc={tool.key} boxes={tool.boxes} add={tool.add} />;
    case "chords":
      return <ChordShapes chords={tool.chords} />;
    case "sing":
      return <SingNotes slug={tool.scale} pc={tool.key} voice={tool.voice} />;
    case "band":
      return <PracticeBand bpm={tool.bpm} keyPc={tool.key} parts={tool.parts} />;
    case "notes":
      return <NoteGame initial={parseNoteSettings(new URLSearchParams(tool.query))} syncUrl={false} bare />;
    case "ears":
      return <EarGame initial={parseEarSettings(new URLSearchParams(tool.query))} syncUrl={false} bare />;
  }
}

const SHARP = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];
const SEMI_TEXT = ["1", "♭2", "2", "♭3", "3", "4", "♯4", "5", "♭6", "6", "♭7", "7"];

/** A note from outside the scale, as an extra note of `ctx`: coloured as the scale degree just under it. */
function addedNote(ctx: KeyContext, pc: number): ExtraNote {
  const semi = (pc - ctx.tonic.pc + 12) % 12;
  const below = ctx.steps.map((s, d) => [s, d] as const).filter(([s]) => s <= semi).pop();
  return { degree: below ? below[1] : 0, semi, name: SHARP[pc], degreeText: SEMI_TEXT[semi] };
}

/**
 * The scale's positions on the neck, only the boxes asked for, with any added notes played in them; tap a note to hear
 * it, ▶ to run the box up and down.
 */
function ScaleBoxes({ slug, pc, boxes, add }: { slug: string; pc: number; boxes?: number[]; add?: number[] }) {
  const [system] = useLabelSystem();
  const { active, play, tap } = useNotePlayer();
  const { title, cells, positions } = useMemo(() => {
    const pent = findPentatonic(slug);
    let base: { title: string; ctx: KeyContext; cells: ScaleCell[]; positions: ScalePosition[] };
    if (pent) {
      const p = pentatonicContext(pc, pent);
      const t = p.tones.find((x) => x.blue);
      const blue = t && { degree: t.degree, semi: t.semis, name: t.name, degreeText: t.label };
      base = { title: p.title, ctx: p.host, cells: [...scaleCells(p.host), ...(blue ? extraCells(p.host, blue) : [])], positions: pentatonicPositions(p.host, p.degrees, blue).positions };
    } else {
      const m = findModePage(slug)!;
      const ctx = makeKeyContext(pc, m.familyIndex, m.modeIndex);
      base = { title: `${ctx.names[0]} ${ctx.modeName}`, ctx, cells: scaleCells(ctx), positions: positionsFor(ctx, "scale") };
    }
    if (!add?.length) return base;
    // added notes are played: each goes into every box wherever it falls inside the box's frets
    const added = add.flatMap((n) => extraCells(base.ctx, addedNote(base.ctx, n)));
    const positions = base.positions.map((p) => {
      const from = p.from <= 1 ? 0 : p.from;
      const have = new Set(p.notes.map(cellKey));
      return { ...p, notes: [...p.notes, ...added.filter((c) => c.fret >= from && c.fret <= p.to && !have.has(cellKey(c)))] };
    });
    return { title: `${base.title} + ${add.map((n) => SHARP[n]).join(", ")}`, cells: [...base.cells, ...added], positions };
  }, [slug, pc, add]);
  const shown = boxes?.length ? positions.filter((p) => boxes.includes(p.number)) : positions;
  const run = (p: ScalePosition) => {
    const up = positionLine(p).map((n) => ({ key: cellKey(n), midi: n.midi }));
    play([...up, ...up.slice(0, -1).reverse()]);
  };
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-slate-400">{title}{boxes?.length ? ` · box${boxes.length > 1 ? "es" : ""} ${boxes.join(" & ")}` : ""}</p>
      <div className="grid gap-3 lg:grid-cols-2">
        {shown.map((p) => (
          <div key={p.number} className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <span>Box {p.number}</span>
              <button type="button" onClick={() => run(p)} className="rounded border border-slate-700 px-2 py-0.5 text-[11px] text-slate-300 hover:border-slate-500">▶ Play</button>
            </div>
            <PositionBox position={p} cells={cells} rings active={active} labelSystem={system} onNote={(c) => tap(cellKey(c), c.midi)} />
          </div>
        ))}
      </div>
    </div>
  );
}

/** One easy shape per chord, in order; tap a box to strum it. */
function ChordShapes({ chords }: { chords: string[] }) {
  const shapes = useMemo(
    () => chords.flatMap((name) => {
      const q = parseChordQuery(name);
      const c = q && shapesForTones(q.rootPc, q.semis, ["easy", "medium", "hard"]).find((r) => r.full)?.choice;
      return c ? [{ name, c }] : [];
    }),
    [chords],
  );
  return (
    <div className="flex flex-wrap gap-3">
      {shapes.map(({ name, c }, i) => (
        <div key={`${name}-${i}`} className="flex w-36 flex-col items-center gap-1">
          <span className="text-sm text-slate-100">{name}</span>
          <ChordDiagram shape={c.shape} rootFret={c.fret} onPlay={() => strumShape(c.shape, c.fret)} />
        </div>
      ))}
    </div>
  );
}

/** frames without a pitch before the dot on the staff goes away */
const GAP_FRAMES = 6;

/** The scale on a staff in the voice's range, with the microphone's pitch drawn on it; tap a note to hear it. */
function SingNotes({ slug, pc, voice }: { slug: string; pc: number; voice: keyof typeof VOICES }) {
  const range = VOICES[voice];
  const ladder = useMemo(() => buildLadder(slug, pc, range), [slug, pc, range]);
  const [mic, setMic] = useState(false);
  const [played, setPlayed] = useState<number | null>(null);
  const pitch = useRef<number | null>(null);
  const smoother = useRef(createSmoother());
  const gaps = useRef(0);
  const onPitch = useCallback((p: Pitch | null) => {
    if (!p) {
      if (++gaps.current >= GAP_FRAMES) {
        pitch.current = null;
        smoother.current.reset();
      }
      return;
    }
    gaps.current = 0;
    pitch.current = hzToMidi(smoother.current.push(p));
  }, []);
  const { status } = useMicPitch(mic, undefined, onPitch);
  if (!ladder) return null;
  const tap = async (i: number) => {
    await wakeAudio();
    const midi = ladder.notes[i].midi;
    const piano = getSharedPiano();
    piano.noteOn(midi);
    setPlayed(i);
    setTimeout(() => {
      piano.noteOff(midi);
      setPlayed((p) => (p === i ? null : p));
    }, 700);
  };
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
        <MicButton on={mic} onClick={() => { pitch.current = null; setMic((v) => !v); }} offLabel="Sing with the mic" />
        <span>{ladder.title} · {VOICES[voice].label}{status === "denied" ? " · microphone blocked in the browser" : ""}</span>
      </div>
      <SingingStaff ladder={ladder} clef={clefFor(range)} pitch={pitch} played={played} onNote={(i) => void tap(i)} />
    </div>
  );
}
