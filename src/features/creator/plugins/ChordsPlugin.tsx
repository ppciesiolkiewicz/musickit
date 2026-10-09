"use client";

import { useState } from "react";
import { modeChords, chordMidi, type KeyContext } from "@/features/theory";
import { strum } from "@/features/sound";
import { useCreatorKey } from "../KeyProvider";
import { CHORD_TYPES, C_PC } from "../model/generic";
import { voice } from "../model/voicing";
import { Body, Hint, pbtn } from "./common";

/** The chords of the key: a triad and a seventh on each degree. Click a row to hear it. */
export default function ChordsPlugin() {
  const { ctx, title } = useCreatorKey();
  const [sevenths, setSevenths] = useState(true);
  if (!ctx) return <General />;
  return <Key ctx={ctx} title={title} sevenths={sevenths} onSevenths={setSevenths} />;
}

function Key({ ctx, title, sevenths, onSevenths }: { ctx: KeyContext; title: string; sevenths: boolean; onSevenths: (v: boolean) => void }) {
  const chords = modeChords(ctx);
  return (
    <Body title={`Chords in ${title}`} aside={<button type="button" className={pbtn} aria-pressed={sevenths} onClick={() => onSevenths(!sevenths)} title="Triads or seventh chords">{sevenths ? "7ths" : "Triads"}</button>}>
      <ul className="grid gap-1 [grid-template-columns:repeat(auto-fill,minmax(8.5rem,1fr))]" aria-label="Chords of the key">
        {chords.map((c) => {
          const notes = c.notes.slice(0, sevenths ? 4 : 3);
          return (
            <li key={c.degree}>
              <button type="button" onClick={() => strum(chordMidi(ctx, c.degree, sevenths ? 4 : 3), { gapMs: 70, holdMs: 1400 })} className="flex w-full flex-col gap-0.5 rounded-lg border border-slate-800 bg-slate-950/60 px-2 py-1.5 text-left hover:border-sky-500/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400">
                <span className="flex items-baseline justify-between">
                  <span className="text-base font-medium text-slate-100">{sevenths ? c.seventhName : c.triadName}</span>
                  <span className="text-xs text-slate-500">{c.roman}</span>
                </span>
                <span className="text-xs text-slate-400">{notes.map((n) => n.name).join(" ")}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </Body>
  );
}

/** No key: the chord types themselves, shown on C. */
function General() {
  return (
    <Body title="Chord types" general>
      <Hint>Pick a key above to see its chords. Until then, the common chord types (heard on C).</Hint>
      <ul className="grid gap-1 [grid-template-columns:repeat(auto-fill,minmax(10.5rem,1fr))]">
        {CHORD_TYPES.map((t) => (
          <li key={t.name}>
            <button type="button" onClick={() => strum(voice(C_PC, t.symbol), { gapMs: 70, holdMs: 1400 })} className="flex w-full flex-col gap-0.5 rounded-lg border border-slate-800 bg-slate-950/60 px-2 py-1.5 text-left hover:border-sky-500/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400">
              <span className="text-sm font-medium text-slate-100">{t.name}</span>
              <span className="font-mono text-xs text-slate-300">{t.formula}</span>
              <span className="text-[11px] text-slate-500">{t.feel}</span>
            </button>
          </li>
        ))}
      </ul>
    </Body>
  );
}
