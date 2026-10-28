"use client";

import Link from "next/link";
import Icon from "@/components/Icon";
import { Checkbox } from "@/components/ui";
import ExerciseTimer from "./ExerciseTimer";
import { dayProgress, doneKey } from "../model/schedule";
import { PLAN_DAYS, type StoredPlan } from "../model/types";

/**
 * The week: a strip of seven days (today and earlier open, later ones locked) and the chosen day's exercises as a grid of
 * cards, each with its focus, steps, a countdown timer, why, a link to the attunr page and a tick.
 */
export default function WeekView({ plan, today, day, onDay, onToggle }: {
  plan: StoredPlan; today: number; day: number; onDay: (d: number) => void; onToggle: (day: number, ex: number) => void;
}) {
  const d = plan.config.days[day];
  const total = d.exercises.reduce((n, e) => n + e.minutes, 0);
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-7 gap-1.5" role="tablist" aria-label="Days">
        {Array.from({ length: PLAN_DAYS }, (_, i) => {
          const locked = i > today;
          const p = dayProgress(plan, i);
          const on = i === day;
          return (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={on}
              disabled={locked}
              onClick={() => onDay(i)}
              title={locked ? "Opens on its day" : plan.config.days[i].theme}
              className={`relative flex flex-col items-center gap-0.5 overflow-hidden rounded-xl border px-1 py-2 text-xs transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400 disabled:cursor-not-allowed disabled:opacity-40 ${on ? "border-sky-500/70 bg-sky-500/15 text-sky-100" : "border-slate-700 bg-slate-900/60 text-slate-300 hover:border-slate-500"}`}
            >
              <span className="text-[10px] uppercase tracking-wider text-slate-500">{i === today ? "Today" : "Day"}</span>
              <span className="text-base tabular-nums">{i + 1}</span>
              {p === 1 ? <Icon name="check" size={12} className="text-emerald-300" /> : <span className="h-3" />}
              <span aria-hidden className="absolute inset-x-0 bottom-0 h-0.5 bg-emerald-400/70" style={{ width: `${p * 100}%` }} />
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-baseline gap-x-3">
        <h2 className="text-lg text-slate-100">Day {day + 1}: {d.theme}</h2>
        <span className="text-xs text-slate-500">{d.exercises.length} exercises · {total} min</span>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {d.exercises.map((e, i) => {
          const done = !!plan.done[doneKey(day, i)];
          return (
            <li key={i} className={`flex flex-col gap-2 rounded-2xl border p-4 transition ${done ? "border-emerald-500/40 bg-emerald-500/5" : "border-slate-800 bg-slate-900/50"}`}>
              <div className="flex items-start gap-2">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-slate-800 text-[11px] tabular-nums text-slate-400">{i + 1}</span>
                <h3 className={`flex-1 text-sm font-medium ${done ? "text-slate-400 line-through" : "text-slate-100"}`}>{e.title}</h3>
                <span className="flex shrink-0 items-center gap-1 text-xs text-slate-500"><Icon name="timer" size={12} />{e.minutes}′</span>
              </div>
              {e.focus && <p className="w-fit rounded-md bg-sky-500/10 px-2 py-0.5 text-xs text-sky-200">{e.focus}</p>}
              {e.how && <p className="text-xs leading-relaxed text-slate-300">{e.how}</p>}
              {e.steps && (
                <ol className="list-decimal space-y-0.5 pl-4 text-xs leading-relaxed text-slate-300 marker:text-slate-500">
                  {e.steps.map((st, si) => <li key={si}>{st}</li>)}
                </ol>
              )}
              <ExerciseTimer key={`${day}:${i}`} minutes={e.minutes} onFinish={() => !done && onToggle(day, i)} />
              {e.why && <p className="text-xs italic leading-relaxed text-slate-500">{e.why}</p>}
              <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                <Checkbox checked={done} onChange={() => onToggle(day, i)}>Done</Checkbox>
                {e.link && (
                  <Link href={e.link} className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-2.5 py-1 text-xs text-sky-200 hover:border-sky-500/60 hover:bg-sky-500/10">
                    Open <Icon name="chevron-right" size={12} />
                  </Link>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
