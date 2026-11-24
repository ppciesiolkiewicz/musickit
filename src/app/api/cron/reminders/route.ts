import { cronRoute } from "@/features/reminders/server/http";
import { runDeps } from "@/features/reminders/server/deps";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** The outside scheduler calls this every 15 minutes with `Authorization: Bearer $CRON_SECRET`; it sends the reminder emails due now. */
export async function POST(req: Request) {
  return cronRoute(() => runDeps(req), req, process.env, new Date());
}

export const GET = POST;
