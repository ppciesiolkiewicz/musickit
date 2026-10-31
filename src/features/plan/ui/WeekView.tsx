"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import { Checkbox } from "@/components/ui";
import Sections from "./Sections";
import ExerciseTimer from "./ExerciseTimer";
import { blocksOf } from "../model/blocks";
import { sectionsOf } from "../model/tools";
import { dayProgress, doneKey } from "../model/schedule";
import { PLAN_DAYS, type StoredPlan } from "../model/types";

/**
 * The week: a strip of seven days (every day can be opened; days ahead are dashed and marked "coming up") and the chosen day's exercises as a list of
 * sections, each with its focus, how, steps, why, a countdown timer and a tick, then its tools (model/tools.ts), set up and
 * ready to play. A link is an "Open page" link for more.
 */
export default function WeekView({ plan, today, day, onDay, onToggle }: {
  plan: StoredPlan; today: number; day: number; onDay: (d: number) => void; onToggle: (day: number, ex: number) => void;
}) {
  const d = plan.config.days[day];
  const [nowBlock, setNowBlock] = useState<Record<string, number | null>>({});
  const total = d.exercises.reduce((n, e) => n + e.minutes, 0);
  return (
    <div className="flex flex-col gap-4">
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
              onClick={() => onDay(i)}
              title={ahead ? `Coming up: ${plan.config.days[i].theme}` : plan.config.days[i].theme}
              className={`relative flex flex-col items-center gap-0.5 overflow-hidden rounded-xl border px-1 py-2 text-xs transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400 ${on ? "border-sky-500/70 bg-sky-500/15 text-sky-100" : ahead ? "border-dashed border-slate-700 bg-transparent text-slate-500 hover:border-slate-500 hover:text-slate-300" : "border-slate-700 bg-slate-900/60 text-slate-300 hover:border-slate-500"}`}
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
        {day > today && <span className="rounded-full border border-slate-700 px-2 py-0.5 text-[11px] text-slate-400">Coming up in {day - today} day{day - today > 1 ? "s" : ""}</span>}
        <span className="text-xs text-slate-500">{d.exercises.length} exercises · {total} min</span>
      </div>

      <ol className="flex flex-col gap-4">
        {d.exercises.map((e, i) => {
          const done = !!plan.done[doneKey(day, i)];
          const sections = sectionsOf(e);
          const blocks = blocksOf(sections);
          const key = doneKey(day, i);
          return (
            <li key={`${day}:${i}`}>
              <section aria-label={e.title} className={`flex flex-col gap-3 rounded-2xl border p-3 transition sm:p-4 ${done ? "border-emerald-500/40 bg-emerald-500/5" : "border-slate-800 bg-slate-900/50"}`}>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-slate-800 text-xs tabular-nums text-slate-400">{i + 1}</span>
                  <h3 className={`text-base font-medium ${done ? "text-slate-400 line-through" : "text-slate-100"}`}>{e.title}</h3>
                  {e.focus && <span className="rounded-md bg-sky-500/10 px-2 py-0.5 text-xs text-sky-200">{e.focus}</span>}
                  {e.tags?.map((t) => <span key={t} className="rounded-md border border-slate-700 px-1.5 py-0.5 text-[11px] text-slate-400">{t}</span>)}
                  <span className="ml-auto flex items-center gap-1 text-xs text-slate-500"><Icon name="timer" size={12} />{e.minutes} min</span>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <ExerciseTimer minutes={e.minutes} blocks={blocks} onBlock={(b) => setNowBlock((m) => (m[key] === b ? m : { ...m, [key]: b }))} onFinish={() => !done && onToggle(day, i)} />
                  <Checkbox checked={done} onChange={() => onToggle(day, i)}>Done</Checkbox>
                </div>
                <Sections sections={sections} currentBlock={nowBlock[key]} />
                {e.why && <p className="text-xs italic leading-relaxed text-slate-500">{e.why}</p>}
              </section>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
