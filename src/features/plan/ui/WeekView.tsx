"use client";

import { dayPages, pageOf, sectionStarts } from "../model/sections";
import { shownTitle } from "../model/moves";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Icon from "@/components/Icon";
import { Button, Modal } from "@/components/ui";
import { DISPLAY } from "@/components/landing/Display";
import DayTimer, { Corner } from "./DayTimer";
import DayEditor from "./DayEditor";
import ExerciseCard from "./ExerciseCard";
import { dayTime, elapsedOn, spentOn, type DayTime } from "../model/planTime";
import { addDays, dayProgress, doneKey, practiceDays } from "../model/schedule";
import { dayName } from "../model/today";
import type { StoredPlan } from "../model/types";
import type { Stars } from "@/features/progress/stars";
import type { CellAsk } from "@/features/contentVideos/model/slot";
import { useDayVideos } from "./useDayVideos";

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

const NO_ASKS: Record<number, CellAsk[]> = {};
export const VIDEOS_FAILED = "The exercise videos could not be loaded. The exercises work without them.";

/**
 * One day of a plan: its heading (the host's words), how many exercises and minutes, each exercise an `ExerciseCard`, and one
 * floating timer that counts down the whole day (`DayTimer`), and the day's content videos (`useDayVideos`: a Watch video
 * button above each tool with one, each video at its first place in the day only; a failed lookup says so, with Try again), its used time saved apart from the plan (`times`, `onTime`). The
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
  // a long day is drawn a page at a time (a part, or a long part cut in two), so only one page's tools are mounted;
  // it opens on the page of the first exercise not done
  const pages = dayPages(d.exercises);
  const [page, setPage] = useState(() => pageOf(pages, Math.max(0, d.exercises.findIndex((_, i) => !plan.done[doneKey(day, i)]))));
  const at = pages[Math.min(page, pages.length - 1)] ?? { start: 0, count: d.exercises.length, label: "", minutes: total };
  const [pageDay, setPageDay] = useState(day);
  if (pageDay !== day) {
    setPageDay(day);
    setPage(pageOf(pages, Math.max(0, d.exercises.findIndex((_, i) => !plan.done[doneKey(day, i)]))));
  }
  const turn = (to: number) => {
    setPage(to);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const cards = useRef<(HTMLLIElement | null)[]>([]);
  // the exercises with no stars yet (none without `onRate`): Next and Finish day ask for them first (`RateFirst`)
  const unrated = onRate ? d.exercises.flatMap((_, i) => (plan.rated?.[doneKey(day, i)]?.stars == null ? [i] : [])) : [];
  const [asking, setAsking] = useState<{ missing: number[]; next: number | null } | null>(null);
  // the card whose stars to bring into view, once its page is drawn
  const rateAt = useRef<number | null>(null);
  const showStars = useCallback((i: number) => {
    const card = cards.current[i];
    (card?.querySelector("[data-rating]") ?? card)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);
  useEffect(() => {
    if (rateAt.current === null) return;
    showStars(rateAt.current);
    rateAt.current = null;
  }, [page, showStars]);
  const rateMissing = (i: number) => {
    setAsking(null);
    const to = pageOf(pages, i);
    if (pages.length > 1 && to !== page) {
      rateAt.current = i;
      setPage(to);
    } else requestAnimationFrame(() => showStars(i));
  };
  const next = () => {
    const missing = unrated.filter((i) => i >= at.start && i < at.start + at.count);
    if (missing.length) setAsking({ missing, next: page + 1 });
    else turn(page + 1);
  };
  const focused = useInView(cards, `${day}:${page}`);
  // the day timer is counting (not paused, day not over): the card it counts for shows its time ticking, rated or not,
  // past its planned time or not (the timer counts every second to the card in view)
  const [running, setRunning] = useState(false);
  // the timer's seconds per exercise as they count, so the cards show them live; until it reports, the saved ones
  // (kept with the exercises they count for: another plan or an edit drops them)
  const ids = d.exercises.map((e) => e.id).join(",");
  const [live, setLive] = useState<{ ids: string; spent: number[] } | null>(null);
  const saved = spentOn(times, day, d.exercises);
  const spent = live?.ids === ids ? live.spent : saved;
  // the content videos of the day, by the tools as each card draws them (kept with the exercises they were drawn for)
  const [drawnFor, setDrawnFor] = useState<{ ids: string; asks: Record<number, CellAsk[]> }>({ ids, asks: {} });
  const drawn = drawnFor.ids === ids ? drawnFor.asks : NO_ASKS;
  const onAsks = useCallback((i: number, asks: CellAsk[]) => setDrawnFor((was) => {
    const kept = was.ids === ids ? was.asks : {};
    return JSON.stringify(kept[i]) === JSON.stringify(asks) && was.ids === ids ? was : { ids, asks: { ...kept, [i]: asks } };
  }), [ids]);
  const videos = useDayVideos(d.exercises, drawn);
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

      {videos.failed && !editing && (
        <p role="alert" className="mt-2 flex flex-wrap items-center gap-x-2 text-xs text-slate-400">
          {VIDEOS_FAILED}
          <button type="button" onClick={videos.retry} className="rounded-md border border-slate-700 px-2 py-0.5 text-slate-200 hover:border-slate-500">Try again</button>
        </p>
      )}

      {editing && onEdit ? (
        <DayEditor plan={plan} day={day} onCancel={() => { setLive(null); setEditing(false); }} onDone={(next) => { onEdit(next); setLive(null); setEditing(false); }} />
      ) : (
        <>
        {pages.length > 1 && (
          <nav aria-label="Pages of the day" className="mb-4 flex flex-wrap gap-1.5">
            {pages.map((p, n) => {
              const all = Array.from({ length: p.count }, (_, k) => p.start + k).every((i) => plan.done[doneKey(day, i)]);
              return (
                <button key={n} type="button" aria-current={n === page ? "page" : undefined} onClick={() => setPage(n)}
                  className={`inline-flex items-baseline gap-1.5 rounded-md border px-2.5 py-1 text-xs ${n === page ? "border-slate-400 bg-slate-800 text-slate-100" : "border-slate-700 text-slate-300 hover:border-slate-500"}`}>
                  {all && <Icon name="check" size={11} />}
                  {p.label}
                  <span className="text-slate-400">{p.minutes} min</span>
                </button>
              );
            })}
          </nav>
        )}
        <ol className="flex flex-col gap-5">
          {d.exercises.map((e, i) => {
            if (pages.length > 1 && (i < at.start || i >= at.start + at.count)) return null;
            const section = pages.length > 1 ? null : sections[i];
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
                <ExerciseCard exercise={e} index={i} done={done} now={isNow} ticking={running && focused === i} spent={onTime ? spent[i] ?? 0 : undefined} rating={plan.rated?.[doneKey(day, i)]?.stars ?? null} onRate={onRate && ((s) => onRate(day, i, s))} ratedBy={ratedBy} address={readOnly ? `past-${plan.id}.d${day}.e${i}` : `d${day}.e${i}`} tour={!readOnly} videos={videos.shown[i]} onAsks={(asks) => onAsks(i, asks)} />
              </li>
            );
          })}
        </ol>
        {pages.length > 1 && (
          <div className="mt-6 flex items-center justify-between gap-3">
            {page > 0 ? (
              <button type="button" onClick={() => turn(page - 1)} className="rounded-md border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:border-slate-500">
                Back: {pages[page - 1].label}
              </button>
            ) : <span />}
            {page < pages.length - 1 && (
              <button type="button" onClick={next} className="rounded-md border border-slate-500 bg-slate-800 px-3 py-1.5 text-sm text-slate-100 hover:border-slate-300">
                Next: {pages[page + 1].label}
              </button>
            )}
          </div>
        )}
        </>
      )}

      {!editing && !readOnly && onTime && (
        <DayEnd
          left={Math.max(0, total * 60 - (live?.ids === ids ? live.spent.reduce((n, x) => n + x, 0) : elapsedOn(times, day)))}
          unrated={unrated}
          onRateMissing={rateMissing}
          onFinish={() => setAsking({ missing: unrated, next: null })}
        />
      )}

      {asking && (
        <RateFirst
          missing={asking.missing.length}
          where={asking.next === null ? "day" : "page"}
          goLabel={asking.next === null ? null : `Go to ${pages[asking.next].label}`}
          onRate={() => rateMissing(asking.missing[0])}
          onGo={() => { const to = asking.next; setAsking(null); if (to !== null) turn(to); }}
          onClose={() => setAsking(null)}
        />
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
 * Asked when Next or Finish day is pressed with exercises on that page (or day) not rated: Add missing ratings brings the
 * first one's stars into view; from Next, Go to <page> turns the page anyway.
 */
