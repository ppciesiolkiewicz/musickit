import { contactTo } from "@/features/contact/contact";
import type { MessageContext } from "../model/message";

type Env = Record<string, string | undefined>;

/** The email we get about a new message: who, the text, where it was sent from, and a link to answer it. */
export function messageEmail(account: { email: string; name: string }, body: string, context: MessageContext | null, threadId: string, env: Env) {
  const where = [
    context?.path && `Page: ${context.path}`,
    context?.title && `Title: ${context.title}`,
    context?.under?.length && `Under: ${context.under.join(" › ")}`,
    context?.ref && `About: ${context.ref}`,
    context?.selection && `Selected: "${context.selection}"`,
    context?.source && `From: ${context.source}`,
  ].filter(Boolean);
  return {
    from: env.CONTACT_FROM_EMAIL?.trim() || "attunr <hello@attunr.app>",
    to: [contactTo(env)],
    reply_to: account.email,
    subject: `Message from ${account.name || account.email}`,
    text: `${account.name} <${account.email}>\n\n${body}\n\n${where.join("\n")}${where.length ? "\n\n" : ""}Answer it: http://localhost:3000/admin/admin/messages?thread=${threadId}\n`,
  };
}
