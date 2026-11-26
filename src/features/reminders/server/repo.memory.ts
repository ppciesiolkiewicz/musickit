import type { Reminder } from "../model";
import type { ReminderRepo } from "./repo";

/** Reminders in a Map, for tests. Each call is one step, so two runs at once interleave as Postgres's single statements do. */
export function memoryReminderRepo(): ReminderRepo {
  const rows = new Map<string, Reminder>();
  return {
    async get(id) {
      const r = rows.get(id);
      return r ? { ...r } : null;
    },
    async put(id, s) {
      const old = rows.get(id);
      const r: Reminder = { ...s, sentOn: old && old.time === s.time ? old.sentOn : null };
      rows.set(id, r);
      return { ...r };
    },
    async turnOff(id) {
      const r = rows.get(id);
      if (!r) return false;
      rows.set(id, { ...r, enabled: false });
      return true;
    },
    async listEnabled() {
      return [...rows].filter(([, r]) => r.enabled).map(([userId, r]) => ({ ...r, userId }));
    },
    async listAll() {
      return [...rows].map(([userId, r]) => ({ ...r, userId }));
    },
    async claim(id, date) {
      const r = rows.get(id);
      if (!r || r.sentOn === date) return false;
      rows.set(id, { ...r, sentOn: date });
      return true;
    },
    async unclaim(id, previous) {
      const r = rows.get(id);
      if (r) rows.set(id, { ...r, sentOn: previous });
    },
  };
}