function RateFirst({ missing, where, goLabel, onRate, onGo, onClose }: {
  missing: number; where: "page" | "day"; goLabel: string | null; onRate: () => void; onGo: () => void; onClose: () => void;
}) {
  return (
    <Modal title="Rate each exercise" narrow onClose={onClose}>
      <div className="flex flex-col gap-3 text-sm text-slate-300">
        <p>Your stars decide what goes into your next plan. {missing === 1 ? "1 exercise" : `${missing} exercises`} on this {where} {missing === 1 ? "has" : "have"} no rating yet.</p>
        <p>Give each one stars under How did it go?</p>
        <div className="flex flex-wrap justify-end gap-2">
          {goLabel && <Button onClick={onGo}>{goLabel}</Button>}
          <Button onClick={onRate} className="!border-sky-500 !bg-sky-500 !font-semibold !text-slate-950 hover:!bg-sky-400">Add missing ratings</Button>
        </div>
      </div>
    </Modal>
  );
}

/**
 * The foot of a day: what is left of it (time on the day's timer, exercises with no rating, with a button that brings the
 * first one's stars into view, and Finish day, which asks for them) or, when neither is left, a line that the day is done;
 * and Back to top.
 */
function DayEnd({ left, unrated, onRateMissing, onFinish }: { left: number; unrated: number[]; onRateMissing: (i: number) => void; onFinish: () => void }) {
  const min = Math.ceil(left / 60);
  const done = left === 0 && unrated.length === 0;
  return (
    <div className="mt-8 flex flex-col items-center gap-3 border-t border-slate-800 pt-6 text-center text-sm text-slate-300">
      {done ? (
        <p>Well done. That&apos;s this day&apos;s practice finished and every exercise rated.</p>
      ) : (
        <>
          {left > 0 && <p>This day&apos;s practice still has {min} min to go on the timer.</p>}
          {unrated.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
              <p>{unrated.length === 1 ? "1 exercise has no rating yet." : `${unrated.length} exercises have no rating yet.`}</p>
              <button type="button" onClick={() => onRateMissing(unrated[0])} className="rounded-md border border-slate-700 px-2.5 py-1 text-xs text-slate-200 hover:border-slate-500">
                Add missing ratings
              </button>
            </div>
          )}
          {unrated.length > 0 && (
            <Button onClick={onFinish} className="!border-sky-500 !bg-sky-500 !font-semibold !text-slate-950 hover:!bg-sky-400">
              <Icon name="check" size={14} />Finish day
            </Button>
          )}
        </>
      )}
      <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200">
        Back to top
      </button>
    </div>
  );
}

/**
 * Which of the cards is in view: the one crossing the middle of the screen, else the nearest to it; once the page is scrolled
 * to the end, the last card on screen (a short last card can never reach the middle). Null when none is on screen.
 */
function useInView(cards: React.RefObject<(HTMLLIElement | null)[]>, day: string): number | null {
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
