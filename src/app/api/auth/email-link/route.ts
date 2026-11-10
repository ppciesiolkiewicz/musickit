import { after } from "next/server";
import { LINK_LIMIT, LINK_WINDOW, requestEmailLink, type LinkError } from "@/features/account/server/auth";
import { NO_ACCOUNTS, auth, baseUrl, json, readJson, sameOrigin } from "@/features/account/server/http";
import { confirmUrl, linkEmail, sendMail } from "@/features/account/server/mail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ERRORS: Record<LinkError, string> = {
  email: "Type your email address, like ann@school.com.",
  name: "Type your name.",
  role: "Choose Student or Teacher.",
  limit: `We already sent ${LINK_LIMIT} links to this email. Open the newest one, or try again in ${LINK_WINDOW / 60_000} minutes.`,
};

/**
 * Mails a link that logs in or, with `register: true` and a name and role, creates the account when it is opened.
 * JSON { email, register?, name?, role?, next? }. The answer is the same whether or not the email has an account.
 * In development without RESEND_API_KEY nothing is mailed: the link is in the answer (`devLink`) and the server log.
 */
export async function POST(req: Request) {
  const deps = auth();
  if (!deps) return json({ error: NO_ACCOUNTS }, 503);
  if (!sameOrigin(req)) return json({ error: "Bad request." }, 403);
  const body = await readJson(req);
  if (!body) return json({ error: "Bad request." }, 400);

  const register = body.register === true;
  const r = await requestEmailLink(deps, { email: body.email, register, name: body.name, role: body.role, next: body.next });
  if (!r.ok) return json({ error: ERRORS[r.error], field: r.error }, r.error === "limit" ? 429 : 400);
  after(() => deps.repo.deleteExpired(deps.now()).catch(() => {}));

  const link = confirmUrl(baseUrl(req), r.token);
  let sent: "sent" | "off";
  try {
    sent = await sendMail(linkEmail(r.email, link, register, process.env));
  } catch {
    return json({ error: "We couldn't send the email. Try again in a minute." }, 502);
  }
  if (sent === "sent") return json({ ok: true, email: r.email });
  if (process.env.NODE_ENV === "production") return json({ error: "Email isn't set up on this site yet." }, 503);
  console.log(`[auth] no RESEND_API_KEY, link for ${r.email}: ${link}`);
  return json({ ok: true, email: r.email, devLink: link });
}
