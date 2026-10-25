"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { Button } from "@/components/ui";
import type { Clef } from "@/features/theory/piano/staff";
import type { Ladder } from "@/features/theory/singing";
import type { BookTune, PlacedNote } from "@/features/theory/singingMelodies";
import MelodyStaff from "./MelodyStaff";

/** cards drawn at first, and added each time the end of the list scrolls into view */
const PAGE = 6;

/**
 * The melody book as one long list, easiest first, each stage under its own heading: a card per tune with its staff
 * and a play button. More cards are drawn as the end of the list comes into view. The `active` card is the one being
 * sung (the last one played or tapped): only it shows the voice. `jump` scrolls to a stage's heading, drawing the
 * list down to it first.
 */
export default function MelodyFeed({ tunes, place, ladder, clef, pitch, beatMs, bpm, active, playing, playFrom, tapped, jump, onPlay, onNote }: {
  tunes: BookTune[];
  place: (t: BookTune) => PlacedNote[];
  ladder: Ladder;
  clef: Clef;
  pitch: RefObject<number | null>;
  beatMs: number;
  bpm: number;
  active: number;
  /** the tune sounding now, by number */
  playing: number | null;
  playFrom: number | null;
  tapped: { n: number; i: number } | null;
  jump: { stage: string; at: number } | null;
  onPlay: (t: BookTune) => void;
  onNote: (t: BookTune, i: number) => void;
}) {
  const [shown, setShown] = useState(PAGE);
  const end = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLOListElement>(null);

  // a jump draws the list down to the end of its stage, then scrolls to its heading
  const need = jump ? tunes.findLastIndex((t) => t.stage.id === jump.stage) + 1 : 0;
  const count = Math.max(shown, need);
  // a new observer per count, so one still in view loads the next page straight away
  useEffect(() => {
    const el = end.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setShown(count + PAGE), { rootMargin: "400px" });
    io.observe(el);
    return () => io.disconnect();
  }, [count]);

  useEffect(() => {
    if (!jump) return;
    const raf = requestAnimationFrame(() => {
      const el = list.current?.querySelector(`[data-stage="${jump.stage}"]`);
      if (!el) return;
      // under the floating settings bar, however tall it is open
      const bar = Math.max(0, ...[...document.querySelectorAll<HTMLElement>(".sticky")].map((b) => (getComputedStyle(b).position === "sticky" ? b.offsetHeight + 8 : 0)));
      window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - bar - 8, behavior: "smooth" });
    });
    return () => cancelAnimationFrame(raf);
  }, [jump, tunes]);

  const visible = tunes.slice(0, count);
  return (
    <>
      <ol ref={list} className="flex flex-col gap-3">
        {visible.map((t, k) => {
          const first = k === 0 || visible[k - 1].stage !== t.stage;
          const live = t.n === active;
          const on = playing === t.n;
          return (
            <li key={t.n} className="flex flex-col gap-3">
              {first && (
                <div data-stage={t.stage.id} className="pt-2">
                  <h3 className="text-sm font-medium text-slate-200">{t.stage.title}</h3>
                  <p className="text-xs text-slate-500">{t.stage.hint}</p>
                </div>
              )}
              <div className={`rounded-xl border p-3 transition ${live ? "border-sky-500/50 bg-slate-900/70" : "border-slate-800 bg-slate-950/40"}`}>
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="text-xs tabular-nums text-slate-500">#{t.n}</span>
                  <span className="text-xs text-slate-400">{t.length === "short" ? "2 bars" : "4 bars"}</span>
                  <Button size="sm" pressed={on} onClick={() => onPlay(t)} className={`ml-auto ${on ? "!border-sky-400/70 !bg-sky-500/20 !text-sky-100" : ""}`}>
                    {on ? "Stop" : `▶ Play · ${bpm} bpm`}
                  </Button>
                </div>
                <MelodyStaff
                  notes={place(t)}
                  ladder={ladder}
                  clef={clef}
                  live={live}
                  pitch={pitch}
                  playFrom={on ? playFrom : null}
                  beatMs={beatMs}
                  tapped={tapped?.n === t.n ? tapped.i : null}
                  onNote={(i) => onNote(t, i)}
                />
              </div>
            </li>
          );
        })}
      </ol>
      <div ref={end} className="py-2 text-center text-xs text-slate-500">
        {count >= tunes.length ? "That's every melody for now." : "More below…"}
      </div>
    </>
  );
}
