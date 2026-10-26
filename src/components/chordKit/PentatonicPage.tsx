"use client";

import { fmtDegree, intervalName, scaleToneCaption, scaleToneLabel, solfege, type LabelSystem } from "@/features/theory/labels";
import { useLabelSystem } from "@/features/theory/useLabelSystem";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ColourKey, ScaleSettingsBar, UNDER_BAR, WithSettings } from "./ScaleSettings";
import KeySignature from "@/components/theory/KeySignature";
import { MODE_PAGES, degreeColour, DOT_INK } from "@/features/theory/scales";
import { ORDINALS } from "@/features/theory/theory";
import { PENTATONICS, findPentatonic, pentatonicContext, pentatonicSteps, samePentatonicNotes, type PentatonicContext, type PentatonicTone } from "@/features/theory/pentatonics";
import ScaleOnGuitar from "./ScaleOnGuitar";
import TuneButton from "./TuneButton";
import WheelCompare, { SHARED_RING, Peek, compareMark, modeChoice, modeGroups, pentatonicChoice, pentatonicGroup, type CompareChoice } from "./WheelCompare";
import { useNotePlayer, type NotePlayer } from "./useNotePlayer";
import { extraCells, pentatonicPositions, type ExtraNote } from "@/lib/chordKit/scalePositions";
import { generateMelody, melodyTiming } from "@/lib/chordKit/melody";
import { scaleHref } from "@/features/theory/keySlug";
import { Info } from "@/components/ui";

/** The pentatonic one octave up from the root nearest middle C and back, one MIDI note per step. */
export function pentatonicLineMidi(p: PentatonicContext): number[] {
  const root = 60 + p.host.tonic.pc;
  const up = [...p.steps.map((s) => root + s), root + 12];
  return [...up, ...up.slice(0, -1).reverse()];
}

/**
 * Play controls shared by the pentatonic page and its card on the index. Player keys are "<prefix>pc<pitch class>", which the
 * necks light too, so the blue ♯4 lights apart from the 4th whose colour it shares.
 */
export function pentatonicSounds(p: PentatonicContext, player: NotePlayer, prefix = "") {
  const line = pentatonicLineMidi(p);
  const root = 60 + p.host.tonic.pc;
  const key = (midi: number) => `${prefix}pc${midi % 12}`;
  // the melody's pool: every tone from the 5th below the root to the 5th above its octave, coloured by host degree
  const pool = [-1, 0, 1].flatMap((oct) => p.tones.map((t) => ({ midi: root + oct * 12 + t.semis, degree: t.degree }))).filter((n) => n.midi >= root - 5 && n.midi <= root + 19);
  return {
    line,
    tap: (i: number) => player.tap(`${prefix}${p.tones[i].key}`, line[i]),
    playScale: () => player.play(line.map((m) => ({ key: key(m), midi: m })), 240),
    playTune: (tuneId: string) =>
      player.playTimed(melodyTiming(generateMelody(pool, p.host.steps)).map((n) => ({ key: key(n.note.midi), midi: n.note.midi, ms: n.ms, velocity: n.velocity })), tuneId),
  };
}

/** A tone's label in the chosen system; the blue note is not in the host, so it is labelled from its own degree. */
export function toneLabel(system: LabelSystem, p: PentatonicContext, t: PentatonicTone): string {
  if (!t.blue) return scaleToneLabel(system, p.host, t.degree);
  return system === "note" ? t.name : system === "interval" ? intervalName(t.semis) : system === "solfege" ? solfege(t.label) : fmtDegree(t.label);
}

/** The second line under a tone's dot: its degree when the dot shows names, otherwise its name. */
export function toneCaption(system: LabelSystem, p: PentatonicContext, t: PentatonicTone): string {
  if (!t.blue) return scaleToneCaption(system, p.host, t.degree);
  return system === "note" ? fmtDegree(t.label) : t.name;
}

/** The blue note as an extra note for the neck, if the scale has one. */
export function blueNote(p: PentatonicContext): ExtraNote | undefined {
  const t = p.tones.find((x) => x.blue);
  return t && { degree: t.degree, semi: t.semis, name: t.name, degreeText: t.label };
}

/** "plus the blue ♯4 (D♯)", or nothing. */
export const blueText = (p: PentatonicContext) => {
  const t = p.tones.find((x) => x.blue);
  return t ? `, and adds the blue note, ${fmtDegree(t.label)} (${t.name})` : "";
};

/** Which host notes a pentatonic leaves out: "its 4th (A) and 7th (D♯)". */
export const leftOut = (p: PentatonicContext) =>
  [0, 1, 2, 3, 4, 5, 6].filter((d) => !p.degrees.includes(d)).map((d) => `${ORDINALS[d]} (${p.host.names[d]})`).join(" and ");

