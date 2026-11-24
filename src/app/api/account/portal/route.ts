import { NO_ACCOUNTS, auth, baseUrl, json } from "@/features/account/server/http";
import { paymentsEnabled } from "@/features/account/server/paymentsEnabled";
import { openPortal } from "@/features/account/server/stripe";
import { signedIn } from "@/features/userData/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Manage billing on /account: answers { url } of Stripe's billing portal (change plan, card, cancel, invoices). */
export async function POST(req: Request) {
  const deps = auth();
  if (!deps) return json({ error: NO_ACCOUNTS }, 503);
  if (!paymentsEnabled()) return json({ error: "Payments aren't open yet." }, 404);
  const me = await signedIn(req, deps);
  if (me instanceof Response) return me;
  try {
    const url = await openPortal(deps, me.account.id, baseUrl(req));
    if (!url) return json({ error: "You haven't paid for a plan yet." }, 400, me.cookies);
    return json({ url }, 200, me.cookies);
  } catch (e) {
    console.error("[portal]", e);
    return json({ error: "We couldn't open billing. Try again in a minute." }, 502, me.cookies);
  }
}
