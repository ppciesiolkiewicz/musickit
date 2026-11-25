import { DEFAULT_TIME, cleanSettings, validZone, type ReminderSettings } from "../model";
import type { ReminderRepo } from "./repo";

/**
 * A new account's first reminder, from the setup form. `raw` is saved when it's whole; missing or broken, the default
 * (on, 18:00) in the zone it gave, or UTC. Never overwrites a reminder the account already has, so setting up again
 * keeps the earlier choice. Never throws on bad input.
 */
export async function startReminder(repo: ReminderRepo, userId: string, raw: unknown, now: Date): Promise<void> {
  if (await repo.get(userId)) return;
  const zone = (raw as { zone?: unknown } | null | undefined)?.zone;
  const s: ReminderSettings = cleanSettings(raw) ?? { enabled: true, time: DEFAULT_TIME, zone: validZone(zone) ? zone : "UTC" };
  await repo.put(userId, s, now);
}
