"use client";

import { scaleToneCaption, scaleToneLabel } from "@/features/theory/labels";
import { useLabelSystem } from "@/features/theory/useLabelSystem";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ColourKey, ModeAlias, ScaleSettingsBar, UNDER_BAR, WithSettings } from "./ScaleSettings";
import KeySignature from "@/components/theory/KeySignature";
import { FAMILIES, makeKeyContext } from "@/features/theory/theory";
import { MODE_PAGES, type NoteSwap, degreeColour, degreeLabels, relativesOf, stepPattern, DOT_INK } from "@/features/theory/scales";
import ChordBubbles from "./ChordBubbles";
import ScaleChords from "./ScaleChords";
import ScaleProgressions from "./ScaleProgressions";
import ScaleRelatives from "./ScaleRelatives";
import ScaleOnGuitar from "./ScaleOnGuitar";
import TuneButton from "./TuneButton";
import WheelCompare, { MAJOR_MODE_CHOICES, SHARED_RING, Peek, compareMark, modeGroups, pentatonicGroup, type CompareChoice } from "./WheelCompare";
import { useNotePlayer } from "./useNotePlayer";
import { scaleLineMidi } from "@/lib/chordKit/scalePositions";
import { generateMelody, melodyTiming, scalePool } from "@/lib/chordKit/melody";
import { scaleHref } from "@/features/theory/keySlug";
import { Info } from "@/components/ui";

/** "♯3 G → G♯, ♯4 A → A♯": which note of the reference scale each altered degree replaces. */
function Swaps({ swaps }: { swaps: NoteSwap[] }) {
  return (
    <>
      {swaps.map((w, i) => (
        <span key={w.degree} className="whitespace-nowrap">
          <b className="text-slate-200">{w.degree}</b> <span className="text-slate-300">{w.from} → {w.to}</span>{i < swaps.length - 1 ? ", " : ""}
        </span>
      ))}
    </>
  );
}


