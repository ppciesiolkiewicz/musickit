"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type PointerEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Icon from "@/components/Icon";
import InputChip from "@/components/InputChip";
import { ToolHeadphonesHint } from "@/components/practice/exerciseStep";
import { DropdownSection, Hint, HintToggle, KeyCap } from "@/components/ui";
import { useSpaceKey } from "@/components/practice/toolKeys";
import { useCoverage } from "@/features/guide/useCoverage";
import { useLevelAtLeast } from "@/features/guide/Tier";
import ToolSettings, { Volume } from "@/components/practice/ToolSettings";
import { useExerciseSetting } from "@/components/practice/exerciseSettings";
import { useAccuracy } from "@/features/theory/useAccuracy";
import type { Clef } from "@/features/theory/piano/staff";
import type { Ladder } from "@/features/theory/singing";
import type { PlacedNote } from "@/features/theory/singingMelodies";
import type { MelodyChord } from "@/features/theory/melodyChords";
import LoopStrip from "./LoopStrip";
import { passAt } from "./passes";
import PianoRoll from "./PianoRoll";
import StreamStaff from "./StreamStaff";
import { useSingAlong, type Layer } from "./useSingAlong";

/** full screen draws the view bigger for the screen's height, never under 1.2 times */
const scaleFor = (h: number) => Math.max(1.2, Math.min(2.4, h / 380));
/** a sideways drag this long (px), more sideways than up or down, steps to the previous or next tune */
const SWIPE_PX = 60;

const noSubscribe = () => () => {};

/** previous and next in a list of tunes, for full screen: arrows on its margins, ← and →, and a swipe */
export interface SingAlongNav {
  prev?: () => void;
  next?: () => void;
  /** where this tune is in the list ("3 / 40") */
  label?: ReactNode;
}

function MarginArrow({ side, onClick }: { side: "left" | "right"; onClick?: () => void }) {
  const title = side === "left" ? "Previous (←)" : "Next (→)";
  return (
    <button type="button" onClick={onClick} disabled={!onClick} title={title} aria-label={title}
      className={`absolute top-1/2 z-10 grid h-16 w-10 -translate-y-1/2 place-items-center rounded-xl border border-slate-800 bg-slate-900/70 text-slate-300 transition hover:border-slate-500 hover:text-slate-100 disabled:opacity-25 sm:w-12 ${side === "left" ? "left-1 sm:left-2" : "right-1 sm:right-2"}`}>
      <Icon name={side === "left" ? "chevron-left" : "chevron-right"} size={22} />
    </button>
  );
}

function IconButton({ on, tone = "sky", big, title, onClick, children }: { on?: boolean; tone?: "sky" | "emerald" | "amber"; big?: boolean; title: string; onClick: () => void; children: ReactNode }) {
  const lit = { sky: "border-sky-400/70 bg-sky-500/20 text-sky-100", emerald: "border-emerald-400/70 bg-emerald-500/25 text-emerald-100", amber: "border-amber-400/60 bg-amber-500/15 text-amber-200" }[tone];
  return (
    <button type="button" onClick={onClick} title={title} aria-label={title} aria-pressed={on}
      className={`flex items-center justify-center rounded-lg border transition ${big ? "h-11 min-w-14 gap-2 px-3" : "h-8 min-w-8 gap-1.5 px-1.5"} ${on ? lit : "border-slate-700 text-slate-300 hover:border-slate-500"}`}>
      {children}
    </button>
  );
}

const LAYERS: { id: Layer; label: string; icon: "piano" | "music" | "metronome"; what: string }[] = [
  { id: "tune", label: "Tune", icon: "piano", what: "the tune on the piano" },
  { id: "chords", label: "Chords", icon: "music", what: "the chords under the tune" },
  { id: "click", label: "Click", icon: "metronome", what: "the metronome on the tune's beats" },
];

