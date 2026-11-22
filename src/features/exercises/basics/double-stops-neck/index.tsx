"use client";

import { useMemo } from "react";
import { OctaveNeck, STRING_NAMES, useDyadPlayer } from "@/components/chordKit/DoubleStopsExplorer";
import { keyChoiceFor, keyContext, keyTitle } from "@/features/creator";
import type { KeyContext } from "@/features/theory/theory";
import { DYAD_MAX_FRET, dyadPairOf, dyadWalk, type Dyad } from "@/lib/chordKit/scaleChords";
import { DYAD_DEFAULT_STRINGS, type DyadName } from "./walk";

const stringName = (s: number) => (s === 0 ? "low E" : s === 5 ? "high e" : STRING_NAMES[s]);

/** The walk drawn: its line of words, the Play button and the neck. Mounted anew when the walk changes, so nothing keeps sounding. */
function Walk({ ctx, interval, strings, walk, title }: { ctx: KeyContext; interval: 3 | 6; strings: [number, number]; walk: Dyad[]; title: string }) {
  const { lit, running, tap, run, stop } = useDyadPlayer(walk);
  return (
    <section className="metal-panel rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
      <div className="mb-1 flex items-center gap-2">
        <h3 className="text-sm font-medium text-slate-100">{title}</h3>
        <button type="button" data-tour="double-stops-neck-play" onClick={() => (running ? stop() : run())} title="Plays the double stops up the neck and back down" className="rounded border border-slate-700 px-2 py-0.5 text-[11px] text-slate-300 hover:border-slate-500">{running ? "■ Stop" : "▶ Play"}</button>
      </div>
      <p className="mb-3 text-xs text-slate-400">Each double stop is two notes of the chord named above it, and the ringed note is that chord&apos;s root. Tap one to hear it.</p>
      <div data-tour="double-stops-neck-neck">
        <OctaveNeck ctx={ctx} interval={interval} strings={strings} octave={walk} lit={lit} onPlay={tap} label={title} />
      </div>
    </section>
  );
}

/**
 * The 3rds or 6ths of a key on one pair of strings, from fret `from` to fret `to`: the double stops page's neck
 * (`components/chordKit/DoubleStopsExplorer`) with no settings, the walk worked out by `dyadWalk` (`lib/chordKit/scaleChords`).
 * `strings` are guitar numbers, the lower string first ("32").
 */
export function View({ pc, scale, interval, strings, from = 0, to = DYAD_MAX_FRET }: { pc: number; scale: string; interval: DyadName; strings?: string; from?: number; to?: number }) {
  const iv = interval === "6ths" ? 6 : 3;
  const pairId = strings ?? DYAD_DEFAULT_STRINGS[interval];
  const drawn = useMemo(() => {
    const ctx = keyContext(keyChoiceFor(pc, scale));
    const pair = dyadPairOf(pairId, iv);
    return ctx && pair ? { ctx, pair, walk: dyadWalk(ctx, iv, pair, from, to) } : null;
  }, [pc, scale, iv, pairId, from, to]);
  if (!drawn) return null;
  const { ctx, pair, walk } = drawn;
  const keyName = keyTitle(keyChoiceFor(pc, scale));
  const title = `${keyName} in ${interval} on the ${stringName(pair[0])} and ${stringName(pair[1])} strings, frets ${from} to ${to}`;
  if (!walk.length) return <p className="p-3 text-xs text-slate-500">No {interval} of {keyName} fit on these strings from fret {from} to fret {to}.</p>;
  return <Walk key={`${pc}-${scale}-${iv}-${pair.join("")}-${from}-${to}`} ctx={ctx} interval={iv} strings={pair} walk={walk} title={title} />;
}
