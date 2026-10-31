"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import { HUE_TONES, hueAt, type Hue } from "@/components/ui";
import { DISPLAY } from "@/components/landing/Display";
import Sections from "./Sections";
import DayTimer from "./DayTimer";
import { elapsedOf } from "../model/dayClock";
import { sectionsOf } from "../model/tools";
import { dayProgress, doneKey } from "../model/schedule";
import { PLAN_DAYS, type StoredPlan } from "../model/types";

/** Each tag keeps its colour wherever it shows. */
const TAG_HUES: Record<string, Hue> = { ear: "teal", sing: "pink", rhythm: "violet", technique: "amber", theory: "sky", improv: "emerald", song: "rose", "multi-octave": "red" };

/** The left edge, number disc and title colour of the i-th exercise, written out whole so Tailwind sees them. */
const EDGE: Record<Hue, string> = {
  sky: "border-l-sky-400", amber: "border-l-amber-400", emerald: "border-l-emerald-400", rose: "border-l-rose-400",
  violet: "border-l-violet-400", teal: "border-l-teal-400", pink: "border-l-pink-400", red: "border-l-red-400",
};

/**
 * The week: a strip of seven days (every day can be opened; days ahead are dashed and marked "coming up") and the chosen day's
 * exercises, each a colour-coded card with its focus, tags, sections (text, steps and tools, set up and ready to play) and a
 * Done button. One floating timer counts down the whole day (`DayTimer`): it starts by itself for the day shown on page
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
          const hue = hueAt(i);
          const tone = HUE_TONES[hue];
          const isNow = now === i && !done;
          return (
            <li key={`${day}:${i}`}>
              <section
                aria-label={e.title}
                aria-current={isNow ? "step" : undefined}
                className={`flex flex-col gap-3 rounded-2xl border border-l-4 p-3 transition sm:p-5 ${EDGE[hue]} ${done ? "border-emerald-500/40 bg-emerald-500/5" : isNow ? "border-slate-600 bg-slate-900/80 shadow-lg shadow-black/30" : "border-slate-800 bg-slate-900/50"}`}
              >
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <span className={`grid size-8 shrink-0 place-items-center rounded-full text-sm font-semibold tabular-nums ${tone.disc[1]}`}>{i + 1}</span>
                  <h3 className={`text-xl ${done ? "text-slate-400 line-through" : "text-slate-50"}`} style={DISPLAY}>{e.title}</h3>
                  {isNow && <span className="rounded-full bg-sky-400 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-950">Now</span>}
                  <span className="ml-auto flex items-center gap-1 text-xs text-slate-400"><Icon name="timer" size={12} />{e.minutes} min</span>
                </div>
                {(e.focus || e.tags?.length) && (
                  <div className="flex flex-wrap items-center gap-1.5 pl-11">
                    {e.focus && <span className="rounded-md border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-xs text-sky-100">{e.focus}</span>}
                    {e.tags?.map((t) => <span key={t} className={`rounded-full bg-slate-800/80 px-2 py-0.5 text-[11px] font-medium ${HUE_TONES[TAG_HUES[t] ?? "sky"].ink}`}>#{t}</span>)}
                  </div>
                )}
                <Sections sections={sectionsOf(e)} />
                {e.why && <p className="border-l-2 border-slate-700 pl-3 text-xs italic leading-relaxed text-slate-400">{e.why}</p>}
                <button
                  type="button"
                  onClick={() => onToggle(day, i)}
                  aria-pressed={done}
                  className={`inline-flex w-fit cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition active:scale-[0.97] ${done ? "border-emerald-400/70 bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/30" : "border-slate-600 bg-slate-800 text-slate-100 hover:border-emerald-400/60 hover:bg-emerald-500/10"}`}
                >
                  <Icon name="check" size={14} className={done ? "text-emerald-300" : "text-slate-400"} />
                  {done ? "Done" : "Mark done"}
                </button>
              </section>
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
