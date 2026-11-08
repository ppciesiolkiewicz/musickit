"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Clef } from "@/features/theory/piano/staff";
import type { Ladder } from "@/features/theory/singing";
import { DIFFICULTIES, lengthLabel, type BookTune, type PlacedNote } from "@/features/theory/singingMelodies";
import type { MelodyChord } from "@/features/theory/melodyChords";
import SingAlong, { type SingAlongNav } from "@/features/exercises/basics/sing-along/SingAlong";
import { ShareButton } from "./MelodyControls";

/** cards drawn at first, and added each time the end of the list scrolls into view */
const PAGE = 6;

/**
 * The melody book as one long list, easiest first, each stage under its own heading: a card per tune, each the plan's
 * sing-along player (`SingAlong`: play, stop, the mic, what is heard, a loop over a part, staff or piano roll), with a
 * share and a full screen button. More cards are drawn as the end of the list comes into view. The `active` card is the
 * one picked last (the address keeps it); a press anywhere on a card picks it. Full screen is the active card's own player
 * drawn over the page, so a tune playing plays on as it opens and closes; stepping to a tune not drawn yet draws it.
 */
export default function MelodyFeed({ tunes, place, chordsOf, ladderOf, clef, beatMs, bpm, active, cents, lagMs, playAhead, tapped, onNote, onPick, onFocus, full, onClose, nav, fullSettings, linkTo, reveal }: {
  tunes: BookTune[];
  place: (t: BookTune) => PlacedNote[];
  /** the chords under a tune, named over its staff */
  chordsOf: (t: BookTune) => MelodyChord[];
  /** the ladder a tune's staff is drawn on: the page's key, or for a run the key its first pass is in */
  ladderOf: (t: BookTune) => Ladder;
  clef: Clef;
  beatMs: number;
  bpm: number;
  active: number;
  /** within this many cents counts as on the note */
  cents: number;
  /** how far the voice dot runs behind the bar */
  lagMs: number;
  /** the play-ahead slider for each card's player */
  playAhead?: ReactNode;
  tapped: { n: number; i: number } | null;
  onNote: (t: BookTune, i: number) => void;
  onPick: (t: BookTune) => void;
  /** open the tune full screen */
  onFocus: (t: BookTune) => void;
  /** the active tune is open full screen */
  full: boolean;
  onClose: () => void;
  /** previous and next tune while full screen */
  nav: SingAlongNav;
  /** the settings line shown while full screen (tempo, voice) */
  fullSettings: ReactNode;
  /** a link to the tune, for its share button */
  linkTo: (t: BookTune) => string;
  /** a tune to draw and scroll to on arriving (from a link) */
  reveal: number | null;
}) {
  const [shown, setShown] = useState(() => Math.max(PAGE, tunes.findIndex((t) => t.n === reveal) + 1));
  const end = useRef<HTMLDivElement>(null);
  const [revealed] = useState(reveal);
  useEffect(() => {
    if (revealed !== null) document.querySelector(`[data-tune="${revealed}"]`)?.scrollIntoView({ block: "center" });
  }, [revealed]);

  // the tune open full screen is drawn, however far down the list it is
  const count = Math.max(shown, full ? tunes.findIndex((t) => t.n === active) + 1 : 0);
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
          const open = full && live;
          const notes = place(t);
          const chords = chordsOf(t);
          return (
            <li key={t.n} className="flex flex-col gap-3">
              {first && (
                <div data-stage={t.stage.id} className="pt-2">
                  <h3 className="text-sm font-medium text-slate-200">{t.stage.title}</h3>
                  <p className="text-xs text-slate-500">{t.stage.hint}</p>
                </div>
              )}
              <div data-tune={t.n} onPointerDownCapture={() => !live && onPick(t)} className={`rounded-xl border p-3 transition ${live ? "border-sky-500/50 bg-slate-900/70" : "border-slate-800 bg-slate-950/40 hover:border-slate-600"}`}>
                <SingAlong
                  // a new tune or placing starts the player over (a new tempo runs on)
                  key={`${t.n}-${notes.map((n) => n.midi).join(".")}-${chords.length}`}
                  notes={notes}
                  chords={chords}
                  ladder={ladderOf(t)}
                  clef={clef}
                  beatMs={beatMs}
                  cents={cents}
                  lagMs={lagMs}
                  tapped={tapped?.n === t.n ? tapped.i : null}
                  onNote={(i) => onNote(t, i)}
                  info={open
                    ? <>#{t.n} · {t.stage.title} · {DIFFICULTIES[t.difficulty].title} · {lengthLabel(t)}</>
                    : <><span className="tabular-nums text-slate-500">#{t.n}</span> · {DIFFICULTIES[t.difficulty].title} · {lengthLabel(t)} · {bpm} bpm</>}
                  full={open}
                  onFull={(on) => (on ? onFocus(t) : onClose())}
                  nav={open ? nav : undefined}
                  settings={open ? fullSettings : undefined}
                  tools={<ShareButton link={() => linkTo(t)} />}
                  playAhead={playAhead}
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
