import { emailPage, row } from "@/features/account/emailHtml";
import { offPageUrl, offPostUrl } from "./token";

type Env = Record<string, string | undefined>;

/** The daily reminder email, with an unsubscribe link and the one-click unsubscribe headers Gmail and Yahoo ask for. */
export function reminderEmail(to: string, body: string, base: string, token: string, env: Env) {
  const plan = `${base}/plan`;
  const off = offPageUrl(base, token);
  return {
    from: env.AUTH_FROM_EMAIL?.trim() || env.CONTACT_FROM_EMAIL?.trim() || "attunr <hello@attunr.app>",
    to: [to],
    subject: "Time to practise",
    text: `${body}\n\nOpen today's plan: ${plan}\n\nYou get this email at the time you chose on the Practice plan page.\nStop these emails: ${off}\n`,
    html: emailPage({
      title: "Time to practise",
      preheader: body,
      origin: new URL(base).origin,
      rows: [row.heading("Time to practise"), row.text(body), row.button("Open today's plan", plan), row.link("Stop these emails:", off)],
      footer: "You get this email at the time you chose on the Practice plan page.",
    }),
    headers: { "List-Unsubscribe": `<${offPostUrl(base, token)}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
  };
}
