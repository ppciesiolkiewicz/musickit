import type Stripe from "stripe";
import { auth, json } from "@/features/account/server/http";
import { recordInvoice, stripe, syncSubscription } from "@/features/account/server/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Stripe's webhook: keeps each account's subscription, status and plan in step. Signed with STRIPE_WEBHOOK_SECRET.
 * Events to send: customer.subscription.created, .updated, .deleted, checkout.session.completed, and invoice.paid
 * (each paid invoice is kept as an order in `payments`).
 */
export async function POST(req: Request) {
  const deps = auth();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!deps || !secret) return json({ error: "Not set up." }, 503);
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(await req.text(), req.headers.get("stripe-signature") ?? "", secret);
  } catch {
    return json({ error: "Bad signature." }, 400);
  }
  try {
    if (event.type.startsWith("customer.subscription.")) {
      await syncSubscription(deps, event.data.object as Stripe.Subscription);
    } else if (event.type === "invoice.paid") {
      // the price comes as an id on the invoice; fetched with its metadata, which names the plan
      const invoice = await stripe().invoices.retrieve((event.data.object as Stripe.Invoice).id!, { expand: ["lines.data.pricing.price_details.price"] });
      await recordInvoice(deps, invoice);
    } else if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      if (typeof session.subscription === "string") await syncSubscription(deps, await stripe().subscriptions.retrieve(session.subscription));
    }
  } catch (e) {
    console.error("[stripe webhook]", event.type, e);
    return json({ error: "Failed." }, 500);
  }
  return json({ ok: true }, 200);
}
