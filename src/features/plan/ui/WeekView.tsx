"use client";

import { sectionStarts } from "../model/sections";
import { shownTitle } from "../model/moves";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Icon from "@/components/Icon";
import { DISPLAY } from "@/components/landing/Display";
import DayTimer, { Corner } from "./DayTimer";
import DayEditor from "./DayEditor";
import ExerciseCard from "./ExerciseCard";
import { dayTime, elapsedOn, spentOn, type DayTime } from "../model/planTime";
import { addDays, dayProgress, doneKey, practiceDays } from "../model/schedule";
import { dayName } from "../model/today";
import type { StoredPlan } from "../model/types";
import type { Stars } from "@/features/progress/stars";

/**
 * The week: a strip of its practice days (`practiceDays`: the days that hold exercises, so a week of three practice days
 * shows three; each is named by its weekday and its date, "Sunday" over "11 Nov" on its button and "Sunday 11 Nov 2026" in the day's heading (`dayName`); every one can be opened; days ahead are dashed and marked "coming up") and the chosen day,
 * drawn by `DayPanel`. `today` and `day` are day indexes of the plan, counted from its start, rest days included. Only the day shown when the page opened starts its timer by itself. With `ended` (the plan's days are
 * over; `today` is then its last day, so every day is open) no day is marked "Today" and no timer starts by itself.
 */
export default function WeekView({ plan, today, ended = false, day, onDay, onRate, ratedBy, times = [], onTime, onEdit, onEditing, corner }: {
  plan: StoredPlan; today: number; ended?: boolean; day: number; onDay: (d: number) => void; onRate: (day: number, ex: number, stars: Stars | null) => void;
  /** read-only: whose stars the cards show (`ExerciseCard`) */
  ratedBy?: string;
  /** the day timer's records of this plan (`planTime.ts`), kept apart from the plan */
  times?: DayTime[];
  /** saves the day timer's used seconds and the seconds spent on each exercise; without it (a preview) there is no timer */
  onTime?: (time: DayTime) => void;
  /** saves a day edited in place (`DayEditor`); without it the day has no Edit */
  onEdit?: (next: StoredPlan) => void;
  /** told which day is open in the day editor (null: none), so the browser AI's tools leave that day alone */
  onEditing?: (day: number | null) => void;
  /** small controls floating in the bottom-right corner, over the timer */
  corner?: ReactNode;
}) {
  // the day being edited: the other days can't be opened until Done or Cancel (another day would throw the draft away)
  const [editing, setEditing] = useState<number | null>(null);
  const tellEditing = useCallback((d: number | null) => {
    setEditing(d);
    onEditing?.(d);
  }, [onEditing]);
  // only the day shown when the page opened starts its timer by itself
  const [autoDay, setAutoDay] = useState<number | null>(!ended && day <= today ? day : null);
  const d = plan.config.days[day];
  // the days shown: the plan's practice days
  const shown = practiceDays(plan);
  // each day is named by its weekday and its date, counted from the plan's start
  const nameOf = (i: number) => dayName(addDays(plan.startedOn, i));
  const openDay = (i: number) => {
    setAutoDay(null);
    onDay(i);
  };
  return (
    <div className="flex flex-col gap-5">
      <div data-tour="plan-week" className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${shown.length}, minmax(0, 1fr))` }} role="tablist" aria-label="Days">
        {shown.map((i) => {
          const ahead = i > today;
          const p = dayProgress(plan, i);
          const on = i === day;
          return (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => openDay(i)}
              disabled={editing !== null && i !== editing}
              title={`${nameOf(i).weekday} ${nameOf(i).full}${plan.config.days[i].theme ? `: ${ahead ? "coming up, " : ""}${plan.config.days[i].theme}` : ""}`}
              className={`relative flex cursor-pointer flex-col items-center gap-0.5 overflow-hidden rounded-xl border px-1 py-2 text-xs transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400 ${on ? "border-sky-400 bg-sky-500/25 text-sky-50 shadow-md shadow-sky-500/20" : ahead ? "border-dashed border-slate-700 bg-transparent text-slate-500 hover:border-slate-500 hover:text-slate-300" : p === 1 ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-100 hover:border-emerald-400" : "border-slate-600 bg-slate-800/60 text-slate-200 hover:border-sky-500/60 hover:bg-slate-800"}`}
            >
              <span className={`text-[10px] font-medium uppercase tracking-wider ${i === today && !ended ? "text-amber-300" : on ? "text-sky-200" : "text-slate-500"}`}>
                <span className="sm:hidden">{nameOf(i).short}</span>
                <span className="hidden sm:inline">{nameOf(i).weekday}</span>
              </span>
              <span className="text-sm font-semibold tabular-nums sm:text-base">{nameOf(i).date}</span>
              {p === 1 ? <Icon name="check" size={12} className="text-emerald-300" /> : i === today && !ended ? <span className="text-[10px] font-medium uppercase leading-3 tracking-wider text-amber-300">Today</span> : <span className="h-3" />}
              <span aria-hidden className="absolute inset-x-0 bottom-0 h-1 bg-emerald-400/80" style={{ width: `${p * 100}%` }} />
            </button>
          );
        })}
      </div>

      <DayPanel
        key={day}
        plan={plan}
        day={day}
        heading={<>
          <h2 className="text-2xl text-slate-50" style={DISPLAY}>{nameOf(day).weekday} {nameOf(day).full}{d.theme ? `: ${d.theme}` : ""}</h2>
          {day > today && <span className="rounded-full border border-dashed border-slate-600 px-2 py-0.5 text-[11px] text-slate-400">Coming up in {day - today} day{day - today > 1 ? "s" : ""}</span>}
        </>}
        timerLabel={nameOf(day).weekday}
        autoStart={autoDay === day}
        onRate={onRate}
        ratedBy={ratedBy}
        times={times}
        onTime={onTime}
        onEdit={onEdit}
        onEditing={tellEditing}
        corner={corner}
      />
    </div>
  );
}

