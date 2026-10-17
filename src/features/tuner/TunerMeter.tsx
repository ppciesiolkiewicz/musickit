"use client";

import type { ReactNode } from "react";
import type { TunerRead } from "./choice";
import Needle from "./Needle";

/** The colour of a reading: green in tune (within 5 cents), amber close, rose far, grey when there is none. */
export const readingColour = (read: TunerRead | null) =>
  read === null ? "var(--color-slate-600)" : Math.abs(read.cents) < 5 ? "var(--color-emerald-400)" : Math.abs(read.cents) < 20 ? "var(--color-amber-400)" : "var(--color-rose-400)";

const signed = (c: number) => `${Math.round(c) > 0 ? "+" : ""}${Math.round(c) || 0}`;

/**
 * The tuner's meter: the note heard, a needle on a cents scale and a line of detail. `size` "page" is the big one of the tuner page
 * (with the in-tune zone, the scale's labels and Tune up/down); "compact" fits a looper block. `idle` shows in place of the note
 * (page) or the detail line (compact) while nothing is heard.
 */
export default function TunerMeter({ hz, read, size = "page", idle }: { hz: number | null; read: TunerRead | null; size?: "page" | "compact"; idle?: ReactNode }) {
  const cents = read?.cents ?? 0;
  const inTune = read !== null && Math.abs(cents) < 5;
  const colour = readingColour(read);
  const label = read ? `${Math.round(cents)} cents ${cents > 0 ? "sharp" : "flat"}` : "No note";
  const heard = read && read.string !== null ? `${read.heard.name}${read.heard.octave}` : null;

  if (size === "compact") {
    return (
      <>
        <div className="flex items-baseline gap-1 pt-1" aria-live="polite">
          <span className="text-4xl font-light leading-none tabular-nums" style={{ color: colour }}>{read ? read.name : "–"}</span>
          <span className="w-5 text-sm text-slate-400">{read ? read.octave : ""}</span>
        </div>
        <svg viewBox="-110 -6 220 34" className="w-full max-w-[16rem]" role="img" aria-label={label}>
          {Array.from({ length: 11 }, (_, i) => {
            const c = (i - 5) * 10;
            return <line key={c} x1={c * 2} x2={c * 2} y1={c === 0 ? 0 : 6} y2={c === 0 ? 26 : 20} stroke={c === 0 ? "var(--color-emerald-400)" : "var(--color-slate-600)"} strokeWidth={c === 0 ? 2 : 1} />;
          })}
          <Needle cents={cents} visible={read !== null} colour={colour} />
        </svg>
        <p className="h-4 text-[11px] tabular-nums text-slate-400">{read && hz !== null ? `${hz.toFixed(1)} Hz${heard ? ` · ${heard}` : ""} · ${signed(cents)} cents` : idle}</p>
      </>
    );
  }

  const hint = !read ? "" : read.string !== null && !inTune ? (cents > 0 ? "Tune down" : "Tune up") : inTune ? "In tune" : "";
  return (
    <>
      <div className="flex h-28 flex-col items-center justify-center" aria-live="polite">
        {read ? (
          <div className="flex items-baseline gap-1">
            <span className="text-8xl font-light leading-none tabular-nums transition-colors" style={{ color: colour }}>{read.name}</span>
            <span className="text-2xl text-slate-400">{read.octave}</span>
          </div>
        ) : idle}
      </div>

      <div className="w-full max-w-xl">
        <svg viewBox="-110 -10 220 40" className="w-full" role="img" aria-label={read ? label : "No note detected"}>
          {/* the in-tune zone, five cents either side */}
          <rect x={-10} y={4} width={20} height={24} rx={3} fill="var(--color-emerald-400)" opacity={inTune ? 0.25 : 0.1} />
          {Array.from({ length: 21 }, (_, i) => {
            const c = (i - 10) * 5;
            const major = c % 25 === 0;
            return <line key={c} x1={c * 2} x2={c * 2} y1={c === 0 ? 4 : major ? 8 : 12} y2={c === 0 ? 28 : major ? 24 : 20} stroke={c === 0 ? "var(--color-emerald-400)" : "var(--color-slate-600)"} strokeWidth={c === 0 ? 1.5 : major ? 1 : 0.6} strokeLinecap="round" />;
          })}
          <Needle cents={cents} visible={read !== null} colour={colour} />
        </svg>
        <div className="mt-1 grid grid-cols-5 text-[11px] tabular-nums text-slate-500">
          <span>−50 flat</span><span className="text-center">−25</span><span className="text-center text-slate-400">0</span><span className="text-center">+25</span><span className="text-right">sharp +50</span>
        </div>
      </div>

      <p className="h-5 text-center text-sm tabular-nums text-slate-400">
        {read && hz !== null ? (
          <>
            <span className="font-medium" style={{ color: colour }}>{signed(cents)} cents{hint ? ` · ${hint}` : ""}</span>
            <span className="text-slate-500"> · {hz.toFixed(1)} Hz{heard ? ` · hearing ${heard}` : ""}</span>
          </>
        ) : null}
      </p>
    </>
  );
}
