"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import ShapeBrowser from "./ShapeBrowser";
import { KeyPicker, ModePicker } from "./KeyPicker";
import ChordBubbles from "./ChordBubbles";
import { keyEntries } from "@/lib/chordKit/shapeTools";
import { FAMILIES, makeKeyContext } from "@/features/theory/theory";
import { MODE_PAGES, chordMidi } from "@/features/theory/scales";
import { strum } from "@/lib/chordKit/playback";
import { DEFAULT_KEY_PC } from "@/features/theory/theory";
import { scaleHref } from "@/features/theory/keySlug";
import { Chip, Info, Section } from "@/components/ui";

/** A key and mode: the tonic, the scale family and the mode in it. */
export type ChordKey = { tonicPc: number; family: number; mode: number };
export const DEFAULT_CHORD_KEY: ChordKey = { tonicPc: DEFAULT_KEY_PC, family: 0, mode: 0 };

/**
 * See every shape that plays a chord of the key, grouped by shape. The key is the host's (`chordKey`, `onKey`); with
 * `pickers` the key and mode pickers and the labels sit on the tab, without them the host puts them in its settings panel. A new
 * family or mode clears the chord picked in the strip (the host remounts the tab with a key on them).
 */
export default function KeyTab({ chordKey, onKey, pickers = true }: { chordKey: ChordKey; onKey: (k: ChordKey) => void; pickers?: boolean }) {
  const { tonicPc, family: fam, mode } = chordKey;
  const [degree, setDegree] = useState<string | null>(null);

  const ctx = useMemo(() => makeKeyContext(tonicPc, fam, mode), [tonicPc, fam, mode]);
  const entries = useMemo(() => keyEntries(ctx), [ctx]);
  const info = FAMILIES[fam].info[mode];
  const page = MODE_PAGES.find((m) => m.familyIndex === fam && m.modeIndex === mode);

  const playChord = (d: number) => strum(chordMidi(ctx, d), { gapMs: 70, holdMs: 1400 });

  return (
    <ShapeBrowser
      labels={pickers}
      entries={entries}
      ctx={ctx}
      forcedTags={degree ? ["d:" + degree] : []}
      header={
        <>
          {pickers && <KeyPicker tonicPc={tonicPc} onTonic={(pc) => onKey({ ...chordKey, tonicPc: pc })} />}
          {pickers && <ModePicker familyIndex={fam} modeIndex={mode} onChange={(f, m) => onKey({ tonicPc, family: f, mode: m })} />}
          <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3 text-xs leading-relaxed text-slate-300">
            <div className="mb-1 text-sm font-medium text-slate-100">
              {ctx.names[0]} {ctx.modeName} <span className="font-normal text-slate-500">· {ctx.names.join(" ")}</span>
            </div>
            <p><b className="text-slate-200">What makes it:</b> {info.char} <b className="text-slate-200">Sound:</b> {info.mood} <b className="text-slate-200">Use:</b> {info.use}</p>
            {page && (
              <p className="mt-1">
                <Link className="text-sky-300 hover:underline" href={scaleHref(page.slug, tonicPc)}>Open the full {ctx.modeName} page with every chord and its notes →</Link>
              </p>
            )}
          </div>
          <Section level={2} title={`Sus and extension chords in ${ctx.names[0]} ${ctx.modeName}`} defaultOpen={false} meta="from each chord">
            <ChordBubbles ctx={ctx} />
          </Section>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="flex w-28 shrink-0 items-center gap-1 text-xs uppercase tracking-wider text-slate-500">Chords<Info label="About the chord strip">The chord the scale builds on each note, stacking every other note. Tap one to hear it and to show only the shapes that play it. Tap it again to clear. The Roman numeral says where it sits in the key.</Info></span>
            {ctx.chords.map((c) => (
              <span key={c.degree} className="inline-flex [&>button]:cursor-pointer">
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
