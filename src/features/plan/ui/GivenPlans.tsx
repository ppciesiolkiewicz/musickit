import Link from "next/link";
import Icon from "@/components/Icon";
import { dateLabel, daysLabel, isDayTitle } from "../model/today";
import { planDays, type StoredPlan } from "../model/types";

/** One name for a plan someone shared with the player, on every screen that names it. */
export const SHARED_PLAN = "Shared plan";

/**
 * A given plan's title on the screen. A composed day shared from `/plan` is titled with the sharer's date, which is not
 * the day it runs for the player who claimed it: a one-day plan with a date title is named `SHARED_PLAN`, and the start
 * date beside it is the only date shown.
 */
export const givenTitle = (p: StoredPlan): string => (planDays(p) === 1 && isDayTitle(p.config.title) ? SHARED_PLAN : p.config.title);

/** The address of a given plan's own page. */
export const givenHref = (id: string): string => `/plan/given/${encodeURIComponent(id)}`;

/**
 * The plans the player was given (`PlanState.given`, newest first) on `/plan`: each its title, how many days and when it
 * started, a link to its own page. Nothing when there are none. Who shared one isn't stored, so it isn't shown.
 */
export default function GivenPlans({ plans }: { plans: StoredPlan[] }) {
  if (!plans.length) return null;
  return (
    <section aria-labelledby="given-plans-h" className="flex flex-col gap-2">
      <h2 id="given-plans-h" className="text-xs font-medium uppercase tracking-wider text-slate-400">Plans shared with you</h2>
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
