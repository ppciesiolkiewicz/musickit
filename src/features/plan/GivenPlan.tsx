"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Icon from "@/components/Icon";
import { btn } from "@/components/ui";
import { DISPLAY } from "@/components/landing/Display";
import { FixedLabelRoot } from "@/features/theory/useLabelSystem";
import type { Stars } from "@/features/progress/stars";
import { useProgress } from "@/features/progress/useProgress";
import type { DayTime } from "./model/planTime";
import { givenPlan, givenToday, hideGiven, localDate, openDay, practiceDays, updateGiven } from "./model/schedule";
import { dateLabel, daysLabel } from "./model/today";
import { planDays, type StoredPlan } from "./model/types";
import { usePlan, usePlanTimes } from "./store/usePlan";
import { CornerLabels, PhoneLabels, SharePlan, rateHandler } from "./ui/planPieces";
import { SHARED_PLAN, givenTitle, sharedByLabel } from "./ui/GivenPlans";
import WeekView, { DayPanel } from "./ui/WeekView";

/**
 * A plan the player was given (`/plan/given/<id>`), beside their own daily plan on `/plan`: its week (`WeekView`: the day
 * strip, ratings, the day timer, Edit), read from and changed in `PlanState.given` (`updateGiven`), never `current`, and
 * never composed over. A rating also goes to the progress log (`rateHandler`), as on `/plan`. Share plan shares this plan.
 * Past its last day (its date has passed; a fully rated last day stays open until then) every day stays open. A plan of
 * one day (a day shared from `/plan`) is drawn as one day, the way `/plan` draws today's (`DayPanel`): no day strip. An id not in `given` shows the not-found state with a link back to `/plan`.
 */
export default function GivenPlan({ id }: { id: string }) {
  // the day the page counts from, moving at midnight
  const [date, setDate] = useState(() => localDate());
  useEffect(() => {
    const t = setInterval(() => setDate(localDate()), 60_000);
    return () => clearInterval(t);
  }, []);
  // a teacher's week is the student's own practice plan, not one to pass on: no Share plan (it would offer them the Teacher upgrade)
  return <LiveGivenPlan id={id} date={date} controls={(plan) => <><PhoneLabels />{!plan.teacher && <><SharePlan planId={plan.id} /><RemoveShared plan={plan} /></>}</>} />;
}

/** The words of the controls that take a shared plan off "Plans shared with you" and put it back. */
export const REMOVE_SHARED = "Remove from list";
export const RESTORE_SHARED = "Put back on the list";
export const REMOVED_LINE = "You removed this plan from Plans shared with you. Your ratings in it still count.";

/**
 * Takes a shared plan off the list on `/plan` (`hideGiven`) and goes back there; on a plan already removed, says so and
 * puts it back. The plan stays in the document, so its ratings still count and its page still opens.
 */
function RemoveShared({ plan }: { plan: StoredPlan }) {
  const { update } = usePlan();
  const router = useRouter();
  if (plan.hidden) {
    return (
      <p className="flex flex-wrap items-center gap-2 text-sm text-slate-400">
        {REMOVED_LINE}
        <button type="button" className={btn} onClick={() => update((s) => hideGiven(s, plan.id, false))}>{RESTORE_SHARED}</button>
      </p>
    );
  }
  return (
    <button type="button" className={btn} onClick={() => { update((s) => hideGiven(s, plan.id, true)); router.push("/plan"); }}>
      <Icon name="x" size={14} /> {REMOVE_SHARED}
    </button>
  );
}

/** The page's name on a teacher's week: the student's practice plan, named as on `/plan`. */
export const TEACHER_WEEK_PAGE = "Practice plan";

/** The heading of a given plan's page: `TEACHER_WEEK_PAGE` for a week a teacher made, else `SHARED_PLAN` (the not-found state too). */
export const givenPageTitle = (plan: StoredPlan | undefined): string => (plan?.teacher ? TEACHER_WEEK_PAGE : SHARED_PLAN);

/**
 * The page heading of `/plan/given/<id>` (`PageShell`'s `title`), drawn in the browser, which has the plan document. Until it
 * loads the words hold the space, hidden, so a student never reads "Shared plan" over their teacher's week.
 */
export function GivenPlanTitle({ id }: { id: string }) {
  const { state, loaded } = usePlan();
  if (!loaded) return <span aria-hidden className="invisible">{SHARED_PLAN}</span>;
  return <>{givenPageTitle(givenPlan(state, id))}</>;
}

