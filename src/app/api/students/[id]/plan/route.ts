import { NO_ACCOUNTS, json } from "@/features/account/server/http";
import { studentsHttp } from "@/features/students/server/deps";
import { planRoute } from "@/features/students/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** Makes the student's next week, or rotates the current one: { planId, start, short, comment }. JSON { today, rotate, scores, comment }. */
export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  const h = studentsHttp();
  return h ? planRoute(h, req, id) : json({ error: NO_ACCOUNTS, code: "no-accounts" }, 503);
}
