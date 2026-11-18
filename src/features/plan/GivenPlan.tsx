"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import { btn } from "@/components/ui";
import { DISPLAY } from "@/components/landing/Display";
import { FixedLabelRoot } from "@/features/theory/useLabelSystem";
import type { Stars } from "@/features/progress/stars";
import { useProgress } from "@/features/progress/useProgress";
import type { DayTime } from "./model/planTime";
import { givenPlan, givenToday, localDate, updateGiven } from "./model/schedule";
import { dateLabel, daysLabel } from "./model/today";
import { planDays, type StoredPlan } from "./model/types";
import { usePlan, usePlanTimes } from "./store/usePlan";
import { CornerLabels, PhoneLabels, SharePlan, rateHandler } from "./ui/planPieces";
import WeekView, { DayPanel } from "./ui/WeekView";

/**
 * A plan the player was given (`/plan/given/<id>`), beside their own daily plan on `/plan`: its week (`WeekView`: the day
 * strip, ratings, the day timer, Edit), read from and changed in `PlanState.given` (`updateGiven`), never `current`, and
 * never composed over. A rating also goes to the progress log (`rateHandler`), as on `/plan`. Share plan shares this plan.
 * Past its last day (its date has passed; a fully rated last day stays open until then) every day stays open. A plan of
 * one day (a day shared from `/plan`) is drawn as one day, the way `/plan` draws today's (`DayPanel`): no day strip. An id not in `given` shows the not-found state with a link back to `/plan`.
 */
export default function GivenPlan({ id }: { id: string }) {
  const { state, loaded, update } = usePlan();
  const plan = loaded ? givenPlan(state, id) : undefined;
  // the day the page counts from, moving at midnight
  const [date, setDate] = useState(() => localDate());
  useEffect(() => {
    const t = setInterval(() => setDate(localDate()), 60_000);
    return () => clearInterval(t);
  }, []);
  const [day, setDay] = useState<number | null>(null);
  const { times, loaded: timesLoaded, saveTime } = usePlanTimes(plan?.id ?? null);
  const setPlan = (change: (p: StoredPlan) => StoredPlan) => update((s) => updateGiven(s, id, change));
  const progress = useProgress();
  const rate = rateHandler(plan ?? null, setPlan, progress);

  if (!loaded || !timesLoaded) return <p className="text-sm text-slate-500">Loading…</p>;
  return (
    <GivenPlanView
      plan={plan}
      date={date}
      day={day}
      onDay={setDay}
      onRate={rate}
      times={times}
      onTime={saveTime}
      onEdit={(next) => setPlan(() => next)}
      controls={plan && <><PhoneLabels /><SharePlan planId={plan.id} /></>}
      corner={<CornerLabels />}
    />
  );
}

/** The page once the plan document has loaded: the given plan's header and week, or the not-found state. */
export function GivenPlanView({ plan, date, day, onDay, onRate, times, onTime, onEdit, controls, corner }: {
  /** the given plan, or undefined when the id is not in `given` */
  plan: StoredPlan | undefined;
  /** today's local date */
  date: string;
  /** the day the player opened (null: today's) */
  day: number | null;
  onDay: (d: number) => void;
  onRate: (day: number, ex: number, stars: Stars | null) => void;
  times: DayTime[];
  onTime: (time: DayTime) => void;
  onEdit: (next: StoredPlan) => void;
  /** the header's controls (Labels on a phone, Share plan) */
  controls: ReactNode;
  /** small controls over the day timer (Labels) */
  corner: ReactNode;
}) {
  if (!plan) return <NotFound />;
  const { today, over } = givenToday(plan, date);
  // a plan of one day (a day someone shared from /plan) is drawn as one day: no day strip, no "Day 1 of 1"
  const one = planDays(plan) === 1;
  const length = daysLabel(planDays(plan));
  return (
    <FixedLabelRoot value="scale">
      {/* necks keep the page's margins rather than bleeding to the window's edge */}
      <div className="flex flex-col gap-4 pb-28 [&_.bleed]:mx-0">
        <div className="mt-4 mb-2 flex flex-col gap-5 sm:mt-6">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wider text-amber-300/90">
              {over || one ? length : `Day ${today + 1} of ${planDays(plan)}`} · started {dateLabel(plan.startedOn)}
            </p>
            <h2 className="mt-2 text-3xl text-slate-50" style={DISPLAY}>{plan.config.title}</h2>
            {(plan.config.summary || (one && plan.config.days[0]?.theme)) && <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-400">{plan.config.summary || plan.config.days[0].theme}</p>}
          </div>
          {controls && <div className="flex flex-wrap items-center gap-2">{controls}</div>}
        </div>
        {one
          // the timer starts by itself only while the day runs
          ? <DayPanel plan={plan} day={0} heading={null} timerLabel={over ? "Shared plan" : "Today"} autoStart={!over} onRate={onRate} times={times} onTime={onTime} onEdit={onEdit} corner={corner} />
          : <WeekView plan={plan} today={today} ended={over} day={day ?? today} onDay={onDay} onRate={onRate} times={times} onTime={onTime} onEdit={onEdit} corner={corner} />}
      </div>
    </FixedLabelRoot>
  );
}

/** The id is not one of the player's given plans: what that means, and the way back to their own plan. */
function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-6 text-center">
      <h2 className="text-lg text-slate-100">This shared plan isn&apos;t in your plans</h2>
      <p className="text-sm leading-relaxed text-slate-400">The link may be wrong, or you are logged in to another account. Your own plan for today is on the AI autoplan page.</p>
      <Link href="/plan" className={btn}><Icon name="chevron-left" size={14} /> Open AI autoplan</Link>
    </div>
  );
}
