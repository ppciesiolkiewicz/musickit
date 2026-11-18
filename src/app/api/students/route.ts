import { NO_ACCOUNTS, json } from "@/features/account/server/http";
import { studentsHttp } from "@/features/students/server/deps";
import { addRoute, listRoute } from "@/features/students/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const off = () => json({ error: NO_ACCOUNTS, code: "no-accounts" }, 503);

/** The teacher's students and their plan's limit: { students, limit }. */
export async function GET(req: Request) {
  const h = studentsHttp();
  return h ? listRoute(h, req) : off();
}

/** Adds a student, makes their first week and mails the claim link: { student, plan, mail }. JSON { name, email, answers, today }. */
export async function POST(req: Request) {
  const h = studentsHttp();
  return h ? addRoute(h, req) : off();
}
