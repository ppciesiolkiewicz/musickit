"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { Button } from "@/components/ui";
import type { Clef } from "@/features/theory/piano/staff";
import type { Ladder } from "@/features/theory/singing";
import { DIFFICULTIES, type BookTune, type PlacedNote } from "@/features/theory/singingMelodies";
import MelodyStaff from "./MelodyStaff";
import MicButton from "./MicButton";

/** cards drawn at first, and added each time the end of the list scrolls into view */
const PAGE = 6;

/**
 * The melody book as one long list, easiest first, each stage under its own heading: a card per tune with its staff
 * and a play button. More cards are drawn as the end of the list comes into view. The `active` card is the one being
 * sung (the last one picked, played or tapped): only it runs the bar and shows the voice. A click anywhere on a card picks it.
 */
export default function MelodyFeed({ tunes, place, ladder, clef, pitch, beatMs, bpm, active, playing, playFrom, gridBeats, tapped, mic, onPick, onSing, onPlay, onNote }: {
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
  gridBeats: () => number | null;
  tapped: { n: number; i: number } | null;
  /** the mic is listening (to the active tune) */
  mic: boolean;
  onPick: (t: BookTune) => void;
  /** the card's mic button: sing this tune, or stop the mic on the one being sung */
  onSing: (t: BookTune) => void;
  onPlay: (t: BookTune) => void;
  onNote: (t: BookTune, i: number) => void;
}) {
  const [shown, setShown] = useState(PAGE);
  const end = useRef<HTMLDivElement>(null);

  const count = shown;
  // a new observer per count, so one still in view loads the next page straight away
  useEffect(() => {
    const el = end.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setShown(count + PAGE), { rootMargin: "400px" });
    io.observe(el);
    return () => io.disconnect();
  }, [count]);

  const visible = tunes.slice(0, count);
  return (
    <>
      <ol className="flex flex-col gap-3">
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
              <div onClick={() => onPick(t)} className={`rounded-xl border p-3 transition ${live ? "border-sky-500/50 bg-slate-900/70" : "cursor-pointer border-slate-800 bg-slate-950/40 hover:border-slate-600"}`}>
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="text-xs tabular-nums text-slate-500">#{t.n}</span>
                  <span className="text-xs text-slate-400">{DIFFICULTIES[t.difficulty].title} · {t.length === "short" ? "2 bars" : "4 bars"}</span>
                  <MicButton on={live && mic} onClick={() => onSing(t)} />
                  {live && mic && <span className="text-xs text-emerald-300">Listening</span>}
                  <Button size="sm" onClick={() => onPlay(t)} className={`ml-auto ${on ? "!border-sky-400/70 !bg-sky-500/20 !text-sky-100" : ""}`}>
                    ▶ Play · {bpm} bpm
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
                  gridBeats={gridBeats}
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
