import { NO_ACCOUNTS, auth, baseUrl, json, readJson } from "@/features/account/server/http";
import { safeNext } from "@/features/account/server/auth";
import { paymentsEnabled } from "@/features/account/server/paymentsEnabled";
import { startCheckout } from "@/features/account/server/stripe";
import { signedIn } from "@/features/userData/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WORDS = {
  plan: "That plan can't be paid for. Reload the page to see the plans you can choose.",
  free: "This plan has nothing to pay.",
  subscribed: "You already pay for a plan. Change it in Manage billing.",
  user: "This account no longer exists.",
} as const;

/**
 * Start paying: JSON { next?, planId?, billing? } answers { url } of a Stripe Checkout page. With no planId, the plan the
 * account is on (setup, for an account that must pay); with one, that plan (/account, an exempt account paying).
 */
export async function POST(req: Request) {
  const deps = auth();
  if (!deps) return json({ error: NO_ACCOUNTS }, 503);
  if (!paymentsEnabled()) return json({ error: "Payments aren't open yet." }, 404);
  const me = await signedIn(req, deps);
  if (me instanceof Response) return me;
  const body = await readJson(req);
  try {
    const result = await startCheckout(deps, me.account.id, { planId: body?.planId, billing: body?.billing }, baseUrl(req), safeNext(body?.next) ?? "/plan");
    if ("url" in result) return json({ url: result.url }, 200, me.cookies);
    return json({ error: WORDS[result.error] }, 400, me.cookies);
  } catch (e) {
    console.error("[checkout]", e);
    return json({ error: "We couldn't open the payment page. Try again in a minute." }, 502, me.cookies);
  }
}
