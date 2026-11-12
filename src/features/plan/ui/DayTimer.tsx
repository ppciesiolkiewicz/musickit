"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Icon from "@/components/Icon";
import { Button } from "@/components/ui";
import { audioStartTime, getAudioContext, getOutputBus, wakeAudio } from "@/features/sound";
import { dayClock } from "../model/dayClock";

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const SAVE_EVERY_MS = 5000;

/** A soft two-note chime when time is up, made on the spot (no sample to load). */
function chime() {
  try {
    const ctx = getAudioContext();
    void wakeAudio();
    const start = audioStartTime();
    [660, 880].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = f;
      const t = start + i * 0.25;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
      o.connect(g).connect(getOutputBus());
      o.start(t);
      o.stop(t + 0.65);
      o.onended = () => g.disconnect();
    });
  } catch {
    /* no audio: the ring still shows it */
  }
}

/**
 * The day's countdown, floating at the side of the page: the whole day's minutes, the exercise the time is in now, pause /
 * resume and reset. It starts by itself when `autoStart` (the day shown on page load), saves the used seconds through `onSave`
 * every few seconds, on pause and when the tab hides, so a reload or a later visit picks up where it stopped. The running
 * exercise goes to `onExercise`; a chime at zero. The exercise it names is `focused`, the card in view (not where the day's
 * minutes would put it): while it runs, each second goes to that exercise's spent time, saved with the elapsed seconds. Time is kept from the clock, so a background tab stays right. On a phone it
 * is one short row (ring, time left, the exercise's own time and number, the buttons side by side), so it covers little of
 * the exercise under it.
 */
