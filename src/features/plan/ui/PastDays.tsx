"use client";

import Link from "next/link";
import Icon from "@/components/Icon";
import { Section } from "@/components/ui";
import { doneKey } from "../model/schedule";
import { pastDays } from "../model/today";
import type { StoredPlan } from "../model/types";

/** The address of a past day's own page. */
export const pastDayHref = (id: string): string => `/plan/day/${encodeURIComponent(id)}`;

/** How many of a day's exercises were rated, and how many it had. */
export function ratedCount(p: StoredPlan): { rated: number; of: number } {
  const exercises = p.config.days[0]?.exercises ?? [];
  return { rated: exercises.filter((_, i) => p.rated?.[doneKey(0, i)]).length, of: exercises.length };
}

/**
 * The last few past days (`pastDays`), newest first, folded until the player opens the section: each row its date, its
 * topics and how many exercises were rated, a link to the day read-only on its own page (`/plan/day/<id>`, `PastDay`).
 * Nothing when there are none.
 */
export default function PastDays({ history, current, date }: { history: StoredPlan[]; current: StoredPlan | null; date: string }) {
  const days = pastDays(history, current, date);
  if (!days.length) return null;
  return (
    <Section title="Past days" meta={`${days.length}`} defaultOpen={false}>
      <ul className="flex flex-col gap-2">
        {days.map((p) => {
          const { rated, of } = ratedCount(p);
          return (
            <li key={p.id}>
              <Link href={pastDayHref(p.id)} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-slate-800 px-3 py-2 transition hover:border-slate-600 hover:bg-slate-800/40">
                <span className="min-w-0 flex-1 text-sm text-slate-200">
                  {p.config.title}
                  {p.config.days[0]?.theme && <span className="text-slate-500"> · {p.config.days[0].theme}</span>}
                </span>
                <span className="text-xs text-slate-500">{rated} of {of} rated</span>
                <Icon name="chevron-right" size={14} className="text-slate-500" />
              </Link>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