/** Dedicated page for one mode: key picker, relatives, and every chord with its notes coloured by scale degree. */
export default function ScalePage({ familyIndex, modeIndex, initialKey, syncUrl = true }: { familyIndex: number; modeIndex: number; initialKey: number; /** write the key to the address bar (off when embedded in another page) */ syncUrl?: boolean }) {
  const [tonicPc, setTonicPc] = useState(initialKey);

  const slug = MODE_PAGES.find((p) => p.familyIndex === familyIndex && p.modeIndex === modeIndex)!.slug;
  useEffect(() => {
    if (!syncUrl) return;
    try {
      // the key is part of the address (/theory/scales/dorian/f-sharp), so a shared or reloaded link opens in it
      window.history.replaceState(null, "", scaleHref(slug, tonicPc, window.location.hash));
    } catch {
      /* ignore */
    }
  }, [slug, tonicPc, syncUrl]);

  const ctx = useMemo(() => makeKeyContext(tonicPc, familyIndex, modeIndex), [tonicPc, familyIndex, modeIndex]);
  const rel = useMemo(() => relativesOf(ctx), [ctx]);
  const fam = FAMILIES[familyIndex];
  const info = fam.info[modeIndex];
  const pageFor = (f: number, m: number) => MODE_PAGES.find((p) => p.familyIndex === f && p.modeIndex === m)!;

  const [system] = useLabelSystem();
  // the scale hovered under the wheel: the notes, step pattern and wheel all show it
  const [cmp, setCmp] = useState<CompareChoice | null>(null);
  const pattern = stepPattern(ctx.steps);

  const player = useNotePlayer();
  const line = scaleLineMidi(ctx);
  const degreeOf = (midi: number) => ctx.steps.indexOf((midi - ctx.tonic.pc + 120) % 12);
  const playScale = () => player.play(line.map((m) => ({ key: `d${degreeOf(m)}`, midi: m })), 240);
  const playTune = (tuneId: string) => player.playTimed(melodyTiming(generateMelody(scalePool(60 + ctx.tonic.pc, ctx.steps), ctx.steps)).map((n) => ({ key: `d${n.note.degree}`, midi: n.note.midi, ms: n.ms, velocity: n.velocity })), tuneId);

  return (
    <WithSettings side={syncUrl} bar={<ScaleSettingsBar tonicPc={tonicPc} onTonic={setTonicPc} side={syncUrl} config={{ scale: syncUrl ? { slug } : undefined }} />}>

      <ColourKey>
        Colour shows the job a note does in the key, not how high it is. The 1st degree (home) is white, the 3rd is amber because it decides major or minor, the 5th is blue, and the 7th is rose. The 2nd, 4th and 6th are teal, lime and violet. A flattened or raised note keeps the colour of its degree, so the ♭3 is still amber, and its label tells you it is flat. The same note has the same colour in every chord.
      </ColourKey>

      <div id="scale-notes" className={`grid gap-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-2.5 md:grid-cols-[minmax(0,1fr)_auto] ${UNDER_BAR}`}>
        <div className="flex min-w-0 flex-col gap-3">
        <h2 className="text-2xl font-light tracking-wide text-slate-100">
          {ctx.names[0]} {ctx.modeName}
          <ModeAlias familyIndex={familyIndex} modeIndex={modeIndex} />
        </h2>
        <p className="text-sm text-slate-300">{info.char} <span className="text-slate-400">{info.mood}</span></p>
        <p className="text-xs text-slate-400"><b className="text-slate-300">Where you hear it:</b> {info.use}</p>

        <div className="flex flex-wrap items-center gap-2" aria-label="Scale notes">
          {ctx.names.map((n, i) => {
            const mark = compareMark(ctx.steps, i, cmp);
            return (
              <button key={i} type="button" onClick={() => player.tap(`d${i}`, line[i])} title={`${n}: tap to hear it`} className="cursor-sound relative flex flex-col items-center gap-0.5 rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400">
                <span className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-semibold transition ${player.active === `d${i}` ? "scale-110 ring-[3px] ring-sky-400" : ""} ${mark.shared ? SHARED_RING : ""}`} style={{ background: degreeColour(i), color: DOT_INK }}>{scaleToneLabel(system, ctx, i)}</span>
                <span className="text-xs tabular-nums text-slate-500">{scaleToneCaption(system, ctx, i)}</span>
                {mark.theirs && <span className="pointer-events-none absolute -top-3 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-md border border-slate-700 bg-slate-900/95 px-1 text-[9px] leading-4 text-slate-300">vs {mark.theirs}</span>}
              </button>
            );
          })}
          <button type="button" onClick={playScale} className="cursor-sound ml-2 rounded-full border border-emerald-500 bg-emerald-500/15 px-3 py-1 text-xs text-emerald-100 hover:bg-emerald-500/25">▶ Play scale</button>
          <TuneButton onPlay={playTune} title="A short tune made from this scale, new every time" className="rounded-full border border-emerald-500 bg-emerald-500/15 px-3 py-1 text-xs text-emerald-100 hover:bg-emerald-500/25" />
        </div>
        <KeySignature ctx={ctx} />
        <p className="text-xs text-slate-400">
          Step pattern <Peek text={cmp && `${cmp.label}: ${cmp.pattern.join(" – ")}`}><span className="tabular-nums text-slate-300">{pattern.join(" – ")}</span></Peek>
          <Info label="What is the step pattern?">W is a whole step (two frets), H a half step (one fret). Every mode is the same set of steps starting from a different place, which is why the seven modes of one parent scale share their notes.</Info>
        </p>
        <ul className="space-y-1 text-xs text-slate-400">
          {modeIndex !== 0 && !rel.relativeMajor && !fam.scales && (
            <li>
              Parent scale: <b>{rel.parentTonic} {rel.parentName}</b> (starts on its {["1st", "2nd", "3rd", "4th", "5th", "6th", "7th"][modeIndex]} degree)
            </li>
          )}
          {rel.relativeMajor && modeIndex !== 0 && (
            <li>
              Relative major: <Link className="text-sky-300 hover:underline" href={scaleHref(pageFor(0, 0).slug, rel.relativeMajor.tonicPc)}>{rel.relativeMajor.tonic} major</Link> <span className="text-slate-500">(this mode starts on its {["1st", "2nd", "3rd", "4th", "5th", "6th", "7th"][modeIndex]} degree)</span>
              <Info label="What is a relative major?">The major scale that uses exactly the same notes. Here the notes {ctx.names.join(" ")} also make {rel.relativeMajor.tonic} major when you start on {rel.relativeMajor.tonic}.</Info>
            </li>
          )}
          {rel.relativeMinor && modeIndex !== 5 && (
            <li>
              Relative minor: <Link className="text-sky-300 hover:underline" href={scaleHref(pageFor(0, 5).slug, rel.relativeMinor.tonicPc)}>{rel.relativeMinor.tonic} natural minor</Link> <span className="text-slate-500">(starts on the 6th degree of {rel.relativeMajor?.tonic ?? rel.parentTonic} major)</span>
              <Info label="What is a relative minor?">The natural minor scale (Aeolian) built on the 6th note of that major scale. Same seven notes, different home note.</Info>
            </li>
          )}
          {rel.majorSwaps.length > 0 && <li>Compared with {ctx.names[0]} major: <Swaps swaps={rel.majorSwaps} /></li>}
          {rel.minorSwaps.length > 0 && <li>Compared with {ctx.names[0]} natural minor: <Swaps swaps={rel.minorSwaps} /></li>}
        </ul>
        </div>
        {/* the scale as a shape on the ring of twelve notes, another scale dashed behind it, the notes that differ ringed */}
        <WheelCompare
          steps={ctx.steps}
          degrees={degreeLabels(ctx.steps)}
          pills={MAJOR_MODE_CHOICES.filter((c) => c.id !== slug)}
          groups={[...modeGroups([slug, ...MAJOR_MODE_CHOICES.map((c) => c.id)]), pentatonicGroup([])]}
          labels={ctx.steps.map((_, i) => scaleToneLabel(system, ctx, i))}
          active={player.active?.startsWith("d") ? Number(player.active.slice(1)) : null}
          onNote={(d) => player.tap(`d${d}`, line[d])}
          onCompare={setCmp}
        />
      </div>

      <ScaleOnGuitar ctx={ctx} player={player} />

      <ScaleRelatives ctx={ctx} familyIndex={familyIndex} className={UNDER_BAR} />

      <ScaleChords ctx={ctx} className={UNDER_BAR} />

      <ScaleProgressions ctx={ctx} className={UNDER_BAR} />

      <section id="sus" className={`rounded-2xl border border-slate-800 bg-slate-900/40 p-2.5 ${UNDER_BAR}`}>
        <h2 className="mb-1 text-sm font-medium text-slate-100">Sus and extension chords from each chord</h2>
        <p className="mb-3 text-xs text-slate-400">From {ctx.chords[0].triadName} you can go through the 2nd of the scale to sus2 and 9 chords, through the 4th to sus4 and 11, and so on. All seven chords of {ctx.names[0]} {ctx.modeName}.</p>
        <ChordBubbles ctx={ctx} />
      </section>

    </WithSettings>
  );
}
