"use client";

import { Chip } from "@/components/ui";
import { WEEKDAYS } from "@/features/plan/model/practiceDays";
import { toggleDay } from "../model/makeFlow";

/**
 * The practice days of a student's plan: a chip per weekday, Monday first, the chosen ones pressed. A press switches a
 * day on or off (`toggleDay`: the last day left on stays on). Adding a student and a student's Next plan both draw it.
 */
export default function PracticeDays({ days, onDays, disabled, labelledBy }: { days: number[]; onDays: (days: number[]) => void; disabled?: boolean; labelledBy: string }) {
  return (
    <div role="group" aria-labelledby={labelledBy} className="flex flex-wrap gap-1.5">
      {WEEKDAYS.map((name, d) => {
        const on = days.includes(d);
        const title = !on ? `Make ${name} a practice day` : days.length > 1 ? `Take ${name} off the practice days` : `${name} is the only practice day, so it stays on`;
        return <Chip key={name} on={on} disabled={disabled} onClick={() => onDays(toggleDay(days, d))} title={title}>{name}</Chip>;
      })}
    </div>
  );
}
