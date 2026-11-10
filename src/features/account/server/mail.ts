import { LINK_TTL } from "./auth";

/** The email that carries a log-in or register link, sent through Resend like the contact form. */

type Env = Record<string, string | undefined>;

/** The page the mailed link opens. It shows one button; the token is used only when that is pressed, so a mail scanner opening the link does not spend it. */
export const confirmUrl = (base: string, token: string): string => `${base}/login/confirm?token=${encodeURIComponent(token)}`;

const MINUTES = Math.round(LINK_TTL / 60_000);

/** The Resend request body. `register` words it for a new account. */
export function linkEmail(to: string, link: string, register: boolean, env: Env) {
  const lead = register ? "Open this link to create your attunr account:" : "Open this link to log in to attunr:";
  const rest = `The link works for ${MINUTES} minutes, and only once.\nIf you didn't ask for it, ignore this email. Nobody can log in without the link.`;
  return {
    from: env.AUTH_FROM_EMAIL?.trim() || env.CONTACT_FROM_EMAIL?.trim() || "attunr <hello@attunr.app>",
    to: [to],
    subject: register ? "Create your attunr account" : "Your attunr log-in link",
    text: `${lead}\n\n${link}\n\n${rest}\n`,
  };
}

/** "sent", or "off" when there is no RESEND_API_KEY. Throws when Resend refuses the mail. */
export async function sendMail(mail: ReturnType<typeof linkEmail>, env: Env = process.env, fetcher: typeof fetch = fetch): Promise<"sent" | "off"> {
  const apiKey = env.RESEND_API_KEY?.trim();
  if (!apiKey) return "off";
  const res = await fetcher("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify(mail),
  });
  if (!res.ok) throw new Error(`resend ${res.status}`);
  return "sent";
}
