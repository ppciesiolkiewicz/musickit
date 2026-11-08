/** Contact messages from the site: what a request may carry, where each one is stored, and the email we send about it. */

export const CONTACT_PREFIX = "contact/";
export const MAX_MESSAGE = 4000;

export interface ContactMessage {
  email: string;
  message: string;
  /** the page section the form sat in */
  source: string;
  at: number;
}

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$/;

/** A message from the raw request body, or the reason it is refused. A filled `website` (a hidden honeypot field) is a bot: quiet ok, nothing stored. */
export function parseContact(body: unknown, now: number): { ok: true; contact: ContactMessage } | { ok: true; bot: true } | { ok: false; error: string } {
  if (!body || typeof body !== "object") return { ok: false, error: "Bad request." };
  const b = body as Record<string, unknown>;
  if (typeof b.website === "string" && b.website.trim()) return { ok: true, bot: true };
  const email = typeof b.email === "string" ? b.email.trim().toLowerCase() : "";
  if (!EMAIL.test(email)) return { ok: false, error: "That email doesn't look right." };
  const message = typeof b.message === "string" ? b.message.trim() : "";
  if (!message) return { ok: false, error: "Please write a short message." };
  if (message.length > MAX_MESSAGE) return { ok: false, error: "That message is too long." };
  const source = typeof b.source === "string" ? b.source.slice(0, 40).replace(/[^\w-]/g, "") : "";
  return { ok: true, contact: { email, message, source, at: now } };
}

/** One blob per message, named by time then a random tail, so two at once never overwrite each other. */
export const contactPath = (c: ContactMessage, rand: string) => `${CONTACT_PREFIX}${new Date(c.at).toISOString().replace(/[:.]/g, "-")}-${rand}.json`;

/** Where messages are emailed. `CONTACT_TO_EMAIL` overrides the default. */
export const contactTo = (env: Record<string, string | undefined>) => env.CONTACT_TO_EMAIL?.trim() || "attunrapp@gmail.com";

/** The Resend request body for a message. Reply-To is the sender, so answering the email answers them. */
export function contactEmail(c: ContactMessage, env: Record<string, string | undefined>) {
  return {
    from: env.CONTACT_FROM_EMAIL?.trim() || "attunr <hello@attunr.app>",
    to: [contactTo(env)],
    reply_to: c.email,
    subject: `attunr contact${c.source ? ` (${c.source})` : ""}: ${c.email}`,
    text: `From: ${c.email}\nSection: ${c.source || "-"}\nAt: ${new Date(c.at).toISOString()}\n\n${c.message}\n`,
  };
}
