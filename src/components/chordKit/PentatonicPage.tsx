"use client";

import { fmtDegree, scaleToneCaption, scaleToneLabel } from "@/features/theory/labels";
import { useLabelSystem } from "@/features/theory/useLabelSystem";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ColourKey, ScaleSettingsBar, UNDER_BAR, WithSettings } from "./ScaleSettings";
import KeySignature from "@/components/theory/KeySignature";
import ScaleWheel from "@/components/theory/ScaleWheel";
import { MODE_PAGES, degreeColour, DOT_INK } from "@/features/theory/scales";
import { ORDINALS } from "@/features/theory/theory";
import { findPentatonic, pentatonicContext, pentatonicSteps, samePentatonicNotes, type PentatonicContext } from "@/features/theory/pentatonics";
import ScaleOnGuitar from "./ScaleOnGuitar";
import TuneButton from "./TuneButton";
import { useNotePlayer, type NotePlayer } from "./useNotePlayer";
import { pentatonicPositions } from "@/lib/chordKit/scalePositions";
import { generateMelody, melodyTiming, scalePool } from "@/lib/chordKit/melody";
import { scaleHref } from "@/features/theory/keySlug";
import { Info } from "@/components/ui";

/** The pentatonic one octave up from the root nearest middle C and back, one MIDI note per step. */
export function pentatonicLineMidi(p: PentatonicContext): number[] {
  const root = 60 + p.host.tonic.pc;
  const up = [...p.steps.map((s) => root + s), root + 12];
  return [...up, ...up.slice(0, -1).reverse()];
}

/**
 * Play controls shared by the pentatonic page and its card on the index. Player keys are "<prefix>d<degree>" with the host's
 * degree, so the necks (which light "d<degree>") follow along.
 */
export function pentatonicSounds(p: PentatonicContext, player: NotePlayer, prefix = "") {
  const line = pentatonicLineMidi(p);
  const hostDegree = (midi: number) => p.host.steps.indexOf((midi - p.host.tonic.pc + 120) % 12);
  const keep = new Set(p.degrees);
  return {
    line,
    tap: (i: number) => player.tap(`${prefix}d${p.degrees[i]}`, line[i]),
    playScale: () => player.play(line.map((m) => ({ key: `${prefix}d${hostDegree(m)}`, midi: m })), 240),
    playTune: (tuneId: string) =>
      player.playTimed(
        melodyTiming(generateMelody(scalePool(60 + p.host.tonic.pc, p.host.steps).filter((n) => keep.has(n.degree)), p.host.steps))
          .map((n) => ({ key: `${prefix}d${n.note.degree}`, midi: n.note.midi, ms: n.ms, velocity: n.velocity })),
        tuneId,
      ),
  };
}

/** Which host notes a pentatonic leaves out: "its 4th (A) and 7th (D♯)". */
export const leftOut = (p: PentatonicContext) =>
  [0, 1, 2, 3, 4, 5, 6].filter((d) => !p.degrees.includes(d)).map((d) => `${ORDINALS[d]} (${p.host.names[d]})`).join(" and ");