/**
 * One given plan, live: read from the plan document, every change through `updateGiven` (ratings, which also go to the
 * progress log, ticks, the day timer, Edit), drawn by `GivenPlanView`. `/plan/given/<id>` hosts it, and so does `/plan`
 * for a teacher's student (their teacher's week). The host gives the header's controls. Keyed by the plan's id where the
 * id can change, so the open day starts again with a new plan.
 */
export function LiveGivenPlan({ id, date, controls }: { id: string; date: string; controls: (plan: StoredPlan) => ReactNode }) {
  const { state, loaded, update } = usePlan();
  const plan = loaded ? givenPlan(state, id) : undefined;
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
      controls={plan && controls(plan)}
      corner={<CornerLabels />}
    />
  );
}

/**
 * The page once the plan document has loaded: the given plan's header and week, or the not-found state. Without `onRate`,
 * `onTime` and `onEdit` (a teacher looking at a student's week) it is read-only: no stars, no day timer, no Edit; the days
 * and the tools in the exercises still open.
 */
export function GivenPlanView({ plan, date, day, onDay, onRate, ratedBy, times = [], onTime, onEdit, controls, corner }: {
  /** the given plan, or undefined when the id is not in `given` */
  plan: StoredPlan | undefined;
  /** today's local date */
  date: string;
  /** the day the player opened (null: today's) */
  day: number | null;
  onDay: (d: number) => void;
  /** rates an exercise; without it the cards have no stars */
  onRate?: (day: number, ex: number, stars: Stars | null) => void;
  /** read-only (no `onRate`): whose stars the cards show, under their name (a teacher's view of a student's week) */
  ratedBy?: string;
  times?: DayTime[];
  /** saves the day timer's time; without it there is no timer */
  onTime?: (time: DayTime) => void;
  /** saves a day edited in place; without it the day has no Edit */
  onEdit?: (next: StoredPlan) => void;
  /** the header's controls (Labels on a phone, Share plan) */
  controls: ReactNode;
  /** small controls over the day timer (Labels) */
  corner: ReactNode;
}) {
  if (!plan) return <NotFound />;
  const { today, over } = givenToday(plan, date);
  // a plan of one day (a day someone shared from /plan) is drawn as one day: no day strip, no "Day 1 of 1"
  const one = planDays(plan) === 1;
  // a week made for fewer practice days counts and shows those days only; on a day between them it opens the last one
  const shown = practiceDays(plan);
  const length = daysLabel(shown.length);
  const place = shown.indexOf(today);
  return (
    <FixedLabelRoot value="scale">
      {/* necks keep the page's margins rather than bleeding to the window's edge */}
      <div className={`flex flex-col gap-4 ${onTime ? "pb-28" : ""} [&_.bleed]:mx-0`}>
        <div className="mt-4 mb-2 flex flex-col gap-5 sm:mt-6">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wider text-amber-300/90">
              {over || one ? length : place < 0 ? `${length} · no practice planned today` : `Day ${place + 1} of ${shown.length}`} · started {dateLabel(plan.startedOn)}{sharedByLabel(plan) && ` · ${sharedByLabel(plan)}`}
            </p>
            {givenTitle(plan) && <h2 className="mt-2 text-3xl text-slate-50" style={DISPLAY}>{givenTitle(plan)}</h2>}
            {(plan.config.summary || (one && plan.config.days[0]?.theme)) && <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-400">{plan.config.summary || plan.config.days[0].theme}</p>}
          </div>
          {controls && <div className="flex flex-wrap items-center gap-2">{controls}</div>}
        </div>
        {one
          // the timer starts by itself only while the day runs
          ? <DayPanel plan={plan} day={0} heading={null} timerLabel={over ? "Shared plan" : "Today"} autoStart={!over} onRate={onRate} ratedBy={ratedBy} times={times} onTime={onTime} onEdit={onEdit} corner={corner} />
          : <WeekView plan={plan} today={today} ended={over} day={day ?? openDay(plan, today)} onDay={onDay} onRate={onRate as WeekRate} ratedBy={ratedBy} times={times} onTime={onTime} onEdit={onEdit} corner={corner} />}
      </div>
    </FixedLabelRoot>
  );
}

/** `WeekView` types its `onRate` as required, but its days take none (no stars); read-only passes none. */
type WeekRate = (day: number, ex: number, stars: Stars | null) => void;

/** The id is not one of the player's given plans: what that means, and the way back to their own plan. */
function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-6 text-center">
      <h2 className="text-lg text-slate-100">This shared plan isn&apos;t in your plans</h2>
      <p className="text-sm leading-relaxed text-slate-400">The link may be wrong, or you are logged in to another account. Your own plan for today is on the Practice plan page.</p>
      <Link href="/plan" className={btn}><Icon name="chevron-left" size={14} /> Open Practice plan</Link>
    </div>
  );
}
