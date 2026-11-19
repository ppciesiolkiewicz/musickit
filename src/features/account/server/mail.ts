import { emailPage, row } from "../emailHtml";
import { LINK_TTL } from "./auth";

/** The email that carries the log-in link, sent through Resend like the contact form. */

type Env = Record<string, string | undefined>;

/** The page the mailed link opens. It shows one button; the token is used only when that is pressed, so a mail scanner opening the link does not spend it. */
export const confirmUrl = (base: string, token: string): string => `${base}/login/confirm?token=${encodeURIComponent(token)}`;

/** How long the link and the code work, in words: "1 hour", "20 minutes". The log-in page shows it too. */
export const LINK_LIFE = LINK_TTL % 3_600_000 === 0 ? (LINK_TTL === 3_600_000 ? "1 hour" : `${LINK_TTL / 3_600_000} hours`) : `${Math.round(LINK_TTL / 60_000)} minutes`;

/**
 * The Resend request body: a plain-text part and an HTML part. The link and the code each log in or, for a new email,
 * make the account. The code is in the subject, so a phone's notice shows it.
 */
export function linkEmail(to: string, link: string, code: string, env: Env) {
  const lead = "Open this link to log in to attunr. If you don't have an account yet, you'll set one up next:";
  const rest = `The link and the code work for ${LINK_LIFE}, and only once.\nIf you didn't ask for them, ignore this email. Nobody can log in without them.`;
  return {
    from: env.AUTH_FROM_EMAIL?.trim() || env.CONTACT_FROM_EMAIL?.trim() || "attunr <hello@attunr.app>",
    to: [to],
    subject: `Your attunr log-in code: ${code}`,
    text: `${lead}\n\n${link}\n\nOr type this code on the log-in page: ${code}\n\n${rest}\n`,
    html: linkHtml(link, code),
  };
}

/** The HTML part, in the look every attunr email shares (`emailHtml.ts`). */
function linkHtml(link: string, code: string): string {
  return emailPage({
    title: "Your attunr log-in link",
    preheader: `Your code is ${code}. It works for ${LINK_LIFE}, and only once.`,
    origin: new URL(link).origin,
    rows: [
      row.heading("Log in to attunr"),
      row.text("Press Log in below to finish logging in. If you don't have an account yet, you'll set one up next."),
      row.button("Log in", link),
      row.text("Or type this code on the log-in page:", 8),
      row.code(code),
      row.small(`The link and the code work for ${LINK_LIFE}, and only once.`),
      row.link("If Log in doesn't open, copy this link into your browser:", link),
    ],
    footer: "If you didn't ask for them, ignore this email. Nobody can log in without them.",
  });
}

/** How long one try at Resend may take, and how many tries. Two 8 s tries keep the log-in page's wait under 20 s. */
export const MAIL_TIMEOUT = 8_000;
export const MAIL_TRIES = 2;

/**
 * "sent", or "off" when there is no RESEND_API_KEY. A try that times out, can't connect, or gets a 429 or 5xx is tried
 * once more, with the same Idempotency-Key so Resend never sends the email twice. Throws with Resend's reason when the
 * mail is refused or the last try fails.
 */
export async function sendMail(mail: { from: string; to: string[]; subject: string; text: string; html?: string; reply_to?: string }, env: Env = process.env, fetcher: typeof fetch = fetch): Promise<"sent" | "off"> {
  const apiKey = env.RESEND_API_KEY?.trim();
  if (!apiKey) return "off";
  const headers = { authorization: `Bearer ${apiKey}`, "content-type": "application/json", "idempotency-key": crypto.randomUUID() };
  let reason = "";
  for (let attempt = 1; attempt <= MAIL_TRIES; attempt++) {
    let res: Response;
    try {
      res = await fetcher("https://api.resend.com/emails", { method: "POST", headers, body: JSON.stringify(mail), signal: AbortSignal.timeout(MAIL_TIMEOUT) });
    } catch (e) {
      reason = e instanceof Error && e.name === "TimeoutError" ? `resend timed out after ${MAIL_TIMEOUT / 1000} s` : `resend unreachable: ${e instanceof Error ? e.message : String(e)}`;
      continue;
    }
    if (res.ok) return "sent";
    reason = `resend ${res.status}: ${(await res.text().catch(() => "")).slice(0, 500)}`;
    if (res.status !== 429 && res.status < 500) break;
  }
  throw new Error(reason);
}
