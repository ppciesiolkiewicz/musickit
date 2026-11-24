import { and, eq, isNull, ne, or } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { reminders } from "@/lib/db/schema";
import type { Reminder } from "../model";
import type { ReminderRepo } from "./repo";

const cols = { enabled: reminders.enabled, time: reminders.time, zone: reminders.zone, sentOn: reminders.sentOn };

/** The repo over Postgres. */
export function drizzleReminderRepo(db: Db): ReminderRepo {
  return {
    async get(userId) {
      const [row] = await db.select(cols).from(reminders).where(eq(reminders.userId, userId)).limit(1);
      return row ?? null;
    },
    async put(userId, s, now) {
      const old = await this.get(userId);
      const sentOn = old && old.time === s.time ? old.sentOn : null;
      const r: Reminder = { ...s, sentOn };
      await db.insert(reminders).values({ userId, ...r, updatedAt: now }).onConflictDoUpdate({ target: reminders.userId, set: { ...r, updatedAt: now } });
      return r;
    },
    async turnOff(userId, now) {
      const rows = await db.update(reminders).set({ enabled: false, updatedAt: now }).where(eq(reminders.userId, userId)).returning({ id: reminders.userId });
      return rows.length === 1;
    },
    async listEnabled() {
      return db.select({ userId: reminders.userId, ...cols }).from(reminders).where(eq(reminders.enabled, true));
    },
    async claim(userId, date) {
      // one conditional statement, so of two runs at once only one gets the row back
      const rows = await db.update(reminders).set({ sentOn: date })
        .where(and(eq(reminders.userId, userId), or(isNull(reminders.sentOn), ne(reminders.sentOn, date))))
        .returning({ id: reminders.userId });
      return rows.length === 1;
    },
    async unclaim(userId, previous) {
      await db.update(reminders).set({ sentOn: previous }).where(eq(reminders.userId, userId));
    },
  };
}