/** Dedicated page for one pentatonic in a key: its notes, where it comes from, the scales with the same notes, and the guitar. */
export default function PentatonicPage({ slug, initialKey, syncUrl = true }: { slug: string; initialKey: number; syncUrl?: boolean }) {
  const [tonicPc, setTonicPc] = useState(initialKey);
  useEffect(() => {
    if (!syncUrl) return;
    try {
      window.history.replaceState(null, "", scaleHref(slug, tonicPc, window.location.hash));
    } catch {
      /* ignore */
    }
  }, [slug, tonicPc, syncUrl]);

  const scale = findPentatonic(slug)!;
  const p = useMemo(() => pentatonicContext(tonicPc, scale), [tonicPc, scale]);
  const { host } = p;
  const same = useMemo(() => samePentatonicNotes(tonicPc, scale), [tonicPc, scale]);
  const guitar = useMemo(() => pentatonicPositions(host, p.degrees), [host, p.degrees]);
  const hostPage = MODE_PAGES.find((m) => m.familyIndex === 0 && m.modeIndex === scale.host)!;

  const [system] = useLabelSystem();
  const player = useNotePlayer();
  const { tap, playScale, playTune } = pentatonicSounds(p, player);
  const activeDegree = player.active?.startsWith("d") ? Number(player.active.slice(1)) : null;

  return (
    <WithSettings side={syncUrl} bar={<ScaleSettingsBar tonicPc={tonicPc} onTonic={setTonicPc} scale={syncUrl ? slug : undefined} side={syncUrl} />}>
      <ColourKey>
        Colour shows the job a note does in the key, not how high it is. A pentatonic keeps the numbers of the seven-note scale it is cut from, so its 5th is the blue 5th even though it is the 4th note it plays. The 1st degree (home) is white, the 3rd amber, the 5th blue and the 7th rose; the 2nd, 4th and 6th are teal, lime and violet. A flattened or raised note keeps the colour of its degree.
      </ColourKey>

      <div id="scale-notes" className={`grid gap-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-2.5 md:grid-cols-[minmax(0,1fr)_auto] ${UNDER_BAR}`}>
        <div className="flex min-w-0 flex-col gap-3">
          <h2 className="text-2xl font-light tracking-wide text-slate-100">
            {p.title}
            {scale.alias && <span> ({scale.alias})</span>}
          </h2>
          <p className="text-sm text-slate-300">{scale.char} <span className="text-slate-400">{scale.mood}</span></p>
          <p className="text-xs text-slate-400"><b className="text-slate-300">Where you hear it:</b> {scale.use}</p>

          <div className="flex flex-wrap items-center gap-2" aria-label="Scale notes">
            {p.degrees.map((d, i) => (
              <button key={d} type="button" onClick={() => tap(i)} title={`${p.names[i]}: tap to hear it`} className="cursor-sound flex flex-col items-center gap-0.5 rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400">
                <span className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-semibold transition ${activeDegree === d ? "scale-110 ring-[3px] ring-sky-400" : ""}`} style={{ background: degreeColour(d), color: DOT_INK }}>{scaleToneLabel(system, host, d)}</span>
                <span className="text-xs tabular-nums text-slate-500">{scaleToneCaption(system, host, d)}</span>
              </button>
            ))}
            <button type="button" onClick={playScale} className="cursor-sound ml-2 rounded-full border border-emerald-500 bg-emerald-500/15 px-3 py-1 text-xs text-emerald-100 hover:bg-emerald-500/25">▶ Play scale</button>
            <TuneButton onPlay={playTune} title="A short tune made from this scale, new every time" className="rounded-full border border-emerald-500 bg-emerald-500/15 px-3 py-1 text-xs text-emerald-100 hover:bg-emerald-500/25" />
          </div>
          <KeySignature ctx={host} />
          <p className="text-xs text-slate-400">
            Degrees <span className="tabular-nums text-slate-300">{p.formula.map(fmtDegree).join(" ")}</span>
            <span className="mx-2 text-slate-600">·</span>
            Step pattern <span className="tabular-nums text-slate-300">{pentatonicSteps(p.steps).join(" – ")}</span>
            <Info label="What is the step pattern?">W is a whole step (two frets), H a half step (one fret), W+H three frets and 2W four. Five notes to the octave leave gaps bigger than a whole step, which is what makes a pentatonic sound open.</Info>
          </p>
          <ul className="space-y-1 text-xs text-slate-400">
            <li>
              Cut from <Link className="text-sky-300 hover:underline" href={scaleHref(hostPage.slug, tonicPc)}>{host.names[0]} {host.modeName}</Link>: leave out its {leftOut(p)}.
              <Info label="Why the mode it is cut from?">Every pentatonic here is five of the seven notes of a mode of the major scale. Playing it over that mode&apos;s chords always fits, and adding the two missing notes back turns it into the full mode.</Info>
            </li>
            {same.length > 0 && (
              <li>
                Same five notes:{" "}
                {same.map((s, i) => (
                  <span key={s.scale.slug} className="whitespace-nowrap">
                    <Link className="text-sky-300 hover:underline" href={scaleHref(s.scale.slug, s.tonicPc)}>{pentatonicContext(s.tonicPc, s.scale).title}</Link>
                    {i < same.length - 1 ? ", " : ""}
                  </span>
                ))}
              </li>
            )}
          </ul>
        </div>
        {/* the five notes on the ring of twelve, the seven of the mode they come from dashed behind */}
        <figure className="flex flex-col items-center gap-1 self-center justify-self-center">
          <ScaleWheel
            steps={p.steps}
            degrees={p.degrees}
            labels={p.degrees.map((d) => scaleToneLabel(system, host, d))}
            compare={host.steps}
            active={activeDegree !== null && p.degrees.includes(activeDegree) ? p.degrees.indexOf(activeDegree) : null}
            onNote={tap}
            size={220}
          />
          <figcaption className="max-w-[14rem] text-center text-[11px] text-slate-500">Dashed: {host.names[0]} {host.modeName}, the seven notes it is cut from.</figcaption>
        </figure>
      </div>

      <ScaleOnGuitar
        ctx={host}
        player={player}
        only={{ pent: { name: p.title, degrees: p.degrees, formula: p.formula }, positions: guitar.positions, boxes: guitar.boxes, title: p.title }}
      />
    </WithSettings>
  );
}
