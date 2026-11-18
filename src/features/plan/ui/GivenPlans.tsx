import Link from "next/link";
import Icon from "@/components/Icon";
import { dateLabel, daysLabel, isDayTitle } from "../model/today";
import { planDays, type StoredPlan } from "../model/types";

/** One name for a plan someone shared with the player, on every screen that names it. */
export const SHARED_PLAN = "Shared plan";

/** A week a teacher made, which is stored with no title, named by its first day: "Week of 16 November". */
export const weekTitle = (startedOn: string): string => `Week of ${dateLabel(startedOn)}`;

/**
 * A given plan's title on the screen. A composed day shared from `/plan` is titled with the sharer's date, which is not
 * the day it runs for the player who claimed it: a one-day plan with a date title is named `SHARED_PLAN`, and the start
 * date beside it is the only date shown. A teacher's week with no title of its own is named by its dates (`weekTitle`).
 */
export const givenTitle = (p: StoredPlan): string =>
  p.teacher && !p.config.title.trim() ? weekTitle(p.startedOn) : planDays(p) === 1 && isDayTitle(p.config.title) ? SHARED_PLAN : p.config.title;

/** The address of a given plan's own page. */
export const givenHref = (id: string): string => `/plan/given/${encodeURIComponent(id)}`;

/**
 * The plans shared with the player (`PlanState.given`, newest first, without the weeks a teacher made) on `/plan`: each its
 * title, how many days and when it started, a link to its own page. Nothing when there are none. Who shared one isn't
 * stored, so it isn't shown.
 */
export default function GivenPlans({ plans }: { plans: StoredPlan[] }) {
  return <PlanLinks id="given-plans-h" heading="Plans shared with you" plans={plans.filter((p) => !p.teacher)} />;
}

/** A teacher's student's earlier weeks on `/plan`, under the one drawn there: each a link to its own page. Nothing when there are none. */
export function EarlierWeeks({ plans }: { plans: StoredPlan[] }) {
  return <PlanLinks id="earlier-weeks-h" heading="Earlier plans" plans={plans} />;
}

/** A headed list of given plans, each a link to its own page; nothing when there are none. */
function PlanLinks({ id, heading, plans }: { id: string; heading: string; plans: StoredPlan[] }) {
  if (!plans.length) return null;
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2">
      <h2 id={id} className="text-xs font-medium uppercase tracking-wider text-slate-400">{heading}</h2>
      <ul className="flex flex-col gap-2">
        {plans.map((p) => (
          <li key={p.id}>
            <Link href={givenHref(p.id)} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2 transition hover:border-sky-500/60 hover:bg-slate-800/60">
              <span className="min-w-0 flex-1 text-sm text-slate-100">{givenTitle(p)}</span>
              <span className="text-xs text-slate-500">{daysLabel(planDays(p))} · started {dateLabel(p.startedOn)}</span>
              <Icon name="chevron-right" size={14} className="text-slate-500" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
