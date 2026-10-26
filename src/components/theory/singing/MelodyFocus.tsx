"use client";

import { useEffect, useState, type ComponentProps, type ReactNode } from "react";
import Icon from "@/components/Icon";
import { Button } from "@/components/ui";
import { DIFFICULTIES, type BookTune } from "@/features/theory/singingMelodies";
import MelodyStaff from "./MelodyStaff";
import MicButton from "./MicButton";
import { ClickButton, RestartButton, ShareButton } from "./MelodyControls";

/** the staff's size for the screen's height: bigger on a tall screen, never under 1.2 times the card's */
const scaleFor = (h: number) => Math.max(1.2, Math.min(2.4, h / 380));

/**
 * One melody over the whole page (a modal, not the browser's full screen), drawn big and following the bar, with
 * the dot's distance to the note due, the restart and metronome buttons of a card and the page's settings that matter while
 * singing. Previous and next step through the tunes listed (or ← and →, unless a slider has them); Esc closes it.
 */
export default function MelodyFocus({ tune, index, count, staff, bpm, mic, playing, heard, link, settings, message, onPrev, onNext, onSing, onPlay, onStop, onRestart, onHear, onClose }: {
  tune: BookTune;
  /** its place among the tunes listed, from 0 */
  index: number;
  count: number;
  staff: Omit<ComponentProps<typeof MelodyStaff>, "live" | "scale" | "follow">;
  bpm: number;
  mic: boolean;
  playing: boolean;
  /** the metronome is heard (else muted, still keeping time) */
  heard: boolean;
  /** a link to the tune, for the share button */
  link: () => string;
  /** the page's settings that matter while singing (tempo, accuracy, …), on a line under the buttons */
  settings: ReactNode;
  message: string;
  onPrev: () => void;
  onNext: () => void;
  onSing: () => void;
  onPlay: () => void;
  onStop: () => void;
  onRestart: () => void;
  onHear: (on: boolean) => void;
  onClose: () => void;
}) {
  const [scale, setScale] = useState(2);
  useEffect(() => {
    const fit = () => setScale(scaleFor(window.innerHeight));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // a focused slider keeps its arrows
      if ((e.target as HTMLElement | null)?.closest?.("input, [role=slider]") && e.key !== "Escape") return;
      if (e.key === "ArrowLeft") onPrev();
      else if (e.key === "ArrowRight") onNext();
      else if (e.key === "Escape") onClose();
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onPrev, onNext, onClose]);

  return (
    <div role="dialog" aria-modal aria-label={`Melody #${tune.n}`} className="fixed inset-0 z-[70] flex flex-col gap-4 overflow-hidden bg-slate-950 p-4 sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={onPrev} disabled={index === 0} title="Previous melody (←)" aria-label="Previous melody" className="!px-2">
          <Icon name="chevron-left" size={16} />
        </Button>
        <span className="text-sm tabular-nums text-slate-400">{index + 1} / {count}</span>
        <Button size="sm" onClick={onNext} disabled={index === count - 1} title="Next melody (→)" aria-label="Next melody" className="!px-2">
          <Icon name="chevron-right" size={16} />
        </Button>
        <span className="pl-2 text-sm font-medium text-slate-100">#{tune.n}</span>
        <span className="text-xs text-slate-400">{tune.stage.title} · {DIFFICULTIES[tune.difficulty].title} · {tune.length === "short" ? "2 bars" : "4 bars"}</span>
        <MicButton on={mic} onClick={onSing} offLabel="Sing" onLabel="Listening" />
        <Button size="sm" onClick={onPlay} className={playing ? "!border-sky-400/70 !bg-sky-500/20 !text-sky-100" : ""}>
          ▶ Play · {bpm} bpm
        </Button>
        {playing && (
          <Button size="sm" onClick={onStop} title="Stop the melody" aria-label="Stop the melody" className="!px-2">
            <span className="grid h-4 w-4 place-items-center"><Icon name="square" size={12} fill /></span>
          </Button>
        )}
        <RestartButton onClick={onRestart} />
        <ClickButton heard={heard} onHear={onHear} />
        <span className="ml-auto" />
        <ShareButton link={link} />
        <Button size="sm" onClick={onClose} title="Close full screen (Esc)" aria-label="Close full screen" className="!px-2">
          <Icon name="minimize" size={16} />
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-400">{settings}</div>
      <div className="grid min-h-0 flex-1 place-items-center">
        <MelodyStaff {...staff} live scale={scale} follow />
      </div>
      <p className="text-center text-xs text-slate-500" aria-live="polite">{message} · ← → for the previous or next melody · Esc to close</p>
    </div>
  );
}
