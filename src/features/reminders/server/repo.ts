import type { Reminder, ReminderSettings } from "../model";

/** Where reminders are kept: Postgres (`repo.drizzle.ts`) or memory for tests (`repo.memory.ts`). */
export interface ReminderRepo {
  get(userId: string): Promise<Reminder | null>;
  /** Saves the settings; a changed time clears `sentOn`, so a new time later today can still remind. */
  put(userId: string, s: ReminderSettings, now: Date): Promise<Reminder>;
  /** Switches the email off (the unsubscribe link). False when the account has no reminder. */
  turnOff(userId: string, now: Date): Promise<boolean>;
  listEnabled(): Promise<Array<Reminder & { userId: string }>>;
  /** True when this call set `sentOn` to `date` (it was null or another date); false when it already was `date`. */
  claim(userId: string, date: string): Promise<boolean>;
  /** Puts `sentOn` back to `previous` after a failed send. */
  unclaim(userId: string, previous: string | null): Promise<void>;
}
