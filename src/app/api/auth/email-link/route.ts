import { after } from "next/server";
import { LINK_DAY_LIMIT, LINK_LIMIT, LINK_WINDOW, requestEmailLink, type LinkError } from "@/features/account/server/auth";
import { NO_ACCOUNTS, auth, baseUrl, json, readJson, sameOrigin } from "@/features/account/server/http";
import { LINK_LIFE, confirmUrl, linkEmail, sendMail } from "@/features/account/server/mail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ERRORS: Record<LinkError, string> = {
  email: "Type your email address, like ann@school.com.",
  limit: `We already sent ${LINK_LIMIT} log-in emails to this address. Use the newest one, or try again in ${LINK_WINDOW / 60_000} minutes.`,
  daily: `We already sent ${LINK_DAY_LIMIT} log-in emails to this address today. Use the newest one, or try again tomorrow.`,
};

/**
 * Mails a link and a 6-digit code (see ../email-code) that each log in, and make the account for an email with none. JSON { email, next? }.
 * The answer is the same whether or not the email has an account. In development, when nothing could be mailed (no
 * RESEND_API_KEY, or Resend refused it), the link and code are in the answer (`devLink`, `devCode`, with Resend's
 * reason in `devError`) and in the server log. `lasts` says how long they work, for the page.
 */
export async function POST(req: Request) {
  const deps = auth();
  if (!deps) return json({ error: NO_ACCOUNTS }, 503);
  if (!sameOrigin(req)) return json({ error: "Bad request." }, 403);
  const body = await readJson(req);
  if (!body) return json({ error: "Bad request." }, 400);

  const r = await requestEmailLink(deps, { email: body.email, next: body.next });
  if (!r.ok) return json({ error: ERRORS[r.error], field: r.error }, r.error === "limit" ? 429 : 400);
  after(() => deps.repo.deleteExpired(deps.now()).catch(() => {}));

  const link = confirmUrl(baseUrl(req), r.token);
  const dev = process.env.NODE_ENV !== "production";
  let sent: "sent" | "off";
  try {
    sent = await sendMail(linkEmail(r.email, link, r.code, process.env));
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e);
    console.error(`[auth] the log-in email to ${r.email} was not sent: ${reason}`);
    if (!dev) return json({ error: "We couldn't send the email. Try again in a minute." }, 502);
    console.log(`[auth] development, link for ${r.email}: ${link} code ${r.code}`);
    return json({ ok: true, email: r.email, lasts: LINK_LIFE, devLink: link, devCode: r.code, devError: reason });
  }
  if (sent === "sent") return json({ ok: true, email: r.email, lasts: LINK_LIFE });
  if (!dev) return json({ error: "Email isn't set up on this site yet." }, 503);
  console.log(`[auth] no RESEND_API_KEY, link for ${r.email}: ${link} code ${r.code}`);
  return json({ ok: true, email: r.email, lasts: LINK_LIFE, devLink: link, devCode: r.code });
}
