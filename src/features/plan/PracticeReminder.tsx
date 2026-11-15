"use client";

import { useEffect } from "react";
import { notificationsSupported, reminderDue, showReminder } from "./reminders";
import { usePlanStore } from "./store/usePlan";
import { localDate } from "./model/schedule";
import type { PlanState } from "./model/types";

/**
 * Renders nothing: while any attunr page is open it checks once a minute (and when the tab comes back) whether today's
 * practice reminder is due, and shows it. Browsers give no reliable timer once every tab is closed without a push server.
 * It reads the plan through the page's `PlanStore` (on the server for a signed-in player): once when the page opens or
 * the tab comes back, and again only when the plan it holds says a reminder is due, so the server is not asked each minute.
 */
export default function PracticeReminder() {
  const store = usePlanStore();
  useEffect(() => {
    if (!notificationsSupported() || Notification.permission !== "granted") return;
    let live = true;
    let busy = false;
    let held: PlanState | null = null;
    const check = async (fresh: boolean) => {
      if (busy) return;
      busy = true;
      try {
        const now = new Date();
        if (fresh || !held || reminderDue(held, now)) held = await store.load();
        if (!live || !reminderDue(held, now)) return;
        showReminder(held, now);
        held = { ...held, reminder: { ...held.reminder, lastShownOn: localDate(now) } };
        await store.save(held);
      } catch {
        /* the plan could not be read: try again next minute */
      } finally {
        busy = false;
      }
    };
    void check(true);
    const timer = setInterval(() => void check(false), 60_000);
    const onVisible = () => document.visibilityState === "visible" && void check(true);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      live = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [store]);
  return null;
}
