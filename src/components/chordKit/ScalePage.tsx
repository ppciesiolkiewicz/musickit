"use client";

import { chordNoteLabel, scaleToneCaption, scaleToneLabel } from "@/features/theory/labels";
import { useLabelSystem } from "@/features/theory/useLabelSystem";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ColourKey, ModeAlias, ScaleSettingsBar, UNDER_BAR } from "./ScaleSettings";
import { FAMILIES, makeKeyContext } from "@/features/theory/theory";
import { MODE_PAGES, type NoteSwap, chordMidi, modeChords, degreeColour, relativesOf, roleWithDegree, stepPattern, DOT_INK } from "@/features/theory/scales";
import { strum } from "@/lib/chordKit/playback";
import ChordShapeCarousel from "./ChordShapeCarousel";
import ChordShapesModal from "./ChordShapesModal";
import ChordProgressionModal from "./ChordProgressionModal";
import ChordBubbles from "./ChordBubbles";
import ScaleOnGuitar from "./ScaleOnGuitar";
import { useNotePlayer } from "./useNotePlayer";
import { scaleLineMidi } from "@/lib/chordKit/scalePositions";
import { generateMelody, melodyTiming, scalePool } from "@/lib/chordKit/melody";
import { scaleHref } from "@/features/theory/keySlug";
import { Chip, Info } from "@/components/ui";

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

const STACK_LABELS = ["root", "3rd", "5th", "7th", "9th", "11th", "13th"];

