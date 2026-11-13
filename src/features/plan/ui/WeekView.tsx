"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Icon from "@/components/Icon";
import { DISPLAY } from "@/components/landing/Display";
import DayTimer, { Corner } from "./DayTimer";
import DayEditor from "./DayEditor";
import ExerciseCard from "./ExerciseCard";
import { elapsedOf, spentOf } from "../model/dayClock";
import { dayProgress, doneKey } from "../model/schedule";
import { PLAN_DAYS, type StoredPlan } from "../model/types";
import type { Stars } from "@/features/progress/stars";

/**
 * The week: a strip of seven days (every day can be opened; days ahead are dashed and marked "coming up") and the chosen day's
 * exercises, each an `ExerciseCard`. One floating timer counts down the whole day (`DayTimer`): it starts by itself for the day shown on page
 * load, its used time is saved with the plan. The card in view (the one across the middle of the screen, or the last one
 * once the page is scrolled to the end) is the exercise the timer names and counts time for, and it is lifted a little.
 */
export default function WeekView({ plan, today, day, onDay, onRate, onElapsed, onEdit, onEditing, corner }: {
  plan: StoredPlan; today: number; day: number; onDay: (d: number) => void; onRate: (day: number, ex: number, stars: Stars | null) => void;
  /** saves the day timer's used seconds and the seconds spent on each exercise; without it (a preview) there is no timer */
  onElapsed?: (planId: string, day: number, seconds: number, spent: number[]) => void;
  /** saves a day edited in place (`DayEditor`); without it the day has no Edit */
  onEdit?: (next: StoredPlan) => void;
  /** told which day is open in the day editor (null: none), so the browser AI's tools leave that day alone */
  onEditing?: (day: number | null) => void;
  /** small controls floating in the bottom-right corner, over the timer */
  corner?: ReactNode;
}) {
  // the day being edited: its cards give way to the day editor and the timer is put away until Done or Cancel
  const [editing, setEditing] = useState<number | null>(null);
  useEffect(() => onEditing?.(editing), [editing, onEditing]);
  const d = plan.config.days[day];
  const [now, setNow] = useState<number | null>(null);
  // only the day shown when the page opened starts its timer by itself
  const [autoDay, setAutoDay] = useState<number | null>(day <= today ? day : null);
  const total = d.exercises.reduce((n, e) => n + e.minutes, 0);
  const cards = useRef<(HTMLLIElement | null)[]>([]);
  const focused = useInView(cards, day);
  // the timer's seconds per exercise as they count, so the cards show them live; until it reports, the saved ones
  const [live, setLive] = useState<{ day: number; spent: number[] } | null>(null);
  const saved = spentOf(plan.spent, day, d.exercises.length);
  const spent = live?.day === day ? live.spent : saved;
  const openDay = (i: number) => {
    setAutoDay(null);
    setNow(null);
    setEditing(null);
    onDay(i);
  };
  return (
    <div className="flex flex-col gap-5">
      <div data-tour="plan-week" className="grid grid-cols-7 gap-1.5" role="tablist" aria-label="Days">
        {Array.from({ length: PLAN_DAYS }, (_, i) => {
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
              // the day being edited stays until Done or Cancel: another day would throw the draft away
              disabled={editing !== null && i !== editing}
              title={ahead ? `Coming up: ${plan.config.days[i].theme}` : plan.config.days[i].theme}
              className={`relative flex cursor-pointer flex-col items-center gap-0.5 overflow-hidden rounded-xl border px-1 py-2 text-xs transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400 ${on ? "border-sky-400 bg-sky-500/25 text-sky-50 shadow-md shadow-sky-500/20" : ahead ? "border-dashed border-slate-700 bg-transparent text-slate-500 hover:border-slate-500 hover:text-slate-300" : p === 1 ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-100 hover:border-emerald-400" : "border-slate-600 bg-slate-800/60 text-slate-200 hover:border-sky-500/60 hover:bg-slate-800"}`}
            >
              <span className={`text-[10px] font-medium uppercase tracking-wider ${i === today ? "text-amber-300" : on ? "text-sky-200" : "text-slate-500"}`}>{i === today ? "Today" : "Day"}</span>
              <span className="text-lg font-semibold tabular-nums">{i + 1}</span>
              {p === 1 ? <Icon name="check" size={12} className="text-emerald-300" /> : <span className="h-3" />}
              <span aria-hidden className="absolute inset-x-0 bottom-0 h-1 bg-emerald-400/80" style={{ width: `${p * 100}%` }} />
            </button>
          );
        })}
      </div>

      <div data-tour="plan-day" className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="text-2xl text-slate-50" style={DISPLAY}>Day {day + 1}: {d.theme}</h2>
        {day > today && <span className="rounded-full border border-dashed border-slate-600 px-2 py-0.5 text-[11px] text-slate-400">Coming up in {day - today} day{day - today > 1 ? "s" : ""}</span>}
        <span className="text-xs text-slate-400">{d.exercises.length} exercises · {total} min</span>
        {onEdit && editing !== day && (
          <button type="button" onClick={() => {
            // the timer is put away: it neither starts again by itself nor keeps the seconds of the old order when it comes back
            setAutoDay(null);
            setNow(null);
            setLive(null);
            setEditing(day);
          }} className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-slate-700 px-2.5 py-1 text-xs text-slate-200 hover:border-slate-500">
            <Icon name="pencil" size={12} />
            Edit
          </button>
        )}
      </div>

      {editing === day && onEdit ? (
        <DayEditor plan={plan} day={day} onCancel={() => { setLive(null); setEditing(null); }} onDone={(next) => { onEdit(next); setLive(null); setEditing(null); }} />
      ) : (<>

      <ol className="flex flex-col gap-5">
        {d.exercises.map((e, i) => {
          const done = !!plan.done[doneKey(day, i)];
          const isNow = now === i && !done;
          return (
            <li key={`${day}:${i}`} ref={(el) => { cards.current[i] = el; }}>
              <ExerciseCard exercise={e} index={i} done={done} now={isNow} spent={onElapsed ? spent[i] ?? 0 : undefined} rating={plan.rated?.[doneKey(day, i)]?.stars ?? null} onRate={(s) => onRate(day, i, s)} address={`d${day}.e${i}`} />
            </li>
          );
        })}
      </ol>
      </>)}

      {onElapsed && editing !== day ? <DayTimer
        // a day whose exercises change (an AI's insert or removal) gets a fresh timer, so it never saves the old order's seconds
        key={`${plan.id}:${day}:${d.exercises.map((e) => e.id).join(",")}`}
        minutes={d.exercises.map((e) => e.minutes)}
        titles={d.exercises.map((e) => e.title)}
        label={`Day ${day + 1}`}
        elapsed={elapsedOf(plan.elapsed, day)}
        spent={saved}
        focused={focused}
        autoStart={autoDay === day}
        onSave={(s, spent) => onElapsed(plan.id, day, s, spent)}
        onExercise={setNow}
        onSpent={(s) => setLive({ day, spent: s })}
        above={corner}
      /> : <Corner above={corner} />}
    </div>
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
