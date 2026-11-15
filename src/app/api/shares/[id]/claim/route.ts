import { NO_ACCOUNTS, json } from "@/features/account/server/http";
import { signedIn, userData } from "@/features/userData/server/http";
import { claimInvite } from "@/features/userData/server/shares";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Claims a plan invite for the signed-in person: a copy of the plan in their plans (once; a second claim adds nothing).
 * Answers { planId }. A stopped invite is 410, an unknown one (or a note link) 404, no session 401.
 */
export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  const me = await signedIn(req);
  if (me instanceof Response) return me;
  const store = userData();
  if (!store) return json({ error: NO_ACCOUNTS }, 503, me.cookies);
  if (id.length > 100) return json({ error: "Not found.", code: "not-found" }, 404, me.cookies);
  const done = await claimInvite(store.repo, me.account, id, new Date());
  if ("error" in done) {
    return done.error === "stopped" ? json({ error: "This invite was stopped.", code: "stopped" }, 410, me.cookies) : json({ error: "Not found.", code: "not-found" }, 404, me.cookies);
  }
  return json({ planId: done.planId }, 200, me.cookies);
}
