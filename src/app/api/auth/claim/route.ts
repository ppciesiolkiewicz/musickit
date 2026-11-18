import { NO_ACCOUNTS, json } from "@/features/account/server/http";
import { studentsHttp } from "@/features/students/server/deps";
import { claimOpenRoute, claimPeekRoute } from "@/features/students/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const off = () => json({ error: NO_ACCOUNTS, code: "no-accounts" }, 503);

/** Whose claim link `?token=` is, without using it: { name }, or 410. */
export async function GET(req: Request) {
  const h = studentsHttp();
  return h ? claimPeekRoute(h, req) : off();
}

/** Uses the claim link and signs the student in. JSON { token }. Answers { next } with the session cookies, or 410. */
export async function POST(req: Request) {
  const h = studentsHttp();
  return h ? claimOpenRoute(h, req) : off();
}
