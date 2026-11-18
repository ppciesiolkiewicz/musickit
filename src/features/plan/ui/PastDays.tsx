"use client";

import { useState } from "react";
import { Button, Section } from "@/components/ui";
import { doneKey } from "../model/schedule";
import { pastDays } from "../model/today";
import type { StoredPlan } from "../model/types";
import { DayPanel } from "./WeekView";

/** The past days, folded: each its date, its topics and how many exercises were rated, and its exercises read-only on Show exercises. */
export default function PastDays({ history, current, date }: { history: StoredPlan[]; current: StoredPlan | null; date: string }) {
  const days = pastDays(history, current, date);
  const [open, setOpen] = useState<string | null>(null);
  if (!days.length) return null;
  return (
    <Section title="Past days" meta={`${days.length}`}>
      <ul className="flex flex-col gap-2">
        {days.map((p) => {
          const exercises = p.config.days[0]?.exercises ?? [];
          const rated = exercises.filter((_, i) => p.rated?.[doneKey(0, i)]).length;
          const shown = open === p.id;
          return (
            <li key={p.id} className="flex flex-col gap-4 rounded-xl border border-slate-800 px-3 py-2">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="min-w-0 flex-1 text-sm text-slate-200">
                  {p.config.title}
                  {p.config.days[0]?.theme && <span className="text-slate-500"> · {p.config.days[0].theme}</span>}
                </span>
                <span className="text-xs text-slate-500">{rated} of {exercises.length} rated</span>
                <Button size="sm" aria-expanded={shown} onClick={() => setOpen(shown ? null : p.id)}>{shown ? "Hide exercises" : "Show exercises"}</Button>
              </div>
              {shown && <DayPanel plan={p} day={0} heading={null} timerLabel="" autoStart={false} readOnly />}
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
