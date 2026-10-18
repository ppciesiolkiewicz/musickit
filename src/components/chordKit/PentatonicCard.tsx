"use client";

import { useMemo } from "react";
import Link from "next/link";
import { fmtDegree, type LabelSystem } from "@/features/theory/labels";
import { DOT_INK, degreeColour } from "@/features/theory/scales";
import { pentatonicContext, pentatonicSteps, samePentatonicNotes, type PentatonicScale } from "@/features/theory/pentatonics";
import { extraCells, scaleCells } from "@/lib/chordKit/scalePositions";
import { scaleHref } from "@/features/theory/keySlug";
import { ScaleNeck } from "./ScaleNeck";
import TuneButton from "./TuneButton";
import type { NotePlayer } from "./useNotePlayer";
import { blueNote, blueText, leftOut, pentatonicSounds, toneCaption, toneLabel } from "./PentatonicPage";

/** One pentatonic on the scales index, like a mode's card: its notes, Play, the first 12 frets, and where it comes from. */
export default function PentatonicCard({ scale, tonicPc, player, system, onOpen }: {
  scale: PentatonicScale;
  tonicPc: number;
  /** the page's one player; this card's keys are "<slug>:pc<pitch class>" */
  player: NotePlayer;
  system: LabelSystem;
  onOpen: (e: React.MouseEvent, href: string) => void;
}) {
  const p = useMemo(() => pentatonicContext(tonicPc, scale), [tonicPc, scale]);
  const cells = useMemo(() => {
    const blue = blueNote(p);
    return [...scaleCells(p.host, 12).filter((c) => p.degrees.includes(c.degree)), ...(blue ? extraCells(p.host, blue, 12) : [])];
  }, [p]);
  const same = useMemo(() => samePentatonicNotes(tonicPc, scale), [tonicPc, scale]);
  const { host } = p;
  const prefix = `${scale.slug}:`;
  const { tap, playScale, playTune } = pentatonicSounds(p, player, prefix);
  const active = player.active?.startsWith(prefix) ? player.active.slice(prefix.length) : null;
  const href = scaleHref(scale.slug, tonicPc);

  return (
    <article onClick={(e) => onOpen(e, href)} className="group/card flex min-w-0 cursor-pointer flex-col gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-2.5 transition hover:border-sky-400/60">
      <header>
        <Link href={href} className="group flex flex-wrap items-baseline gap-x-2 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400">
          <h3 className="text-base text-slate-100 group-hover:text-sky-300 group-hover:underline group-hover/card:text-sky-300">{p.title}{scale.alias && <span> ({scale.alias})</span>}</h3>
          <span className="text-xs text-slate-500 group-hover:text-slate-300">{scale.mood}</span>
        </Link>
      </header>

      <div className="flex flex-wrap items-end gap-1.5" aria-label={`Notes of ${p.title}`}>
        {p.tones.map((t, i) => (
          <button key={t.key} type="button" onClick={() => tap(i)} title={`${t.name}${t.blue ? " (the blue note)" : ""}: tap to hear it`} className="cursor-sound flex flex-col items-center gap-0.5 rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400">
            <span className="text-xs tabular-nums text-slate-400">{toneCaption(system, p, t)}</span>
            <span className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold transition ${active === t.key ? "scale-110 ring-[3px] ring-sky-400" : ""}`} style={{ background: degreeColour(t.degree), color: DOT_INK }}>{toneLabel(system, p, t)}</span>
          </button>
        ))}
        <button type="button" onClick={playScale} className="cursor-sound mb-1 ml-1 rounded-full border border-emerald-500 bg-emerald-500/15 px-3 py-1 text-xs text-emerald-100 hover:bg-emerald-500/25">▶ Play</button>
        <TuneButton onPlay={playTune} title="A short tune made from this scale, new every time" className="mb-1 rounded-full border border-emerald-500 bg-emerald-500/15 px-3 py-1 text-xs text-emerald-100 hover:bg-emerald-500/25" />
      </div>

      <ScaleNeck
        compact cells={cells} big={() => true} active={active} labelSystem={system}
        onNote={(c) => player.tap(`${prefix}d${c.degree}`, c.midi)}
        title={`${p.title} on the first 12 frets`}
      />

      <p className="text-xs text-slate-400">
        Degrees <span className="tabular-nums text-slate-300">{p.formula.map(fmtDegree).join(" ")}</span>
        <span className="mx-2 text-slate-600">·</span>
        Steps <span className="tabular-nums text-slate-300">{pentatonicSteps(p.steps).join(" ")}</span>
      </p>

      <ul className="space-y-1 text-xs text-slate-300">
        <li>Cut from <b>{host.names[0]} {host.modeName}</b> <span className="text-slate-500">(leaves out its {leftOut(p)}{blueText(p)})</span></li>
        {same.length > 0 && (
          <li className="text-slate-400">
            Same notes as{" "}
            {same.map((s, i) => (
              <span key={s.scale.slug} className="whitespace-nowrap">
                <Link className="text-sky-300 hover:underline" href={scaleHref(s.scale.slug, s.tonicPc)}>{pentatonicContext(s.tonicPc, s.scale).title}</Link>
                {i < same.length - 1 ? ", " : ""}
              </span>
            ))}
          </li>
        )}
      </ul>

      <div className="mt-auto flex flex-wrap gap-2">
        <Link href={scaleHref(scale.slug, tonicPc, "#guitar")} className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300 transition hover:border-sky-400 hover:text-sky-100">
          Positions on the neck →
        </Link>
      </div>
    </article>
  );
}
