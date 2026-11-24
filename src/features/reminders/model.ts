/** A player's daily reminder email: on or off, a local quarter-hour time in their time zone, and the local date it last went out. */
export interface Reminder {
  enabled: boolean;
  /** local "HH:MM", on a quarter hour */
  time: string;
  /** IANA time zone from the browser */
  zone: string;
  /** the zone's local date (yyyy-mm-dd) the email last went out, or null */
  sentOn: string | null;
}

export type ReminderSettings = Pick<Reminder, "enabled" | "time" | "zone">;

export const DEFAULT_TIME = "18:00";

/** "00:00" … "23:45": the scheduler runs every 15 minutes, so a time always falls on a run. */
export const QUARTER_TIMES: string[] = Array.from({ length: 96 }, (_, i) => `${String(Math.floor(i / 4)).padStart(2, "0")}:${String((i % 4) * 15).padStart(2, "0")}`);

const TIME = /^([01]\d|2[0-3]):(00|15|30|45)$/;

export function validZone(zone: unknown): zone is string {
  if (typeof zone !== "string" || !zone || zone.length > 64) return false;
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

/** Settings from a request body, or null when any part is wrong. */
export function cleanSettings(raw: unknown): ReminderSettings | null {
  const r = (raw ?? {}) as Record<string, unknown>;
  if (typeof r.enabled !== "boolean" || typeof r.time !== "string" || !TIME.test(r.time) || !validZone(r.zone)) return null;
  return { enabled: r.enabled, time: r.time, zone: r.zone };
}

/** The zone's local date and time at `now`. */
export function localNow(now: Date, zone: string): { date: string; hhmm: string } {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, hhmm: `${get("hour")}:${get("minute")}` };
}

const minutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

/**
 * The local date the email is due on now, or null: switched on, the zone's local time at or past `time` and less than
 * an hour past it on the same date, and not sent that date. A scheduler down for over an hour skips that day.
 */
export function dueOn(r: Reminder, now: Date): string | null {
  if (!r.enabled || !validZone(r.zone)) return null;
  const { date, hhmm } = localNow(now, r.zone);
  const m = minutes(hhmm);
  const t = minutes(r.time);
  if (m < t || m >= Math.min(t + 60, 24 * 60)) return null;
  return r.sentOn === date ? null : date;
}
