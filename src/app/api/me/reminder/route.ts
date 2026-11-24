import { NO_ACCOUNTS, auth, json } from "@/features/account/server/http";
import { reminderRepo } from "@/features/reminders/server/deps";
import { getRoute, putRoute } from "@/features/reminders/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const off = () => json({ error: NO_ACCOUNTS }, 503);

/** The signed-in player's daily reminder email: { reminder: { enabled, time, zone } | null }. */
export async function GET(req: Request) {
  const repo = reminderRepo();
  return repo ? getRoute(repo, auth(), req) : off();
}

/** Saves it (PATCH, the whole settings). JSON { enabled, time ("HH:MM" on a quarter hour), zone }. */
export async function PATCH(req: Request) {
  const repo = reminderRepo();
  return repo ? putRoute(repo, auth(), req, new Date()) : off();
}
