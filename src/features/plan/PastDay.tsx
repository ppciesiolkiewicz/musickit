"use client";

import Link from "next/link";
import Icon from "@/components/Icon";
import { btn } from "@/components/ui";
import { DISPLAY } from "@/components/landing/Display";
import { FixedLabelRoot } from "@/features/theory/useLabelSystem";
import { PAST_DAYS, dayName, pastDays } from "./model/today";
import { usePlan } from "./store/usePlan";
import { pastDayHref, ratedCount } from "./ui/PastDays";
import { useClockDate } from "./ui/useTodayPlan";
import { DayPanel } from "./ui/WeekView";

/**
 * One past day (`/plan/day/<id>`), read-only: a link back to today's plan, links to the newer and the older past day, and
 * the day's exercises (`DayPanel` without stars, timer or Edit). The day is found among `pastDays`, so only the days
 * `/plan` links to open here; any other id shows the not-found state with a link back to `/plan`.
 */
export default function PastDay({ id }: { id: string }) {
  const { state, loaded } = usePlan();
  const date = useClockDate();
  if (!loaded) return <p className="text-sm text-slate-500">Loading…</p>;
  const days = pastDays(state.history, state.current, date);
  const at = days.findIndex((p) => p.id === id);
  const plan = days[at];
  const back = <Link href="/plan" className={btn}><Icon name="chevron-left" size={14} /> Today&apos;s plan</Link>;
  if (!plan) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-6 text-center">
        <h2 className="text-lg text-slate-100">This day isn&apos;t in your past days</h2>
        <p className="text-sm leading-relaxed text-slate-400">The Practice plan page lists your last {PAST_DAYS} days. The link may be older than that, or you are logged in to another account.</p>
        {back}
      </div>
    );
  }
  const name = dayName(plan.startedOn);
  const theme = plan.config.days[0]?.theme;
  const { rated, of } = ratedCount(plan);
  // newest first: the newer day is the one before
  const newer = days[at - 1];
  const older = days[at + 1];
  const step = (p: (typeof days)[number] | undefined, label: string, icon: "chevron-left" | "chevron-right") => {
    if (!p) return null;
    const n = dayName(p.startedOn);
    return (
      <Link href={pastDayHref(p.id)} className={btn} title={`${label}: ${n.weekday} ${n.date}`}>
        {icon === "chevron-left" && <Icon name={icon} size={14} />}{label} · {n.short} {n.date}{icon === "chevron-right" && <Icon name={icon} size={14} />}
      </Link>
    );
  };
  return (
    <FixedLabelRoot value="scale">
      <div className="flex flex-col gap-4 [&_.bleed]:mx-0">
        <nav aria-label="Past days" className="flex flex-wrap items-center gap-2">
          {back}
          <span className="flex-1" />
          {step(older, "Older day", "chevron-left")}
          {step(newer, "Newer day", "chevron-right")}
        </nav>
        <DayPanel
          key={plan.id}
          plan={plan}
          day={0}
          heading={<>
            <h2 className="text-2xl text-slate-50" style={DISPLAY}>{name.weekday} {name.full}{theme ? `: ${theme}` : ""}</h2>
            <span className="text-xs text-slate-500">{rated} of {of} rated</span>
          </>}
          timerLabel=""
          autoStart={false}
          readOnly
        />
      </div>
    </FixedLabelRoot>
  );
}
