"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyContext } from "@/features/theory/theory";
import { chordMidi } from "@/features/theory/scales";
import { iconicChords, iconicFor } from "@/features/theory/iconicProgressions";
import { silence, strum } from "@/lib/chordKit/playback";

const BEAT_MS = 1300;

/** "Iconic progressions": a few well-known chord loops for this mode, in the key picked, each with a line on why it works and a button to hear it. */
export default function ScaleProgressions({ ctx, className = "" }: { ctx: KeyContext; className?: string }) {
  const list = useMemo(() => iconicFor(ctx).map((p) => ({ p, chords: iconicChords(ctx, p) })), [ctx]);
  const [now, setNow] = useState<{ prog: number; chord: number } | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const stop = () => {
    timers.current.forEach(clearTimeout);
    timers.current.length = 0;
    silence();
    setNow(null);
  };
  useEffect(() => {
    const t = timers.current;
    return () => t.forEach(clearTimeout);
  }, []);
  // a new key or mode is a different set of chords: stop what is playing
  useEffect(() => stop, [ctx]);

  if (list.length === 0) return null;

  const playChord = (prog: number, chord: number) => {
    const c = list[prog].chords[chord];
    strum(chordMidi(ctx, c.degree, c.notes), { gapMs: 60, holdMs: BEAT_MS });
    setNow({ prog, chord });
  };
  const playAll = (prog: number) => {
    stop();
    list[prog].chords.forEach((_, i) => timers.current.push(setTimeout(() => playChord(prog, i), i * BEAT_MS)));
    timers.current.push(setTimeout(() => setNow(null), list[prog].chords.length * BEAT_MS));
  };

  return (
    <section id="progressions" className={`rounded-2xl border border-slate-800 bg-slate-900/40 p-2.5 ${className}`}>
      <h2 className="mb-1 text-sm font-medium text-slate-100">Iconic progressions in {ctx.names[0]} {ctx.modeName}</h2>
      <p className="mb-3 text-xs text-slate-400">A few well-known chord loops that bring out this scale’s sound. Play one through, or tap a chord to hear it.</p>
      <ul className="grid gap-2 lg:grid-cols-2">
        {list.map(({ p, chords }, pi) => {
          const running = now?.prog === pi;
          return (
            <li key={pi} className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-950/40 p-3">
              <div className="flex items-center gap-3">
                <h3 className="min-w-0 flex-1 text-base font-light text-sky-300">{chords.map((c) => c.roman).join(" – ")}</h3>
                <button type="button" onClick={() => (running ? stop() : playAll(pi))} aria-pressed={running} className="cursor-sound shrink-0 rounded-full border border-emerald-500 bg-emerald-500/15 px-3 py-1 text-xs text-emerald-100 hover:bg-emerald-500/25">
                  {running ? "■ Stop" : "▶ Play"}
                </button>
              </div>
              <ol className="flex flex-wrap gap-1.5" aria-label="Chords">
                {chords.map((c, ci) => (
                  <li key={ci}>
                    <button
                      type="button"
                      onClick={() => { stop(); playChord(pi, ci); }}
                      title="Tap to hear it"
                      className={`cursor-sound rounded-lg border px-3 py-1.5 text-sm text-slate-100 transition hover:border-slate-500 ${now?.prog === pi && now.chord === ci ? "border-sky-400 bg-sky-950/40" : "border-slate-700 bg-slate-900"}`}
                    >
                      {c.name}
                    </button>
                  </li>
                ))}
              </ol>
              <p className="text-xs leading-relaxed text-slate-400">{p.why}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
