"use client";

import { useMemo, useState } from "react";
import { chordNoteLabel } from "@/features/theory/labels";
import { useLabelSystem } from "@/features/theory/useLabelSystem";
import type { KeyContext } from "@/features/theory/theory";
import { chordMidi, modeChords, degreeColour, roleWithDegree, DOT_INK } from "@/features/theory/scales";
import { strum } from "@/lib/chordKit/playback";
import ChordShapeCarousel from "./ChordShapeCarousel";
import ChordShapesModal from "./ChordShapesModal";
import ChordProgressionModal from "./ChordProgressionModal";
import { Chip, Info } from "@/components/ui";

const STACK_LABELS = ["root", "3rd", "5th", "7th", "9th", "11th", "13th"];

/** "Every chord in the key": each degree's triad and seventh, its notes, a shape to play it, and links to its progressions and shapes. */
export default function ScaleChords({ ctx, className = "" }: { ctx: KeyContext; className?: string }) {
  const [extended, setExtended] = useState(false);
  const [playing, setPlaying] = useState<number | null>(null);
  const [modalDegree, setModalDegree] = useState<number | null>(null);
  const [progDegree, setProgDegree] = useState<number | null>(null);
  const chords = useMemo(() => modeChords(ctx), [ctx]);
  const colour = (n: { scaleDegree: number }) => degreeColour(n.scaleDegree);
  const [system] = useLabelSystem();
  const play = (d: number) => {
    strum(chordMidi(ctx, d, extended ? 7 : 4), { gapMs: 70, holdMs: 1600 });
    setPlaying(d);
    setTimeout(() => setPlaying((p) => (p === d ? null : p)), 700);
  };

  return (
    <>
      <section id="chords" className={`rounded-2xl border border-slate-800 bg-slate-900/40 p-2.5 ${className}`}>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-medium text-slate-100">Every chord in {ctx.names[0]} {ctx.modeName}</h2>
          <span className="ml-auto flex flex-wrap items-center gap-1.5">
            <Chip on={extended} onClick={() => setExtended((v) => !v)}>Show 9 · 11 · 13</Chip>
            <Info label="What are 9, 11 and 13?">Keep stacking every other note of the scale above the 7th and you get the 9th, 11th and 13th. They are the same notes as the 2nd, 4th and 6th, one octave up. Jazz and funk chords use them for colour.</Info>
          </span>
        </div>

        {/* two rows side by side on wide screens, so the shape sits next to its notes instead of across the page */}
        <ul className="grid gap-2 xl:grid-cols-2">
          {chords.map((c) => {
            const shown = extended ? c.notes : c.notes.slice(0, 4);
            return (
              <li key={c.degree} className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/40 p-2">
                <div className="flex min-w-0 flex-1 basis-60 flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => play(c.degree)}
                    title="Tap to hear it"
                    className={`cursor-sound flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border px-3 py-2.5 text-left transition hover:border-slate-600 ${playing === c.degree ? "border-sky-400 bg-slate-800/80" : "border-transparent"}`}
                  >
                    <span className="w-12 shrink-0 text-lg font-light text-sky-300">{c.roman}</span>
                    <span className="min-w-[8rem]">
                      <span className="block text-sm font-medium text-slate-100">{c.seventhName}</span>
                      <span className="block text-xs text-slate-500">triad {c.triadName}</span>
                    </span>
                    <span className="flex flex-wrap gap-1.5">
                      {shown.map((n) => (
                        <span key={n.role + n.name} className="flex flex-col items-center">
                          <span className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold" style={{ background: colour(n), color: DOT_INK }} title={n.name}>{chordNoteLabel(system, ctx, n)}</span>
                          <span className="text-[10px] text-slate-500">{system === "note" ? roleWithDegree(n.role) : n.name}</span>
                        </span>
                      ))}
                    </span>
                  </button>
                  <span className="flex gap-3 px-3 text-xs">
                    <button type="button" onClick={() => setProgDegree(c.degree)} className="text-sky-300 hover:underline">Progression →</button>
                    <button type="button" onClick={() => setModalDegree(c.degree)} className="text-sky-300 hover:underline">All shapes →</button>
                  </span>
                </div>
                <ChordShapeCarousel ctx={ctx} degree={c.degree} />
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-xs text-slate-500">
          Each chord stacks every other note of the scale ({STACK_LABELS.slice(0, extended ? 7 : 4).join(", ")}). Tap a row to hear it.
        </p>
      </section>
      {progDegree !== null && <ChordProgressionModal ctx={ctx} degree={progDegree} onClose={() => setProgDegree(null)} />}
      {modalDegree !== null && <ChordShapesModal ctx={ctx} degree={modalDegree} onClose={() => setModalDegree(null)} />}
    </>
  );
}
