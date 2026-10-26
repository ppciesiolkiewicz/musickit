"use client";

import { useEffect, useState, type ComponentProps } from "react";
import Icon from "@/components/Icon";
import { Button } from "@/components/ui";
import { DIFFICULTIES, type BookTune } from "@/features/theory/singingMelodies";
import MelodyStaff from "./MelodyStaff";
import MicButton from "./MicButton";

/** the staff's size for the screen's height: bigger on a tall screen, never under 1.4 times the card's */
const scaleFor = (h: number) => Math.max(1.4, Math.min(3.2, h / 280));

/**
 * One melody over the whole screen (the browser's full screen where it allows it), drawn big and following the bar, with
 * the dot's distance to the note due. Previous and next step through the tunes listed (or ← and →); Esc closes it.
 */
export default function MelodyFocus({ tune, index, count, staff, bpm, mic, playing, message, onPrev, onNext, onSing, onPlay, onStop, onClose }: {
  tune: BookTune;
  /** its place among the tunes listed, from 0 */
  index: number;
  count: number;
  staff: Omit<ComponentProps<typeof MelodyStaff>, "live" | "scale" | "follow">;
  bpm: number;
  mic: boolean;
  playing: boolean;
  message: string;
  onPrev: () => void;
  onNext: () => void;
  onSing: () => void;
  onPlay: () => void;
  onStop: () => void;
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
        <Button size="sm" onClick={onClose} title="Close full screen (Esc)" aria-label="Close full screen" className="ml-auto !px-2">
          <Icon name="minimize" size={16} />
        </Button>
      </div>
      <div className="grid min-h-0 flex-1 place-items-center">
        <MelodyStaff {...staff} live scale={scale} follow />
      </div>
      <p className="text-center text-xs text-slate-500" aria-live="polite">{message} · ← → for the previous or next melody · Esc to close</p>
    </div>
  );
}
