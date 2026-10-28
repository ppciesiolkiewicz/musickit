import { dayIndex, dayProgress, localDate } from "./model/schedule";
import { PLAN_DAYS, type PlanState } from "./model/types";

export const notificationsSupported = (): boolean => typeof window !== "undefined" && "Notification" in window;

/** Ask the browser to let attunr show notifications. True when allowed. */
export async function askNotifications(): Promise<boolean> {
  if (!notificationsSupported()) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  return (await Notification.requestPermission()) === "granted";
}

/**
 * Whether a reminder is due now: switched on, a plan running and not over, today's exercises not all done,
 * past the chosen time, and not already shown today.
 */
export function reminderDue(state: PlanState, now: Date): boolean {
  const { reminder, current } = state;
  if (!reminder.enabled || !current) return false;
  const today = localDate(now);
  if (reminder.lastShownOn === today) return false;
  const day = dayIndex(current.startedOn, today);
  if (day >= PLAN_DAYS || dayProgress(current, day) === 1) return false;
  const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  return hhmm >= reminder.time;
}

/** Show the daily reminder; clicking it opens the plan. */
export function showReminder(state: PlanState, now: Date): void {
  if (!notificationsSupported() || Notification.permission !== "granted" || !state.current) return;
  const day = dayIndex(state.current.startedOn, localDate(now));
  const theme = state.current.config.days[day]?.theme;
  const n = new Notification("Time to practise", { body: `Day ${day + 1}${theme ? `: ${theme}` : ""}`, tag: "attunr-plan", icon: "/icon.png" });
  n.onclick = () => {
    window.focus();
    // a notification click is outside React, so there is no router to push with
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/plan";
  };
}
