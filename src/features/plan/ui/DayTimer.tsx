"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "@/components/Icon";
import { Button } from "@/components/ui";
import { dayClock } from "../model/dayClock";

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const SAVE_EVERY_MS = 5000;

/** A soft two-note chime when time is up, made on the spot (no sample to load). */
function chime() {
  try {
    const ctx = new AudioContext();
    [660, 880].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = f;
      const t = ctx.currentTime + i * 0.25;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
      o.connect(g).connect(ctx.destination);
      o.start(t);
      o.stop(t + 0.65);
    });
    setTimeout(() => void ctx.close(), 1500);
  } catch {
    /* no audio: the ring still shows it */
  }
}

/**
 * The day's countdown, floating at the side of the page: the whole day's minutes, the exercise the time is in now, pause /
 * resume and reset. It starts by itself when `autoStart` (the day shown on page load), saves the used seconds through `onSave`
 * every few seconds, on pause and when the tab hides, so a reload or a later visit picks up where it stopped. The running
 * exercise goes to `onExercise`; a chime at zero. Time is kept from the clock, so a background tab stays right.
 */
export default function DayTimer({ minutes, titles, label, elapsed: saved, autoStart, onSave, onExercise }: {
  minutes: number[]; titles: string[]; label: string; elapsed: number; autoStart: boolean;
  onSave: (elapsed: number) => void; onExercise: (index: number | null) => void;
}) {
  const [elapsed, setElapsed] = useState(saved);
  // set while running: the clock time the countdown would have started at, had it never paused
  const [since, setSince] = useState<number | null>(null);
  const clock = dayClock(minutes, elapsed);
  const running = since !== null;

  const save = useRef(onSave);
  const report = useRef(onExercise);
  useEffect(() => {
    save.current = onSave;
    report.current = onExercise;
  });
  const now = useRef(elapsed);
  useEffect(() => {
    now.current = elapsed;
  });
  // leaving the day (another day, another page) keeps where it stood
  useEffect(() => () => save.current(now.current), []);

  const start = () => setSince(Date.now() - now.current * 1000);
  const pause = () => {
    setSince(null);
    save.current(now.current);
  };

  useEffect(() => {
    if (autoStart && clock.left > 0) setSince(Date.now() - now.current * 1000);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- page load only

  const total = clock.total;
  useEffect(() => {
    if (since === null) return;
    const tick = () => {
      const s = Math.floor((Date.now() - since) / 1000);
      setElapsed(s);
      if (s >= total) {
        setSince(null);
        save.current(s);
        chime();
      }
    };
    const t = setInterval(tick, 250);
    const keep = setInterval(() => save.current(now.current), SAVE_EVERY_MS);
    const away = () => save.current(now.current);
    window.addEventListener("pagehide", away);
    document.addEventListener("visibilitychange", away);
    return () => {
      clearInterval(t);
      clearInterval(keep);
      window.removeEventListener("pagehide", away);
      document.removeEventListener("visibilitychange", away);
    };
  }, [since, total]);

  const exercise = clock.left > 0 && (running || elapsed > 0) ? clock.exercise : null;
  useEffect(() => report.current(exercise), [exercise]);

  const p = clock.total ? 1 - clock.left / clock.total : 0;
  const finished = clock.left === 0;
  return (
    <aside
      aria-label="Day timer"
      className="fixed bottom-3 right-3 z-40 flex w-[min(20rem,calc(100vw-1.5rem))] items-center gap-3 rounded-2xl border border-slate-700 bg-slate-950/90 p-3 shadow-2xl shadow-black/50 backdrop-blur sm:bottom-6 sm:right-6"
    >
      <span className="relative grid size-14 shrink-0 place-items-center">
        <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90" aria-hidden>
          <circle cx="18" cy="18" r="15.5" fill="none" strokeWidth="3" className="stroke-slate-800" />
          <circle cx="18" cy="18" r="15.5" fill="none" strokeWidth="3" strokeLinecap="round" className={finished ? "stroke-emerald-400" : running ? "stroke-sky-400" : "stroke-amber-400"} strokeDasharray={`${p * 97.4} 97.4`} />
        </svg>
        <Icon name={finished ? "check" : "timer"} size={18} className={finished ? "text-emerald-300" : running ? "text-sky-300" : "text-amber-300"} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-slate-400">
          {label}
          {!finished && !running && <span className="rounded-full bg-amber-500/15 px-1.5 text-amber-300">paused</span>}
        </p>
        <p className={`text-2xl font-semibold leading-tight tabular-nums ${finished ? "text-emerald-300" : "text-slate-50"}`} aria-live="off">{fmt(clock.left)}</p>
        <p className="truncate text-xs text-slate-400" title={exercise !== null ? titles[exercise] : undefined}>
          {finished ? "Day's practice time done" : exercise !== null ? <><span className="tabular-nums text-slate-200">{fmt(clock.leftInExercise)}</span> · <span className="text-sky-300">{exercise + 1}. {titles[exercise]}</span></> : `${minutes.length} exercises · ${Math.round(clock.total / 60)} min`}
        </p>
      </div>
      <div className="flex flex-col gap-1">
        {!finished && (
          <Button size="icon-lg" onClick={running ? pause : start} aria-label={running ? "Pause" : elapsed > 0 ? "Resume" : "Start"} title={running ? "Pause" : elapsed > 0 ? "Resume" : "Start"} className="border-sky-400/70! bg-sky-500/25! text-sky-50! hover:bg-sky-500/40!">
            <Icon name={running ? "pause" : "play"} size={16} />
          </Button>
        )}
        <Button size="icon-md" onClick={() => { setSince(null); setElapsed(0); save.current(0); }} aria-label="Reset the day's timer" title="Reset" disabled={elapsed === 0 && !running}>
          <Icon name="rotate-ccw" size={13} />
        </Button>
      </div>
    </aside>
  );
}
