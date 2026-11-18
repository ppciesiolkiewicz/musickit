import { NO_ACCOUNTS, json } from "@/features/account/server/http";
import { studentsHttp } from "@/features/students/server/deps";
import { claimLinkRoute } from "@/features/students/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** Mails a new claim link to a student who has not logged in yet: { mail }. */
export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  const h = studentsHttp();
  return h ? claimLinkRoute(h, req, id) : json({ error: NO_ACCOUNTS, code: "no-accounts" }, 503);
}
