"use client";

import { useMemo } from "react";
import { FAMILIES, PROG_LIST, resolveProgression, shortModeName, type Progression } from "@/features/theory";
import { playSequence } from "@/features/sound";
import { useCreatorKey } from "../KeyProvider";
import { voice } from "../model/voicing";
import { Body, Hint, PlayButton } from "./common";

/** Chord progressions that suit the mode, written in the chosen key. Without a key: the same progressions as numerals, played from C. */
export default function ProgressionsPlugin() {
  const { ctx, choice, title, setMode } = useCreatorKey();
  const tonic = ctx ? ctx.tonic.pc : 0;
  const list = useMemo(() => PROG_LIST.filter((p) => p.fam === choice.family && p.k === choice.mode), [choice.family, choice.mode]);
  const modesWith = useMemo(() => {
    const seen = new Map<string, { fam: number; k: number }>();
    PROG_LIST.forEach((p) => seen.set(`${p.fam}:${p.k}`, { fam: p.fam, k: p.k }));
    return [...seen.values()];
  }, []);

  const play = (p: Progression) => {
    const D = resolveProgression({ ...p, tonic });
    playSequence(D.seq.flatMap((c, i) => voice(c.rootPc, c.suf).map((note, j) => ({ note, at: i * 1300 + j * 40, hold: 1200 }))));
  };

  return (
    <Body title={ctx ? `Progressions in ${title}` : "Progressions"} general={!ctx}>
      {!ctx && (
        <>
          <Hint>Pick a key above to see these in that key. Choose a mode here to see its progressions as numerals (they play from C).</Hint>
          <div className="flex flex-wrap gap-1">
            {modesWith.map((m) => {
              const on = m.fam === choice.family && m.k === choice.mode;
              return (
                <button key={`${m.fam}:${m.k}`} type="button" aria-pressed={on} onClick={() => setMode(m.fam, m.k)} className={`rounded-full border px-2.5 py-0.5 text-xs ${on ? "border-sky-400 bg-sky-500/20 text-sky-100" : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500"}`}>
                  {shortModeName(FAMILIES[m.fam].names[m.k])}
                </button>
              );
            })}
          </div>
        </>
      )}
      {list.length === 0 && <Hint>No written progressions for {shortModeName(FAMILIES[choice.family].names[choice.mode])} yet. Try Dorian, Mixolydian, Aeolian or harmonic minor.</Hint>}
      <ul className="flex flex-col gap-1.5">
        {list.map((p) => {
          const D = resolveProgression({ ...p, tonic });
          return (
            <li key={p.title} className="flex flex-col gap-1 rounded-lg border border-slate-800 bg-slate-950/60 p-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-100">{p.title}</span>
                <span className="ml-auto"><PlayButton onClick={() => play(p)} label={`Play ${p.title}`} /></span>
              </div>
              {ctx && (
                <div className="flex flex-wrap gap-1">
                  {D.seq.map((c, i) => <span key={i} className="rounded-md border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-xs text-slate-200">{c.name}<span className="ml-1 text-slate-500">{c.roman}</span></span>)}
                </div>
              )}
              <p className="text-xs leading-relaxed text-slate-400">{p.blurb}</p>
            </li>
          );
        })}
      </ul>
    </Body>
  );
}
