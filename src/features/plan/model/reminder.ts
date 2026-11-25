import { dayProgress, givenToday, ownDay, practiceDays, teacherWeekOn } from "./schedule";
import type { PlanState } from "./types";

/** Today's day of the teacher's week that covers today, for a teacher's student; else null (a rest day counts as none). */
function weekDay(state: PlanState, today: string) {
  const week = teacherWeekOn(state, today);
  if (!week) return null;
  const day = givenToday(week, today).today;
  return practiceDays(week).includes(day) ? { week, day } : null;
}

/**
 * Whether today's plan still wants a reminder, on the player's local date `today` (yyyy-mm-dd). A teacher's student
 * (`taught`, the account's): while a teacher week covers today and today's day of it isn't finished. Anyone else: the
 * questions answered, and today's own plan not made yet (the plan page makes it) or not finished.
 */
export function planWantsReminder(state: PlanState, today: string, taught: boolean): boolean {
  if (taught) {
    const w = weekDay(state, today);
    return !!w && dayProgress(w.week, w.day) < 1;
  }
  if (!state.answers) return false;
  const own = ownDay(state, today);
  return !own || dayProgress(own, 0) < 1;
}

/** The reminder's words: today's plan and its topic, that the plan page makes it, or which day of a teacher's plan today is. */
export function reminderBody(state: PlanState, today: string, taught: boolean): string {
  const w = taught ? weekDay(state, today) : null;
  if (w) return `Today is day ${practiceDays(w.week).indexOf(w.day) + 1} of ${practiceDays(w.week).length} in your plan.`;
  const own = ownDay(state, today);
  if (!own) return "Open the Practice plan page and attunr puts today's plan together.";
  const theme = own.config.days[0]?.theme;
  return `Today's plan${theme ? `: ${theme}` : ""}`;
}
