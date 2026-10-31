"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import { DISPLAY } from "@/components/landing/Display";
import DayTimer from "./DayTimer";
import ExerciseCard from "./ExerciseCard";
import { elapsedOf } from "../model/dayClock";
import { dayProgress, doneKey } from "../model/schedule";
import { PLAN_DAYS, type StoredPlan } from "../model/types";

/**
 * The week: a strip of seven days (every day can be opened; days ahead are dashed and marked "coming up") and the chosen day's
 * exercises, each an `ExerciseCard`. One floating timer counts down the whole day (`DayTimer`): it starts by itself for the day shown on page
 * load, its used time is saved with the plan, and the exercise its time falls in is marked "Now".
 */
export default function WeekView({ plan, today, day, onDay, onToggle, onElapsed }: {
  plan: StoredPlan; today: number; day: number; onDay: (d: number) => void; onToggle: (day: number, ex: number) => void;
  /** saves the day timer's used seconds; without it (a preview) there is no timer */
  onElapsed?: (planId: string, day: number, seconds: number) => void;
}) {
  const d = plan.config.days[day];
  const [now, setNow] = useState<number | null>(null);
  // only the day shown when the page opened starts its timer by itself
  const [autoDay, setAutoDay] = useState<number | null>(day <= today ? day : null);
  const total = d.exercises.reduce((n, e) => n + e.minutes, 0);
  const openDay = (i: number) => {
    setAutoDay(null);
    setNow(null);
    onDay(i);
  };
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-7 gap-1.5" role="tablist" aria-label="Days">
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

      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="text-2xl text-slate-50" style={DISPLAY}>Day {day + 1}: {d.theme}</h2>
        {day > today && <span className="rounded-full border border-dashed border-slate-600 px-2 py-0.5 text-[11px] text-slate-400">Coming up in {day - today} day{day - today > 1 ? "s" : ""}</span>}
        <span className="text-xs text-slate-400">{d.exercises.length} exercises · {total} min</span>
      </div>

      <ol className="flex flex-col gap-5">
        {d.exercises.map((e, i) => {
          const done = !!plan.done[doneKey(day, i)];
          const isNow = now === i && !done;
          return (
            <li key={`${day}:${i}`}>
              <ExerciseCard exercise={e} index={i} done={done} now={isNow} onToggle={() => onToggle(day, i)} />
            </li>
          );
        })}
      </ol>

      {onElapsed && <DayTimer
        key={`${plan.id}:${day}`}
        minutes={d.exercises.map((e) => e.minutes)}
        titles={d.exercises.map((e) => e.title)}
        label={`Day ${day + 1}`}
        elapsed={elapsedOf(plan.elapsed, day)}
        autoStart={autoDay === day}
        onSave={(s) => onElapsed(plan.id, day, s)}
        onExercise={setNow}
      />}
    </div>
  );
}