/**
 * One day of a plan: its heading (the host's words), how many exercises and minutes, each exercise an `ExerciseCard`, and one
 * floating timer that counts down the whole day (`DayTimer`), its used time saved apart from the plan (`times`, `onTime`). The
 * card in view (the one across the middle of the screen, or the last one once the page is scrolled to the end) is the exercise
 * the timer names and counts time for, and it is lifted a little. With `onEdit` the day has Edit (`DayEditor`). Without `onRate`
 * the cards have no stars (a past day, read-only). The week's strip and today's plan (`DayPlan`) both draw a day with it.
 */
export function DayPanel({ plan, day, heading, timerLabel, autoStart, onRate, ratedBy, times = [], onTime, onEdit, editLocked = false, onEditing, corner, readOnly = false }: {
  plan: StoredPlan; day: number; heading: ReactNode;
  /** the day timer's name for the day ("Day 3", "Today") */
  timerLabel: string;
  /** the timer starts by itself (the day shown when the page opened) */
  autoStart: boolean;
  onRate?: (day: number, ex: number, stars: Stars | null) => void;
  /** without `onRate`: whose stars the cards show, read-only */
  ratedBy?: string;
  times?: DayTime[];
  onTime?: (time: DayTime) => void;
  onEdit?: (next: StoredPlan) => void;
  /** Edit shows but can't be pressed (another plan is being asked for) */
  editLocked?: boolean;
  onEditing?: (day: number | null) => void;
  corner?: ReactNode;
  /** a past day shown under today's: no tour hooks, and its cards' addresses kept apart from today's */
  readOnly?: boolean;
}) {
  // the day editor is open: the cards give way to it and the timer is put away until Done or Cancel
  const [editing, setEditing] = useState(false);
  useEffect(() => onEditing?.(editing ? day : null), [editing, day, onEditing]);
  const d = plan.config.days[day];
  const [now, setNow] = useState<number | null>(null);
  const [auto, setAuto] = useState(autoStart);
  const total = d.exercises.reduce((n, e) => n + e.minutes, 0);
  // a day in more than one area names each area's part (DayShape1)
  const sections = sectionStarts(d.exercises);
  const cards = useRef<(HTMLLIElement | null)[]>([]);
  const focused = useInView(cards, day);
  // the day timer is counting (not paused, day not over): the card it counts for shows its time ticking, rated or not,
  // past its planned time or not (the timer counts every second to the card in view)
  const [running, setRunning] = useState(false);
  // the timer's seconds per exercise as they count, so the cards show them live; until it reports, the saved ones
  // (kept with the exercises they count for: another plan or an edit drops them)
  const ids = d.exercises.map((e) => e.id).join(",");
  const [live, setLive] = useState<{ ids: string; spent: number[] } | null>(null);
  const saved = spentOn(times, day, d.exercises);
  const spent = live?.ids === ids ? live.spent : saved;
  return (
    <>
      <div data-tour={readOnly ? undefined : "plan-day"} className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        {heading}
        <span className="text-xs text-slate-400">{d.exercises.length} exercises · {total} min</span>
        {onEdit && !editing && (
          <button type="button" disabled={editLocked} onClick={() => {
            // the timer is put away: it neither starts again by itself nor keeps the seconds of the old order when it comes back
            setAuto(false);
            setNow(null);
            setLive(null);
            setEditing(true);
          }} className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-slate-700 px-2.5 py-1 text-xs text-slate-200 hover:border-slate-500 disabled:opacity-40">
            <Icon name="pencil" size={12} />
            Edit
          </button>
        )}
      </div>

      {editing && onEdit ? (
        <DayEditor plan={plan} day={day} onCancel={() => { setLive(null); setEditing(false); }} onDone={(next) => { onEdit(next); setLive(null); setEditing(false); }} />
      ) : (
        <ol className="flex flex-col gap-5">
          {d.exercises.map((e, i) => {
            const section = sections[i];
            const done = !!plan.done[doneKey(day, i)];
            const isNow = now === i && !done;
            return (
              <li key={`${day}:${i}`} ref={(el) => { cards.current[i] = el; }}>
                {section && (
                  <h3 className={`mb-3 flex items-baseline gap-2 border-b border-slate-800 pb-1.5 text-sm font-semibold text-slate-100 ${i ? "mt-3" : ""}`}>
                    {section.label}
                    <span className="text-xs font-normal text-slate-400">{section.minutes} min</span>
                  </h3>
                )}
                <ExerciseCard exercise={e} index={i} done={done} now={isNow} ticking={running && focused === i} spent={onTime ? spent[i] ?? 0 : undefined} rating={plan.rated?.[doneKey(day, i)]?.stars ?? null} onRate={onRate && ((s) => onRate(day, i, s))} ratedBy={ratedBy} address={readOnly ? `past-${plan.id}.d${day}.e${i}` : `d${day}.e${i}`} tour={!readOnly} />
              </li>
            );
          })}
        </ol>
      )}

      {onTime && !editing ? <DayTimer
        // a day whose exercises change (an AI's insert or removal, another plan) gets a fresh timer, so it never saves the old order's seconds
        key={`${plan.id}:${day}:${ids}`}
        minutes={d.exercises.map((e) => e.minutes)}
        titles={d.exercises.map(shownTitle)}
        label={timerLabel}
        elapsed={elapsedOn(times, day)}
        spent={saved}
        focused={focused}
        autoStart={auto}
        onSave={(s, spent) => onTime(dayTime(plan.id, day, d.exercises, s, spent, times.find((t) => t.day === day), undefined, plan.startedOn))}
        onExercise={setNow}
        onRunning={setRunning}
        onSpent={(s) => setLive({ ids, spent: s })}
        above={corner}
      /> : <Corner above={corner} />}
    </>
  );
}

/**
 * Which of the cards is in view: the one crossing the middle of the screen, else the nearest to it; once the page is scrolled
 * to the end, the last card on screen (a short last card can never reach the middle). Null when none is on screen.
 */
function useInView(cards: React.RefObject<(HTMLLIElement | null)[]>, day: number): number | null {
  const [at, setAt] = useState<number | null>(null);
  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      const h = window.innerHeight;
      const mid = h / 2;
      const end = window.scrollY + h >= document.documentElement.scrollHeight - 4;
      let best: number | null = null;
      let gap = Infinity;
      cards.current.forEach((el, i) => {
        if (!el) return;
        const r = el.getBoundingClientRect();
        if (r.bottom <= 0 || r.top >= h) return;
        if (end) {
          best = i;
          return;
        }
        const g = r.top > mid ? r.top - mid : r.bottom < mid ? mid - r.bottom : 0;
        if (g < gap) {
          gap = g;
          best = i;
        }
      });
      setAt(best);
    };
    const queue = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", queue, { passive: true });
    window.addEventListener("resize", queue);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", queue);
      window.removeEventListener("resize", queue);
    };
  }, [cards, day]);
  return at;
}
