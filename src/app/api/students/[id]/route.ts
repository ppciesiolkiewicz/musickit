import { NO_ACCOUNTS, json } from "@/features/account/server/http";
import { studentsHttp } from "@/features/students/server/deps";
import { viewRoute } from "@/features/students/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** What a teacher sees of their student on `?today=yyyy-mm-dd`: { student, plan, topics }. 404 for anyone else's student. */
export async function GET(req: Request, { params }: Ctx) {
  const { id } = await params;
  const h = studentsHttp();
  return h ? viewRoute(h, req, id) : json({ error: NO_ACCOUNTS, code: "no-accounts" }, 503);
}
