import { NextResponse } from "next/server";
import { auth, baseUrl, requestAccount } from "@/features/account/server/http";
import { safeNext } from "@/features/account/server/auth";
import { finishCheckout } from "@/features/account/server/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Stripe sends the person here after Checkout (?session_id, ?next). The subscription is recorded now rather than when
 * the webhook comes, then on to `next`. If that fails the webhook still records it; the setup page waits for it.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const next = safeNext(url.searchParams.get("next")) ?? "/plan";
  const deps = auth();
  const sessionId = url.searchParams.get("session_id");
  if (deps && sessionId) {
    const { account } = await requestAccount(deps, req);
    if (account) await finishCheckout(deps, account.id, sessionId).catch((e) => console.error("[checkout done]", e));
  }
  return NextResponse.redirect(new URL(next, baseUrl(req)), 303);
}
