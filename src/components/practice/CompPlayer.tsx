"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ChordDiagram from "@/components/chordKit/ChordDiagram";
import Icon from "@/components/Icon";
import { sbtn } from "@/components/ui";
import { getSharedPiano, wakeAudio } from "@/features/sound";
import { parseChordQuery } from "@/lib/chordKit/chordSearch";
import { shapesForTones } from "@/lib/chordKit/chordShapes";
import { shapeMidi } from "@/lib/chordKit/shapeTools";
import { COMP_PATTERNS, compEvents, type CompPattern } from "@/lib/practice/comping";

const MIN_BPM = 40;
const MAX_BPM = 200;

/**
 * A progression played for you, bar by bar and looping: each chord's shape (the one drawn) played in a pattern, as an
 * arpeggio or as comping. The chord playing is lit. Pattern and tempo change live, on the next bar. Play along on the
 * instrument or just listen; the host sets the chords, the patterns on offer (the first plays first) and the tempo.
 */
export default function CompPlayer({ chords, patterns, bpm, beats = 4 }: { chords: string[]; patterns: CompPattern[]; bpm: number; beats?: number }) {
  const shapes = useMemo(
    () => chords.flatMap((name) => {
      const q = parseChordQuery(name);
      const c = q && shapesForTones(q.rootPc, q.semis, ["easy", "medium", "hard"]).find((r) => r.full)?.choice;
      return c ? [{ name, c, midi: shapeMidi(c.shape, c.fret).sort((a, b) => a - b) }] : [];
    }),
    [chords],
  );
  const [pattern, setPattern] = useState<CompPattern>(patterns[0]);
  const [tempo, setTempo] = useState(bpm);
  const [at, setAt] = useState<number | null>(null);
  const live = useRef({ pattern, tempo });
  useEffect(() => {
    live.current = { pattern, tempo };
  }, [pattern, tempo]);
  const stopper = useRef<(() => void) | null>(null);

  const stop = () => {
    stopper.current?.();
    stopper.current = null;
    setAt(null);
  };
  useEffect(() => () => stopper.current?.(), []);

  const play = async () => {
    await wakeAudio();
    const piano = getSharedPiano();
    await piano.preload().catch(() => undefined);
    let stopped = false;
    let timers: ReturnType<typeof setTimeout>[] = [];
    let bar = 0;
    let due = performance.now() + 80;
    const next = () => {
      if (stopped) return;
      const i = bar % shapes.length;
      setAt(i);
      const beatMs = 60000 / live.current.tempo;
      const lead = Math.max(0, due - performance.now());
      for (const ev of compEvents(shapes[i].midi, live.current.pattern, beats)) {
        ev.midi.forEach((m, k) => {
          const on = lead + ev.beat * beatMs + k * ev.gapMs;
          timers.push(setTimeout(() => piano.noteOn(m, k === 0 && ev.midi.length === 1 ? 0.8 : 0.65), on));
          timers.push(setTimeout(() => piano.noteOff(m), on + ev.len * beatMs));
        });
      }
      bar++;
      due += beats * beatMs;
      timers.push(setTimeout(next, Math.max(0, due - performance.now() - 40)));
    };
    next();
    stopper.current = () => {
      stopped = true;
      timers.forEach(clearTimeout);
      timers = [];
      piano.allOff();
    };
  };

  if (!shapes.length) return null;
  const playing = at !== null;
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-950/40 p-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => (playing ? stop() : void play())} aria-pressed={playing}
          className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition ${playing ? "border-emerald-400/70 bg-emerald-500/20 text-emerald-100" : "border-sky-400/60 bg-sky-500/15 text-sky-50 hover:bg-sky-500/25"}`}>
          <Icon name={playing ? "square" : "play"} size={14} fill />{playing ? "Stop" : "Play"}
        </button>
        {patterns.length > 1 ? (
          <div className="flex flex-wrap gap-1" role="group" aria-label="Pattern">
            {patterns.map((p) => (
              <button key={p} type="button" aria-pressed={p === pattern} onClick={() => setPattern(p)} title={COMP_PATTERNS.find((x) => x.id === p)?.desc}
                className={`rounded-full border px-2.5 py-0.5 text-[11px] transition ${p === pattern ? "border-sky-400/70 bg-sky-500/15 text-sky-100" : "border-slate-700 text-slate-500 hover:border-slate-500"}`}>
                {COMP_PATTERNS.find((x) => x.id === p)?.label}
              </button>
            ))}
          </div>
        ) : (
          <span className="text-xs text-slate-300">{COMP_PATTERNS.find((x) => x.id === pattern)?.label}</span>
        )}
        <span className="ml-auto flex items-center gap-1 text-xs text-slate-300">
          <button type="button" className={sbtn} disabled={tempo <= MIN_BPM} onClick={() => setTempo((t) => t - 2)} aria-label="Slower">−</button>
          <span className="w-14 text-center tabular-nums">{tempo} <span className="text-[10px] text-slate-500">bpm</span></span>
          <button type="button" className={sbtn} disabled={tempo >= MAX_BPM} onClick={() => setTempo((t) => t + 2)} aria-label="Faster">+</button>
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {shapes.map(({ name, c }, i) => (
          <div key={`${name}-${i}`} className={`flex w-28 flex-col items-center gap-1 rounded-lg border p-1.5 transition ${at === i ? "border-sky-400 bg-sky-500/10" : "border-transparent"}`}>
            <span className="text-sm text-slate-100">{name}</span>
            <ChordDiagram shape={c.shape} rootFret={c.fret} />
          </div>
        ))}
      </div>
    </div>
  );
}
