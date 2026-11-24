import { NO_ACCOUNTS, json } from "@/features/account/server/http";
import { reminderRepo } from "@/features/reminders/server/deps";
import { offRoute } from "@/features/reminders/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Turns reminder emails off for the account the `token` names. No login: the off page and mail programs post here. */
export async function POST(req: Request) {
  const repo = reminderRepo();
  return repo ? offRoute(repo, req, process.env, new Date()) : json({ error: NO_ACCOUNTS }, 503);
}