const BASIC_PENTATONICS = PENTATONICS.filter((s) => s.basic).map(pentatonicChoice);

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
  const blue = useMemo(() => blueNote(p), [p]);
  const guitar = useMemo(() => pentatonicPositions(host, p.degrees, blue), [host, p.degrees, blue]);
  const extra = useMemo(() => (blue ? extraCells(host, blue) : undefined), [host, blue]);
  const hostPage = MODE_PAGES.find((m) => m.familyIndex === 0 && m.modeIndex === scale.host)!;

  const [system] = useLabelSystem();
  // the scale hovered under the wheel: the notes, degrees, step pattern and wheel all show it
  const [cmp, setCmp] = useState<CompareChoice | null>(null);
  const player = useNotePlayer();
  const { tap, playScale, playTune } = pentatonicSounds(p, player);
  const activeTone = p.tones.findIndex((t) => t.key === player.active);

  return (
    <WithSettings side={syncUrl} bar={<ScaleSettingsBar tonicPc={tonicPc} onTonic={setTonicPc} side={syncUrl} config={{ scale: syncUrl ? { slug } : undefined }} />}>
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
            {p.tones.map((t, i) => {
              const mark = compareMark(p.steps, i, cmp);
              return (
                <button key={t.key} type="button" onClick={() => tap(i)} title={`${t.name}${t.blue ? " (the blue note)" : ""}: tap to hear it`} className="cursor-sound relative flex flex-col items-center gap-0.5 rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400">
                  <span className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-semibold transition ${activeTone === i ? "scale-110 ring-[3px] ring-sky-400" : ""} ${mark.shared ? SHARED_RING : ""}`} style={{ background: degreeColour(t.degree), color: DOT_INK }}>{toneLabel(system, p, t)}</span>
                  <span className="text-xs tabular-nums text-slate-500">{toneCaption(system, p, t)}</span>
                  {mark.theirs && <span className="pointer-events-none absolute -top-3 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-md border border-slate-700 bg-slate-900/95 px-1 text-[9px] leading-4 text-slate-300">vs {mark.theirs}</span>}
                </button>
              );
            })}
            <button type="button" onClick={playScale} className="cursor-sound ml-2 rounded-full border border-emerald-500 bg-emerald-500/15 px-3 py-1 text-xs text-emerald-100 hover:bg-emerald-500/25">▶ Play scale</button>
            <TuneButton onPlay={playTune} title="A short tune made from this scale, new every time" className="rounded-full border border-emerald-500 bg-emerald-500/15 px-3 py-1 text-xs text-emerald-100 hover:bg-emerald-500/25" />
          </div>
          <KeySignature ctx={host} />
          <p className="text-xs text-slate-400">
            Degrees <Peek text={cmp && `${cmp.label}: ${cmp.degrees.map(fmtDegree).join(" ")} · ${cmp.pattern.join(" – ")}`}><span className="tabular-nums text-slate-300">{p.formula.map(fmtDegree).join(" ")}</span></Peek>
            <span className="mx-2 text-slate-600">·</span>
            Step pattern <span className="tabular-nums text-slate-300">{pentatonicSteps(p.steps).join(" – ")}</span>
            <Info label="What is the step pattern?">W is a whole step (two frets), H a half step (one fret), W+H three frets and 2W four. Five notes to the octave leave gaps bigger than a whole step, which is what makes a pentatonic sound open.</Info>
          </p>
          <ul className="space-y-1 text-xs text-slate-400">
            <li>
              Cut from <Link className="text-sky-300 hover:underline" href={scaleHref(hostPage.slug, tonicPc)}>{host.names[0]} {host.modeName}</Link>: leave out its {leftOut(p)}{blueText(p)}.
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
        {/* the notes on the ring of twelve, another scale dashed behind: at first the seven-note mode it is cut from */}
        <WheelCompare
          steps={p.steps}
          degrees={p.formula}
          wheelDegrees={p.tones.map((t) => t.degree)}
          labels={p.tones.map((t) => toneLabel(system, p, t))}
          active={activeTone >= 0 ? activeTone : null}
          onNote={tap}
          onCompare={setCmp}
          pills={[modeChoice(hostPage, `${hostPage.name} (parent)`), ...BASIC_PENTATONICS.filter((c) => c.id !== slug)]}
          groups={[pentatonicGroup([slug, ...BASIC_PENTATONICS.map((c) => c.id)]), ...modeGroups([hostPage.slug])]}
        />
      </div>

      <ScaleOnGuitar
        ctx={host}
        player={player}
        only={{ pent: { name: p.title, degrees: p.degrees, formula: p.formula }, positions: guitar.positions, boxes: guitar.boxes, title: p.title, names: p.names, extra }}
      />
    </WithSettings>
  );
}
