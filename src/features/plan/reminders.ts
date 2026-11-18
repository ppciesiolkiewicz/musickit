import { dayProgress, localDate, ownDay } from "./model/schedule";
import type { PlanState } from "./model/types";

export const notificationsSupported = (): boolean => typeof window !== "undefined" && "Notification" in window;

/** Ask the browser to let attunr show notifications. True when allowed. */
export async function askNotifications(): Promise<boolean> {
  if (!notificationsSupported()) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  return (await Notification.requestPermission()) === "granted";
}

/**
 * Whether a reminder is due now: switched on, past the chosen time, not already shown today, the questions answered, and
 * today's own plan either not made yet (the plan page makes it when it opens) or not finished. A given plan plays no part.
 */
export function reminderDue(state: PlanState, now: Date): boolean {
  const { reminder } = state;
  if (!reminder.enabled || !state.answers) return false;
  const today = localDate(now);
  if (reminder.lastShownOn === today) return false;
  const own = ownDay(state, today);
  if (own && dayProgress(own, 0) === 1) return false;
  const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  return hhmm >= reminder.time;
}

/** The reminder's words: today's plan and its topics, or, before it is made, that opening the plan page makes it. */
export function reminderBody(state: PlanState, now: Date): string {
  const own = ownDay(state, localDate(now));
  if (!own) return "Open the Practice plan page, and attunr puts today's plan together.";
  const theme = own.config.days[0]?.theme;
  return `Today's plan${theme ? `: ${theme}` : ""}`;
}

/** A notification the moment the reminder is switched on, so the player sees one and knows notifications get through. */
export function confirmReminder(time: string): void {
  if (!notificationsSupported() || Notification.permission !== "granted") return;
  new Notification("Reminder on", { body: `attunr reminds you at ${time} each day while a tab is open.`, tag: "attunr-plan", icon: "/icon.png" });
}

/** Show the daily reminder; clicking it opens the plan. */
export function showReminder(state: PlanState, now: Date): void {
  if (!notificationsSupported() || Notification.permission !== "granted") return;
  const n = new Notification("Time to practise", { body: reminderBody(state, now), tag: "attunr-plan", icon: "/icon.png" });
  n.onclick = () => {
    window.focus();
    // a notification click is outside React, so there is no router to push with
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/plan";
  };
}
