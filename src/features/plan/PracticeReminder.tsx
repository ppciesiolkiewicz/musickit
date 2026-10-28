"use client";

import { useEffect } from "react";
import { reminderDue, showReminder } from "./reminders";
import { localPlanStore } from "./store/localPlanStore";
import { localDate } from "./model/schedule";

/**
 * Renders nothing: while any attunr page is open it checks once a minute (and when the tab comes back) whether today's
 * practice reminder is due, and shows it. Browsers give no reliable timer once every tab is closed without a push server.
 */
export default function PracticeReminder() {
  useEffect(() => {
    let busy = false;
    const check = async () => {
      if (busy) return;
      busy = true;
      try {
        const state = await localPlanStore.load();
        const now = new Date();
        if (reminderDue(state, now)) {
          showReminder(state, now);
          await localPlanStore.save({ ...state, reminder: { ...state.reminder, lastShownOn: localDate(now) } });
        }
      } finally {
        busy = false;
      }
    };
    void check();
    const timer = setInterval(check, 60_000);
    const onVisible = () => document.visibilityState === "visible" && void check();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
  return null;
}