/**
 * A tune to sing along: one Play button that turns into Stop while the tune plays (the Space key cap inside it), and the
 * mic (any button switches it on); mute buttons for the tune and its chords (when it has them) beside them, and the
 * metronome in the settings dropdown, each on or off while it plays, the bar running either way; a loop over a part of
 * the tune set on a strip of the whole tune (on by default, over all of it; the strip shows only while looping), and the tune drawn on an endless staff or
 * as a piano roll that keeps the line the voice took. Full screen is a page modal (Esc closes it), drawn big, the notes
 * sliding under a bar that stays put so the voice dot holds its place. It is the same player moved over the page, so a
 * tune playing plays on into full screen and back out of it. Key it by the tune: a new one starts over (a new tempo does not).
 * The (?) arms a shared `HintProvider` (from a host up the tree, e.g. the singing page): once armed, hovering a
 * control (or tapping it, on touch) shows what it does instead of firing it.
 */
export default function SingAlong({ notes, chords, ladder, clef, beatMs, click, listen, tapped, onNote, info, cents: centsProp, lagMs, full: fullProp, onFull, nav, tools, settings, playAhead }: {
  notes: PlacedNote[];
  chords: MelodyChord[];
  /** the metronome heard from the start; off by default */
  click?: boolean;
  /** the mic goes on when this turns true (or the tune mounts with it) and off when it turns false, e.g. as the tune is picked in a list */
  listen?: boolean;
  ladder: Ladder;
  clef: Clef;
  beatMs: number;
  tapped: number | null;
  onNote: (i: number) => void;
  /** words about the tune, after the buttons; a function gets the tune's beat playing (null when stopped) */
  info: ReactNode | ((at: number | null) => ReactNode);
  /** within this many cents counts as on the note (the student's accuracy setting when left out) */
  cents?: number;
  /** how far the voice dot runs behind the bar (the app's default when left out) */
  lagMs?: number;
  /** full screen held by the caller (with `onFull`), so it stays open across tunes; left out, the player keeps its own */
  full?: boolean;
  onFull?: (on: boolean) => void;
  /** previous and next tune while full screen */
  nav?: SingAlongNav;
  /** more controls, in the settings dropdown (a share button, …) */
  tools?: ReactNode;
  /** settings shown on a line under the buttons while full screen (tempo, accuracy, …) */
  settings?: ReactNode;
  /** the play-ahead slider, in the settings dropdown (how far the moving bar runs ahead of the voice dot) */
  playAhead?: ReactNode;
}) {
  useCoverage({ hints: 7 });
  const total = notes[notes.length - 1].at + notes[notes.length - 1].beats;
  // looping a part is a Standard control; hidden, the clock loops the whole tune
  const looping = useLevelAtLeast("standard");
  const { focus, ...sa } = useSingAlong({ notes, chords, beatMs, total, click, listen, loopControl: looping });
  const [look] = useExerciseSetting("view");
  const [storedCents] = useAccuracy();
  const cents = centsProp ?? storedCents;
  const [ownFull, setOwnFull] = useState(false);
  const full = fullProp ?? ownFull;
  const setFull = (on: boolean) => (onFull ? onFull(on) : setOwnFull(on));
  // the keys and the swipe read the latest of these, so their listener isn't put on again each render
  const latest = useRef({ setFull, nav });
  useEffect(() => {
    latest.current = { setFull, nav };
  });
  const swipe = useRef<{ x: number; y: number; id: number } | null>(null);
  const swipeStart = (e: PointerEvent) => {
    swipe.current = nav ? { x: e.clientX, y: e.clientY, id: e.pointerId } : null;
  };
  const swipeEnd = (e: PointerEvent) => {
    const s = swipe.current;
    swipe.current = null;
    if (!s || s.id !== e.pointerId) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (Math.abs(dx) < SWIPE_PX || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    (dx > 0 ? nav?.prev : nav?.next)?.();
  };
  const [scale, setScale] = useState(2);
  useEffect(() => {
    if (!full) return;
    const fit = () => setScale(scaleFor(window.innerHeight));
    const onKey = (e: KeyboardEvent) => {
      const { setFull, nav } = latest.current;
      if (e.key === "Escape") setFull(false);
      // a focused slider or menu keeps its arrows
      else if ((e.key === "ArrowLeft" || e.key === "ArrowRight") && nav && !(e.target as HTMLElement | null)?.closest?.("input, select, [role=slider], [role=listbox], [role=menu]")) {
        (e.key === "ArrowLeft" ? nav.prev : nav.next)?.();
      } else return;
      e.preventDefault();
    };
    fit();
    window.addEventListener("resize", fit);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("resize", fit);
      window.removeEventListener("keydown", onKey);
    };
  }, [full]);
  // full screen is drawn over the page from the body (out of any card's stacking), the same player so a tune plays on;
  // back in its place it is scrolled into view, so it doesn't stop for being off screen
  const mounted = useSyncExternalStore(noSubscribe, () => true, () => false);
  const root = useRef<HTMLDivElement | null>(null);
  const setRoot = useCallback((el: HTMLDivElement | null) => {
    root.current = el;
    focus(el);
  }, [focus]);
  // Play brings the tune itself into view, so the bar is seen from its first beat
  const tune = useRef<HTMLDivElement | null>(null);
  const play = () => {
    void sa.play();
    if (!full) tune.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  };
  // Space presses Play, or Stop while the tune plays
  const { ref: spaceRef, armed: spaceArmed } = useSpaceKey(() => (sa.playing ? sa.stop() : play()), setRoot);
  const wasFull = useRef(full);
  useLayoutEffect(() => {
    if (wasFull.current && !full) root.current?.scrollIntoView({ block: "nearest" });
    wasFull.current = full;
  }, [full]);
  // full screen never scrolls: the tune shrinks until it fits the room left under the buttons
  const body = useRef<HTMLDivElement | null>(null);
  useLayoutEffect(() => {
    const el = body.current;
    if (full && el && el.scrollHeight > el.clientHeight + 1 && scale > 0.6) setScale(scale * 0.94);
  }, [full, scale, look, notes, chords]);
  // the page behind stays put while full screen is up
  useEffect(() => {
    if (!full) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [full]);
  const size = full ? scale : 1;
  const pass = sa.playing ? passAt(sa.frame.passes, sa.frame.s) : undefined;
  const at = pass ? pass.from + sa.frame.s - pass.start : null;
  const seg = (on: boolean) => `px-2.5 py-1 text-[11px] transition ${on ? "bg-sky-500/20 text-sky-100" : "text-slate-400 hover:text-slate-200"}`;

  const view = (
    <div ref={spaceRef} role={full ? "dialog" : undefined} aria-modal={full || undefined} aria-label={full ? "Sing along" : undefined}
      className={full ? `fixed inset-0 z-[70] flex flex-col gap-4 overflow-hidden bg-slate-950 p-4 pb-2 sm:p-6 sm:pb-3 ${nav ? "px-12 sm:px-16" : ""}` : "flex flex-col gap-2"}>
      {full && nav && <MarginArrow side="left" onClick={nav.prev} />}
      {full && nav && <MarginArrow side="right" onClick={nav.next} />}
      <div className="flex items-center gap-1.5">
        <div className="min-w-0 flex-1 text-xs font-medium text-slate-200">
          {typeof info === "function" ? info(at) : info}{sa.status === "denied" ? " · microphone blocked in the browser" : ""}
        </div>
        <HintToggle />
        <Hint title="Full screen" description="Enlarges the tune. ← and → move between tunes, Esc closes it.">
          <IconButton on={full} title={full ? "Close full screen (Esc)" : "Full screen"} onClick={() => setFull(!full)}>
            <Icon name={full ? "minimize" : "maximize"} size={15} />
          </IconButton>
        </Hint>
      </div>
      <div aria-hidden className="my-1 h-px w-1/3 bg-slate-700" />
      <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
        <span data-tour="sing-play" className="inline-flex items-center gap-1.5">
          <Hint title={sa.playing ? "Stop" : "Play"} description={sa.playing ? "Ends the tune." : "Starts the tune from the start. While it plays, the button turns into Stop."}>
            <IconButton big on={sa.playing} title={`${sa.playing ? "Stop" : "Play"}${spaceArmed ? " (Space)" : ""}`} onClick={sa.playing ? sa.stop : play}>
              <Icon name={sa.playing ? "square" : "play"} size={sa.playing ? 18 : 20} fill={sa.playing} />
              {spaceArmed && <KeyCap className="hidden md:inline">Space</KeyCap>}
            </IconButton>
          </Hint>
        </span>
        <span data-tour="sing-mic" className="inline-flex">
          <Hint title="Mic" description="Marks the note you're on. Play starts it for you; this button also opens the list of inputs, with each input's level and Stop.">
            <InputChip status={sa.status} mic={{ on: sa.mic, onToggle: sa.toggleMic }} />
          </Hint>
        </span>
        <ToolHeadphonesHint />
        {LAYERS.filter((l) => l.id === "tune" || (l.id === "chords" && chords.length)).map((l) => {
          const on = sa.heard[l.id];
          return (
            <Hint key={l.id} title={`Mute ${l.label.toLowerCase()}`} description={`Silences ${l.what}. The bar keeps going.`}>
              <IconButton on={!on} tone="amber" title={on ? `Mute ${l.what}` : `Hear ${l.what}`} onClick={() => sa.toggleHeard(l.id)}>
                <Icon name={l.icon} size={14} />
                <span className={`text-[11px] ${on ? "" : "line-through"}`}>{l.label}</span>
              </IconButton>
            </Hint>
          );
        })}
        <Hint title="Volume" description="Sets every sound in the app, not just this tune.">
          <span className="ml-1 flex items-center border-l border-slate-800 pl-2"><Volume /></span>
        </Hint>
        {full && nav?.label && <span className="tabular-nums text-slate-300">{nav.label}</span>}
        <span className="ml-auto" />
        <Hint title="Sound and view settings" description="Accuracy, melody view, the metronome, play-ahead, share.">
          <ToolSettings volume={false} accuracy view more={<>
            <DropdownSection title="Playback">
              <div role="group" aria-label="Playback" className="flex w-fit overflow-hidden rounded-lg border border-slate-700">
                {LAYERS.filter((l) => l.id === "click").map((l) => {
                  const on = sa.heard[l.id];
                  return (
                    <button key={l.id} type="button" aria-pressed={on} onClick={() => sa.toggleHeard(l.id)}
                      title={on ? `Mute ${l.what} (the bar keeps going)` : `Hear ${l.what}`}
                      className={`flex items-center gap-1 ${seg(on)} ${on ? "" : "line-through decoration-slate-500"}`}>
                      <Icon name={l.icon} size={13} />{l.label}
                    </button>
                  );
                })}
              </div>
            </DropdownSection>
            {playAhead && <DropdownSection title="Play-ahead">{playAhead}</DropdownSection>}
            {tools && <DropdownSection title="Share">{tools}</DropdownSection>}
          </>} />
        </Hint>
      </div>
      {full && settings && <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-400">{settings}</div>}
      {/* the loop control: Standard only (see `looping`) */}
      {looping && <div data-tour="sing-loop" className="flex items-center gap-4">
        <Hint title="Loop" description="Repeats a part of the tune. Drag its markers on the strip.">
          <IconButton on={sa.loop} tone="sky" title={sa.loop ? "Stop looping" : "Loop a part of the tune"} onClick={() => sa.setLoop(!sa.loop)}>
            <Icon name="repeat" size={15} />
          </IconButton>
        </Hint>
        {sa.loop && <div className="min-w-0 flex-1"><LoopStrip key={total} notes={notes} total={total} region={sa.region} loop={sa.loop} at={at} onRegion={sa.setRegion} /></div>}
      </div>}
      <div ref={body} className={full ? "flex min-h-0 flex-1 touch-pan-y flex-col overflow-hidden" : "contents"}
        onPointerDown={full ? swipeStart : undefined} onPointerUp={full ? swipeEnd : undefined} onPointerCancel={() => { swipe.current = null; }}>
        <div ref={tune} data-tour="sing-tune" className={full ? "my-auto" : ""}>
        {look === "staff" ? (
          <StreamStaff frame={sa.frame} notes={notes} chords={chords} ladder={ladder} clef={clef} beatMs={beatMs} tapped={tapped} onNote={onNote} scale={size} cents={cents} lagMs={lagMs} />
        ) : (
          <PianoRoll frame={sa.frame} notes={notes} chords={chords} ladder={ladder} beatMs={beatMs} tapped={tapped} onNote={onNote} scale={size} cents={cents} lagMs={lagMs} />
        )}
        </div>
      </div>
    </div>
  );
  return full && mounted ? createPortal(view, document.body) : view;
}
