"use client";

import Link from "next/link";
import { doneKey } from "../model/schedule";
import { dayName, pastDays } from "../model/today";
import type { StoredPlan } from "../model/types";

/** The address of a past day's own page. */
export const pastDayHref = (id: string): string => `/plan/day/${encodeURIComponent(id)}`;

/** How many of a day's exercises were rated, and how many it had. */
export function ratedCount(p: StoredPlan): { rated: number; of: number } {
  const exercises = p.config.days[0]?.exercises ?? [];
  return { rated: exercises.filter((_, i) => p.rated?.[doneKey(0, i)]).length, of: exercises.length };
}

/**
 * The last few past days (`pastDays`), newest first, as a row of links: each its weekday, date and how many exercises were
 * rated, opening the day read-only on its own page (`/plan/day/<id>`, `PastDay`). `/plan` draws it under today's plan, and a
 * past day's page above the day, with that day marked (`active`). Nothing when there are none.
 */
export default function PastDays({ history, current, date, active }: { history: StoredPlan[]; current: StoredPlan | null; date: string; active?: string }) {
  const days = pastDays(history, current, date);
  if (!days.length) return null;
  return (
    <nav aria-labelledby="past-days-h" className="flex flex-col gap-2">
      <h2 id="past-days-h" className="text-xs font-medium uppercase tracking-wider text-slate-400">Past days</h2>
      <ul className="flex flex-wrap gap-2">
        {days.map((p) => {
          const name = dayName(p.startedOn);
          const { rated, of } = ratedCount(p);
          const here = p.id === active;
          return (
            <li key={p.id}>
              <Link
                href={pastDayHref(p.id)}
                aria-current={here ? "page" : undefined}
                title={p.config.days[0]?.theme || undefined}
                className={`flex flex-col rounded-xl border px-3 py-1.5 text-left transition ${here ? "border-sky-500 bg-sky-500/10" : "border-slate-800 bg-slate-900/40 hover:border-slate-600"}`}
              >
                <span className="text-sm text-slate-200">{name.short} {name.date}</span>
                <span className="text-[11px] text-slate-500">{rated} of {of} rated</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