export default function DayTimer({ minutes, titles, label, elapsed: saved, spent: savedSpent, focused, autoStart, onSave, onExercise, onSpent, above }: {
  minutes: number[]; titles: string[]; label: string; elapsed: number; autoStart: boolean;
  /** seconds already spent on each exercise of the day */
  spent: number[];
  /** the exercise card in view, null when none is */
  focused: number | null;
  onSave: (elapsed: number, spent: number[]) => void; onExercise: (index: number | null) => void;
  /** the seconds per exercise each time they grow */
  onSpent?: (spent: number[]) => void;
  /** small controls floating over the timer in the same corner */
  above?: ReactNode;
}) {
  const [elapsed, setElapsed] = useState(saved);
  const [spent, setSpent] = useState(savedSpent);
  // set while running: the clock time the countdown would have started at, had it never paused
  const [since, setSince] = useState<number | null>(null);
  const clock = dayClock(minutes, elapsed);
  const running = since !== null;

  const save = useRef(onSave);
  const report = useRef(onExercise);
  const grow = useRef(onSpent);
  useEffect(() => {
    save.current = onSave;
    report.current = onExercise;
    grow.current = onSpent;
  });
  const now = useRef(elapsed);
  const spentNow = useRef(spent);
  const focus = useRef(focused);
  // the elapsed seconds last counted into `spent`
  const counted = useRef(elapsed);
  useEffect(() => {
    now.current = elapsed;
    spentNow.current = spent;
    focus.current = focused;
  });
  const store = () => save.current(now.current, spentNow.current);
  // leaving the day (another day, another page) keeps where it stood
  useEffect(() => () => store(), []);

  const start = () => {
    counted.current = now.current;
    setSince(Date.now() - now.current * 1000);
  };
  const pause = () => {
    setSince(null);
    store();
  };

  useEffect(() => {
    if (autoStart && clock.left > 0) start();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- page load only

  const total = clock.total;
  useEffect(() => {
    if (since === null) return;
    const tick = () => {
      const s = Math.min(Math.floor((Date.now() - since) / 1000), total);
      const step = s - counted.current;
      counted.current = s;
      const f = focus.current;
      if (step > 0 && f !== null) {
        const next = spentNow.current.slice();
        next[f] = (next[f] ?? 0) + step;
        spentNow.current = next;
        setSpent(next);
        grow.current?.(next);
      }
      now.current = s;
      setElapsed(s);
      if (s >= total) {
        setSince(null);
        save.current(s, spentNow.current);
        chime();
      }
    };
    const t = setInterval(tick, 250);
    const keep = setInterval(() => save.current(now.current, spentNow.current), SAVE_EVERY_MS);
    const away = () => save.current(now.current, spentNow.current);
    window.addEventListener("pagehide", away);
    document.addEventListener("visibilitychange", away);
    return () => {
      clearInterval(t);
      clearInterval(keep);
      window.removeEventListener("pagehide", away);
      document.removeEventListener("visibilitychange", away);
    };
  }, [since, total]);

  const exercise = clock.left > 0 && (running || elapsed > 0) ? focused : null;
  const leftInExercise = exercise === null ? 0 : Math.max(0, (minutes[exercise] ?? 0) * 60 - (spent[exercise] ?? 0));
  useEffect(() => report.current(exercise), [exercise]);

  const p = clock.total ? 1 - clock.left / clock.total : 0;
  const finished = clock.left === 0;
  return (
    <Corner above={above}>
    <aside
      aria-label="Day timer"
      className="flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-950/90 p-2 shadow-2xl sm:w-[min(20rem,calc(100vw-1.5rem))] sm:gap-3 sm:p-3 shadow-black/50 backdrop-blur"
    >
      <span className="relative grid size-10 shrink-0 place-items-center sm:size-14">
        <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90" aria-hidden>
          <circle cx="18" cy="18" r="15.5" fill="none" strokeWidth="3" className="stroke-slate-800" />
          <circle cx="18" cy="18" r="15.5" fill="none" strokeWidth="3" strokeLinecap="round" className={finished ? "stroke-emerald-400" : running ? "stroke-sky-400" : "stroke-amber-400"} strokeDasharray={`${p * 97.4} 97.4`} />
        </svg>
        <Icon name={finished ? "check" : "timer"} size={16} className={finished ? "text-emerald-300" : running ? "text-sky-300" : "text-amber-300"} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center max-sm:hidden gap-1.5 text-[10px] font-medium uppercase tracking-wider text-slate-400">
          {label}
          {!finished && !running && <span className="rounded-full bg-amber-500/15 px-1.5 text-amber-300">paused</span>}
        </p>
        <p className={`text-lg font-semibold sm:text-2xl leading-tight tabular-nums ${finished ? "text-emerald-300" : "text-slate-50"}`} aria-live="off">{fmt(clock.left)}</p>
        <p className="truncate text-xs text-slate-400" title={exercise !== null ? titles[exercise] : undefined}>
          {finished ? "Day's practice time done" : exercise !== null ? <><span className="tabular-nums text-slate-200">{fmt(leftInExercise)}</span> · <span className="text-sky-300">{exercise + 1}.<span className="max-sm:hidden"> {titles[exercise]}</span></span></> : `${minutes.length} exercises · ${Math.round(clock.total / 60)} min`}
        </p>
      </div>
      <div className="flex items-center gap-1 sm:flex-col">
        {!finished && (
          <Button size="icon-lg" onClick={running ? pause : start} aria-label={running ? "Pause" : elapsed > 0 ? "Resume" : "Start"} title={running ? "Pause" : elapsed > 0 ? "Resume" : "Start"} className="border-sky-400/70! bg-sky-500/25! text-sky-50! hover:bg-sky-500/40!">
            <Icon name={running ? "pause" : "play"} size={16} />
          </Button>
        )}
        <Button size="icon-md" onClick={() => { setSince(null); setElapsed(0); now.current = 0; counted.current = 0; save.current(0, spentNow.current); }} aria-label="Reset the day's timer" title="Reset" disabled={elapsed === 0 && !running}>
          <Icon name="rotate-ccw" size={13} />
        </Button>
      </div>
    </aside>
    </Corner>
  );
}

/**
 * The page's bottom-right corner: `above` (small floating controls) stacked over `children`. Its height (plus a gap) goes to
 * the `--corner-stack` CSS variable, which lifts the app-wide Rec tab (`QuickRecord`) to sit just above it.
 */
export function Corner({ above, children }: { above?: ReactNode; children?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const shown = !!(above || children);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const root = document.documentElement.style;
    const ro = new ResizeObserver(() => root.setProperty("--corner-stack", `${el.offsetHeight + 6}px`));
    ro.observe(el);
    return () => { ro.disconnect(); root.removeProperty("--corner-stack"); };
  }, [shown]);
  if (!shown) return null;
  return <div ref={ref} className="fixed bottom-6 right-2 z-40 flex flex-col items-end gap-2">{above}{children}</div>;
}