/** Dedicated page for one mode: key picker, relatives, and every chord with its notes coloured by scale degree. */
export default function ScalePage({ familyIndex, modeIndex, initialKey, syncUrl = true }: { familyIndex: number; modeIndex: number; initialKey: number; /** write the key to the address bar (off when embedded in another page) */ syncUrl?: boolean }) {
  const [tonicPc, setTonicPc] = useState(initialKey);
  const [extended, setExtended] = useState(false);
  const [playing, setPlaying] = useState<number | null>(null);
  const [modalDegree, setModalDegree] = useState<number | null>(null);
  const [progDegree, setProgDegree] = useState<number | null>(null);

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
  const chords = useMemo(() => modeChords(ctx), [ctx]);
  const rel = useMemo(() => relativesOf(ctx), [ctx]);
  const fam = FAMILIES[familyIndex];
  const info = fam.info[modeIndex];
  const pageFor = (f: number, m: number) => MODE_PAGES.find((p) => p.familyIndex === f && p.modeIndex === m)!;

  const colour = (n: { scaleDegree: number }) => degreeColour(n.scaleDegree);
  const [system] = useLabelSystem();
  const pattern = stepPattern(ctx.steps);

  const play = (d: number) => {
    strum(chordMidi(ctx, d, extended ? 7 : 4), { gapMs: 70, holdMs: 1600 });
    setPlaying(d);
    setTimeout(() => setPlaying((p) => (p === d ? null : p)), 700);
  };
  const player = useNotePlayer();
  const line = scaleLineMidi(ctx);
  const degreeOf = (midi: number) => ctx.steps.indexOf((midi - ctx.tonic.pc + 120) % 12);
  const playScale = () => player.play(line.map((m) => ({ key: `d${degreeOf(m)}`, midi: m })), 240);
  const playTune = () => player.playTimed(melodyTiming(generateMelody(scalePool(60 + ctx.tonic.pc, ctx.steps), ctx.steps)).map((n) => ({ key: `d${n.note.degree}`, midi: n.note.midi, ms: n.ms, velocity: n.velocity })));

  const siblingLink = (s: { modeIndex: number; tonicPc: number }) => scaleHref(pageFor(familyIndex, s.modeIndex).slug, s.tonicPc);

  return (
    <div className="flex flex-col gap-5">
      <ScaleSettingsBar
        tonicPc={tonicPc}
        onTonic={setTonicPc}
        scale={syncUrl ? slug : undefined}
      />

      <ColourKey>
        Colour shows the job a note does in the key, not how high it is. The 1st degree (home) is white, the 3rd is amber because it decides major or minor, the 5th is blue, and the 7th is rose. The 2nd, 4th and 6th are teal, lime and violet. A flattened or raised note keeps the colour of its degree, so the ♭3 is still amber, and its label tells you it is flat. The same note has the same colour in every chord.
      </ColourKey>

      <div id="scale-notes" className={`flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/40 p-2.5 ${UNDER_BAR}`}>
        <h2 className="text-2xl font-light tracking-wide text-slate-100">
          {ctx.names[0]} {ctx.modeName}
          <ModeAlias familyIndex={familyIndex} modeIndex={modeIndex} />
        </h2>
        <p className="text-sm text-slate-300">{info.char} <span className="text-slate-400">{info.mood}</span></p>
        <p className="text-xs text-slate-400"><b className="text-slate-300">Where you hear it:</b> {info.use}</p>

        <div className="flex flex-wrap items-center gap-2" aria-label="Scale notes">
          {ctx.names.map((n, i) => (
            <button key={i} type="button" onClick={() => player.tap(`d${i}`, line[i])} title={`${n}: tap to hear it`} className="cursor-sound flex flex-col items-center gap-0.5 rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400">
              <span className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-semibold transition ${player.active === `d${i}` ? "scale-110 ring-[3px] ring-sky-400" : ""}`} style={{ background: degreeColour(i), color: DOT_INK }}>{scaleToneLabel(system, ctx, i)}</span>
              <span className="text-xs tabular-nums text-slate-500">{scaleToneCaption(system, ctx, i)}</span>
            </button>
          ))}
          <button type="button" onClick={playScale} className="cursor-sound ml-2 rounded-full border border-emerald-500 bg-emerald-500/15 px-3 py-1 text-xs text-emerald-100 hover:bg-emerald-500/25">▶ Play scale</button>
          <button type="button" onClick={playTune} title="A short tune made from this scale, new every time" className="cursor-sound rounded-full border border-emerald-500 bg-emerald-500/15 px-3 py-1 text-xs text-emerald-100 hover:bg-emerald-500/25">♪ Sample melody</button>
        </div>
        <p className="text-xs text-slate-400">
          Step pattern <span className="tabular-nums text-slate-300">{pattern.join(" – ")}</span>
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

      <ScaleOnGuitar ctx={ctx} player={player} />

      <section id="relatives" className={`rounded-2xl border border-slate-800 bg-slate-900/40 p-2.5 ${UNDER_BAR}`}>
        <h2 className="mb-2 text-sm font-medium text-slate-100">Modes with the same notes as {ctx.names[0]} {ctx.modeName}</h2>

        {fam.scales ? (
          <p className="text-sm text-slate-400">{ctx.modeName} is a scale of its own, not a mode of the major, harmonic minor or melodic minor scale, so no named mode shares its notes.</p>
        ) : (
        <>
        <div className="grid gap-1.5 sm:grid-cols-2">
          {rel.siblings.map((s) => (
            <Link
              key={s.modeIndex}
              href={siblingLink(s)}
              aria-current={s.isThis ? "page" : undefined}
              className={`flex items-center justify-between rounded-lg border px-3 py-1.5 text-sm transition ${s.isThis ? "border-sky-500/60 bg-sky-500/10 text-sky-100" : "border-slate-800 text-slate-300 hover:border-slate-600"}`}
            >
              <span>{s.tonic} {s.name}<ModeAlias familyIndex={familyIndex} modeIndex={s.modeIndex} /></span>
              <span className="text-xs text-slate-500">{["1st", "2nd", "3rd", "4th", "5th", "6th", "7th"][s.modeIndex]} degree</span>
            </Link>
          ))}
        </div>
        </>
        )}
      </section>

      <section id="chords" className={`rounded-2xl border border-slate-800 bg-slate-900/40 p-2.5 ${UNDER_BAR}`}>
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
                <button
                  type="button"
                  onClick={() => play(c.degree)}
                  title="Tap to hear it"
                  className={`cursor-sound flex min-w-0 flex-1 basis-60 flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border px-3 py-2.5 text-left transition hover:border-slate-600 ${playing === c.degree ? "border-sky-400 bg-slate-800/80" : "border-transparent"}`}
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
                <ChordShapeCarousel ctx={ctx} degree={c.degree} onShowAll={() => setModalDegree(c.degree)} onShowProgression={() => setProgDegree(c.degree)} />
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-xs text-slate-500">
          Each chord stacks every other note of the scale ({STACK_LABELS.slice(0, extended ? 7 : 4).join(", ")}). Tap a row to hear it.
        </p>
      </section>

      <section id="sus" className={`rounded-2xl border border-slate-800 bg-slate-900/40 p-2.5 ${UNDER_BAR}`}>
        <h2 className="mb-1 text-sm font-medium text-slate-100">Sus and extension chords from each chord</h2>
        <p className="mb-3 text-xs text-slate-400">From {ctx.chords[0].triadName} you can go through the 2nd of the scale to sus2 and 9 chords, through the 4th to sus4 and 11, and so on. All seven chords of {ctx.names[0]} {ctx.modeName}.</p>
        <ChordBubbles ctx={ctx} />
      </section>

      {progDegree !== null && <ChordProgressionModal ctx={ctx} degree={progDegree} onClose={() => setProgDegree(null)} />}
      {modalDegree !== null && <ChordShapesModal ctx={ctx} degree={modalDegree} onClose={() => setModalDegree(null)} />}
    </div>
  );
}
