"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import ShapeBrowser from "./ShapeBrowser";
import { KeyPicker, ModePicker } from "./KeyPicker";
import ChordBubbles from "./ChordBubbles";
import { Chip, Info, Section } from "./ui";
import { keyEntries } from "@/lib/chordKit/shapeTools";
import { FAMILIES, makeKeyContext } from "@/lib/chordKit/theory";
import { MODE_PAGES, chordMidi } from "@/lib/chordKit/scales";
import { strum } from "@/lib/chordKit/playback";

/** Pick a key and mode; see every shape that plays a chord of that key, grouped by shape. */
export default function KeyTab() {
  const [tonicPc, setTonicPc] = useState(7);
  const [fam, setFam] = useState(0);
  const [mode, setMode] = useState(0);
  const [degree, setDegree] = useState<string | null>(null);

  const ctx = useMemo(() => makeKeyContext(tonicPc, fam, mode), [tonicPc, fam, mode]);
  const entries = useMemo(() => keyEntries(ctx), [ctx]);
  const info = FAMILIES[fam].info[mode];
  const page = MODE_PAGES.find((m) => m.familyIndex === fam && m.modeIndex === mode);

  const playChord = (d: number) => strum(chordMidi(ctx, d), { gapMs: 70, holdMs: 1400 });

  return (
    <ShapeBrowser
      entries={entries}
      ctx={ctx}
      forcedTags={degree ? ["d:" + degree] : []}
      header={
        <>
          <KeyPicker tonicPc={tonicPc} onTonic={setTonicPc} />
          <ModePicker familyIndex={fam} modeIndex={mode} onChange={(f, m) => { setFam(f); setMode(m); setDegree(null); }} />
          <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3 text-xs leading-relaxed text-slate-300">
            <div className="mb-1 text-sm font-medium text-slate-100">
              {ctx.names[0]} {ctx.modeName} <span className="font-normal text-slate-500">· {ctx.names.join(" ")}</span>
            </div>
            <p><b className="text-slate-200">What makes it:</b> {info.char} <b className="text-slate-200">Sound:</b> {info.mood} <b className="text-slate-200">Use:</b> {info.use}</p>
            {page && (
              <p className="mt-1">
                <Link className="text-sky-300 hover:underline" href={`/scales/${page.slug}?key=${tonicPc}`}>Open the full {ctx.modeName} page with every chord and its notes →</Link>
              </p>
            )}
          </div>
          <Section level={2} title={`Sus and extension chords in ${ctx.names[0]} ${ctx.modeName}`} defaultOpen={false} meta="from each chord">
            <ChordBubbles ctx={ctx} />
          </Section>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="flex w-28 shrink-0 items-center gap-1 text-[11px] uppercase tracking-wider text-slate-500">Chords<Info label="About the chord strip">The chord the scale builds on each note, stacking every other note. Tap one to hear it and to show only the shapes that play it. Tap it again to clear. The Roman numeral says where it sits in the key.</Info></span>
            {ctx.chords.map((c) => (
              <span key={c.degree} className="inline-flex">
                <Chip on={degree === c.roman} onClick={() => { setDegree(degree === c.roman ? null : c.roman); playChord(c.degree); }} title="Tap to hear it and filter the shapes to this chord">
                  {c.roman} <span className="text-slate-400">{c.seventhName}</span>
                </Chip>
              </span>
            ))}
          </div>
        </>
      }
    />
  );
}
