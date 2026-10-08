"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { KeyPicker } from "./KeyPicker";
import { Chip, DegreeLegend, Info } from "./ui";
import { FAMILIES, makeKeyContext } from "@/lib/chordKit/theory";
import { MODE_PAGES, chordMidi, modeChords, degreeColour, degreeLabels, relativesOf, stepPattern } from "@/lib/chordKit/scales";
import { strum } from "@/lib/chordKit/playback";
import ChordShapeCarousel from "./ChordShapeCarousel";
import ChordShapesModal from "./ChordShapesModal";

const STACK_LABELS = ["root", "3rd", "5th", "7th", "9th", "11th", "13th"];

/** Dedicated page for one mode: key picker, relatives, and every chord with its notes coloured by scale degree. */
export default function ScalePage({ familyIndex, modeIndex, initialKey }: { familyIndex: number; modeIndex: number; initialKey: number }) {
  const [tonicPc, setTonicPc] = useState(initialKey);
  const [extended, setExtended] = useState(false);
  const [playing, setPlaying] = useState<number | null>(null);
  const [modalDegree, setModalDegree] = useState<number | null>(null);

  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("key", String(tonicPc));
      window.history.replaceState(null, "", url);
    } catch {
      /* ignore */
    }
  }, [tonicPc]);

  const ctx = useMemo(() => makeKeyContext(tonicPc, familyIndex, modeIndex), [tonicPc, familyIndex, modeIndex]);
  const chords = useMemo(() => modeChords(ctx), [ctx]);
  const rel = useMemo(() => relativesOf(ctx), [ctx]);
  const fam = FAMILIES[familyIndex];
  const info = fam.info[modeIndex];
  const pageFor = (f: number, m: number) => MODE_PAGES.find((p) => p.familyIndex === f && p.modeIndex === m)!;

  const colour = (n: { scaleDegree: number }) => degreeColour(n.scaleDegree);
  const labels = degreeLabels(ctx.steps);
  const pattern = stepPattern(ctx.steps);

  const play = (d: number) => {
    strum(chordMidi(ctx, d, extended ? 7 : 4), { gapMs: 70, holdMs: 1600 });
    setPlaying(d);
    setTimeout(() => setPlaying((p) => (p === d ? null : p)), 700);
  };
  const playScale = () => {
    const base = 60 + ((ctx.tonic.pc) % 12);
    strum([...ctx.steps.map((s) => base + s), base + 12], { gapMs: 220, holdMs: 500 });
  };

  const siblingLink = (s: { modeIndex: number; tonicPc: number }) => `/scales/${pageFor(familyIndex, s.modeIndex).slug}?key=${s.tonicPc}`;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
        <KeyPicker tonicPc={tonicPc} onTonic={setTonicPc} />
        <h2 className="text-2xl font-light tracking-wide text-slate-100">
          {ctx.names[0]} {ctx.modeName}
        </h2>
        <p className="text-sm text-slate-300">{info.char} <span className="text-slate-400">{info.mood}</span></p>
        <p className="text-xs text-slate-400"><b className="text-slate-300">Where you hear it:</b> {info.use}</p>

        <div className="flex flex-wrap items-center gap-2" aria-label="Scale notes">
          {ctx.names.map((n, i) => (
            <div key={i} className="flex flex-col items-center gap-0.5">
              <span className="flex h-11 w-11 items-center justify-center rounded-full text-sm font-semibold text-slate-950" style={{ background: degreeColour(i) }}>{n}</span>
              <span className="text-[11px] tabular-nums text-slate-500">{labels[i]}</span>
            </div>
          ))}
          <button type="button" onClick={playScale} className="ml-2 rounded-full border border-emerald-500 bg-emerald-500/15 px-3 py-1 text-xs text-emerald-100 hover:bg-emerald-500/25">▶ Play scale</button>
        </div>
        <p className="text-xs text-slate-400">
          Step pattern <span className="tabular-nums text-slate-300">{pattern.join(" – ")}</span>
          <Info label="What is the step pattern?">W is a whole step (two frets), H a half step (one fret). Every mode is the same set of steps starting from a different place, which is why the seven modes of one parent scale share their notes.</Info>
        </p>
      </div>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
        <h2 className="mb-2 text-sm font-medium text-slate-100">Relatives of {ctx.names[0]} {ctx.modeName}</h2>
        <ul className="space-y-1.5 text-sm text-slate-300">
          {modeIndex !== 0 && !rel.relativeMajor && (
            <li>
              Parent scale: <b>{rel.parentTonic} {rel.parentName}</b> (starts on its {["1st", "2nd", "3rd", "4th", "5th", "6th", "7th"][modeIndex]} degree)
            </li>
          )}
          {rel.relativeMajor && modeIndex !== 0 && (
            <li>
              Relative major: <Link className="text-sky-300 hover:underline" href={`/scales/${pageFor(0, 0).slug}?key=${rel.relativeMajor.tonicPc}`}>{rel.relativeMajor.tonic} major</Link> <span className="text-slate-500">(this mode starts on its {["1st", "2nd", "3rd", "4th", "5th", "6th", "7th"][modeIndex]} degree)</span>
              <Info label="What is a relative major?">The major scale that uses exactly the same notes. Here the notes {ctx.names.join(" ")} also make {rel.relativeMajor.tonic} major when you start on {rel.relativeMajor.tonic}.</Info>
            </li>
          )}
          {rel.relativeMinor && modeIndex !== 5 && (
            <li>
              Relative minor: <Link className="text-sky-300 hover:underline" href={`/scales/${pageFor(0, 5).slug}?key=${rel.relativeMinor.tonicPc}`}>{rel.relativeMinor.tonic} natural minor</Link> <span className="text-slate-500">(starts on the 6th degree of {rel.relativeMajor?.tonic ?? rel.parentTonic} major)</span>
              <Info label="What is a relative minor?">The natural minor scale (Aeolian) built on the 6th note of that major scale. Same seven notes, different home note.</Info>
            </li>
          )}
          {rel.vsMajor.length > 0 && <li>Compared with {ctx.names[0]} major: <b>{rel.vsMajor.join(" ")}</b> {rel.vsMajor.length === 1 ? "is" : "are"} altered.</li>}
          {rel.vsMinor.length > 0 && <li>Compared with {ctx.names[0]} natural minor: <b>{rel.vsMinor.join(" ")}</b> differ{rel.vsMinor.length === 1 ? "s" : ""}.</li>}
        </ul>

        <h3 className="mb-1.5 mt-4 text-xs font-medium uppercase tracking-wider text-slate-500">Modes with the same notes</h3>
        <div className="grid gap-1.5 sm:grid-cols-2">
          {rel.siblings.map((s) => (
            <Link
              key={s.modeIndex}
              href={siblingLink(s)}
              aria-current={s.isThis ? "page" : undefined}
              className={`flex items-center justify-between rounded-lg border px-3 py-1.5 text-sm transition ${s.isThis ? "border-sky-500/60 bg-sky-500/10 text-sky-100" : "border-slate-800 text-slate-300 hover:border-slate-600"}`}
            >
              <span>{s.tonic} {s.name}</span>
              <span className="text-xs text-slate-500">{["1st", "2nd", "3rd", "4th", "5th", "6th", "7th"][s.modeIndex]} degree</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-medium text-slate-100">Every chord in {ctx.names[0]} {ctx.modeName}</h2>
          <span className="ml-auto flex flex-wrap items-center gap-1.5">
            <Chip on={extended} onClick={() => setExtended((v) => !v)}>Show 9 · 11 · 13</Chip>
            <Info label="What are 9, 11 and 13?">Keep stacking every other note of the scale above the 7th and you get the 9th, 11th and 13th. They are the same notes as the 2nd, 4th and 6th, one octave up. Jazz and funk chords use them for colour.</Info>
          </span>
        </div>

        <div className="mb-3">
          <DegreeLegend />
          <Info label="How are the colours chosen?">
            Colour shows the job a note does in the key, not how high it is. The 1st degree (home) is white, the 3rd is amber because it decides major or minor, the 5th is blue, and the 7th is rose. The 2nd, 4th and 6th are teal, lime and violet. A flattened or raised note keeps the colour of its degree, so the ♭3 is still amber, and its label tells you it is flat. The same note has the same colour in every chord.
          </Info>
        </div>

        <ul className="flex flex-col gap-2">
          {chords.map((c) => {
            const shown = extended ? c.notes : c.notes.slice(0, 4);
            return (
              <li key={c.degree} className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/40 p-1">
                <button
                  type="button"
                  onClick={() => play(c.degree)}
                  title="Tap to hear it"
                  className={`flex min-w-0 flex-1 basis-72 flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border px-3 py-2.5 text-left transition hover:border-slate-600 ${playing === c.degree ? "border-sky-400 bg-slate-800/80" : "border-transparent"}`}
                >
                  <span className="w-12 shrink-0 text-lg font-light text-sky-300">{c.roman}</span>
                  <span className="min-w-[8rem]">
                    <span className="block text-sm font-medium text-slate-100">{c.seventhName}</span>
                    <span className="block text-xs text-slate-500">triad {c.triadName}</span>
                  </span>
                  <span className="flex flex-wrap gap-1.5">
                    {shown.map((n) => (
                      <span key={n.role + n.name} className="flex flex-col items-center">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold text-slate-950" style={{ background: colour(n) }}>{n.name}</span>
                        <span className="text-[10px] text-slate-500">{n.role}</span>
                      </span>
                    ))}
                  </span>
                </button>
                <ChordShapeCarousel ctx={ctx} degree={c.degree} onShowAll={() => setModalDegree(c.degree)} />
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-xs text-slate-500">
          Each chord stacks every other note of the scale ({STACK_LABELS.slice(0, extended ? 7 : 4).join(", ")}). Tap a row to hear it.
        </p>
      </section>

      {modalDegree !== null && <ChordShapesModal ctx={ctx} degree={modalDegree} onClose={() => setModalDegree(null)} />}
    </div>
  );
}
