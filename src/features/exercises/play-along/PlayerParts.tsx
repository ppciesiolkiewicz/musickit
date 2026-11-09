"use client";

import type { ReactNode, Ref } from "react";
import Icon from "@/components/Icon";
import { Button, HUE_TONES, hueAt, type Hue } from "@/components/ui";

/**
 * The look the exercise players share with the backing track: a card with a sky hairline, a round Play, a labelled
 * tempo, a bar beat meter and chord cards that keep one colour per chord. Strum-along and the play-along.
 */

/** The card round a player. */
export function PlayerCard({ children, ref, className = "" }: { children: ReactNode; ref?: Ref<HTMLDivElement>; className?: string }) {
  return (
    <div ref={ref} className={`relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-slate-700/70 bg-linear-to-b from-sky-500/[0.07] via-slate-900/70 to-slate-900/70 p-3 shadow-lg shadow-black/20 sm:p-4 ${className}`}>
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-sky-400/60 to-transparent" />
      {children}
    </div>
  );
}

/** A round Play / Stop: sky at rest, green and pulsing while it plays. */
export function PlayButton({ playing, onClick, disabled, "data-tour": tour }: { playing: boolean; onClick(): void; disabled?: boolean; "data-tour"?: string }) {
  return (
    <button type="button" data-tour={tour} disabled={disabled} onClick={onClick} aria-pressed={playing} aria-label={playing ? "Stop" : "Play"}
      className={`relative grid h-12 w-12 shrink-0 place-items-center rounded-full text-slate-950 shadow-lg transition active:scale-95 disabled:opacity-60 ${playing ? "bg-emerald-400 shadow-emerald-500/40 hover:bg-emerald-300" : "bg-sky-400 shadow-sky-500/40 hover:bg-sky-300"}`}>
      {playing && <span aria-hidden className="absolute inset-0 animate-ping rounded-full bg-emerald-400/30 [animation-duration:1.6s]" />}
      <Icon name={playing ? "square" : "play"} size={20} fill className={playing ? "" : "translate-x-0.5"} />
    </button>
  );
}

/** Tempo: a label, − / + by `step`, the bpm between. */
export function TempoControl({ bpm, min, max, step = 1, onChange, "data-tour": tour, className = "" }: { bpm: number; min: number; max: number; step?: number; onChange(bpm: number): void; "data-tour"?: string; className?: string }) {
  return (
    <span data-tour={tour} className={`flex items-center gap-2 text-sm text-slate-300 ${className}`}>
      <span className="mr-0.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Tempo</span>
      <Button size="icon-sm" disabled={bpm <= min} onClick={() => onChange(Math.max(min, bpm - step))} aria-label="Slower" title="Slower"><Icon name="minus" size={14} /></Button>
      <span className="min-w-8 text-center text-base font-semibold tabular-nums text-slate-100">{bpm}</span>
      <Button size="icon-sm" disabled={bpm >= max} onClick={() => onChange(Math.min(max, bpm + step))} aria-label="Faster" title="Faster"><Icon name="plus" size={14} /></Button>
      <span className="text-slate-500">bpm</span>
    </span>
  );
}

/** One bar per beat, beat 1 taller and amber; `beat` (0 = beat 1, null = stopped) lights. */
export function BeatMeter({ beats, beat }: { beats: number; beat: number | null }) {
  return (
    <span className="flex h-9 items-end gap-1.5 rounded-xl border border-slate-700/60 bg-slate-950/50 px-3 py-2" aria-hidden>
      {Array.from({ length: beats }, (_, i) => {
        const on = beat === i;
        const down = i === 0;
        return <span key={i} className={`w-2 rounded-full transition-all duration-75 ${down ? "h-5" : "h-3.5"} ${down ? (on ? "bg-amber-300 shadow-[0_0_10px] shadow-amber-400/80" : "bg-amber-400/30") : on ? "bg-sky-300 shadow-[0_0_10px] shadow-sky-400/80" : "bg-sky-400/25"}`} />;
      })}
    </span>
  );
}

/** A small rounded choice (a backing pattern, a view). */
export const pill = (on: boolean) =>
  `rounded-full border px-2.5 py-1 text-xs font-medium transition ${on ? "border-sky-400/70 bg-sky-500/15 text-sky-100" : "border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200"}`;

/** The hue as a solid stripe across a chord card's top. */
const STRIPE: Record<Hue, string> = {
  sky: "bg-sky-400", teal: "bg-teal-400", violet: "bg-violet-400", emerald: "bg-emerald-400",
  amber: "bg-amber-400", pink: "bg-pink-400", rose: "bg-rose-400", red: "bg-red-400",
};

/** A hue per chord: the same chord the same colour, in order of first showing. */
export function chordHues(chords: string[]): Hue[] {
  const seen = new Map<string, Hue>();
  return chords.map((c) => {
    if (!seen.has(c)) seen.set(c, hueAt(seen.size));
    return seen.get(c)!;
  });
}

/** A chord card: its colour as a top stripe; `lit` fills and lifts it in that colour, `next` dashes its border. */
export function ChordCard({ name, hue, lit, next, children, className = "" }: { name: string; hue: Hue; lit: boolean; next?: boolean; children?: ReactNode; className?: string }) {
  return (
    <span role="listitem" aria-current={lit || undefined}
      className={`relative flex max-w-full flex-col gap-1.5 overflow-hidden rounded-xl border px-1.5 pb-1.5 pt-2.5 transition duration-100 ${lit ? `${HUE_TONES[hue].on} -translate-y-0.5` : next ? "border-dashed border-slate-400/70 bg-slate-950/40" : "border-slate-700/70 bg-slate-950/40"} ${className}`}>
      <span aria-hidden className={`absolute inset-x-0 top-0 h-1 ${STRIPE[hue]} ${lit ? "" : "opacity-60"}`} />
      <span className={`px-1 text-base font-semibold leading-none tracking-tight ${lit ? "text-white" : "text-slate-100"}`}>{name.replace("#", "♯")}</span>
      {children}
    </span>
  );
}
