import { LINK_TTL } from "./auth";

/** The email that carries the log-in link, sent through Resend like the contact form. */

type Env = Record<string, string | undefined>;

/** The page the mailed link opens. It shows one button; the token is used only when that is pressed, so a mail scanner opening the link does not spend it. */
export const confirmUrl = (base: string, token: string): string => `${base}/login/confirm?token=${encodeURIComponent(token)}`;

/** How long the link and the code work, in words: "1 hour", "20 minutes". The log-in page shows it too. */
export const LINK_LIFE = LINK_TTL % 3_600_000 === 0 ? (LINK_TTL === 3_600_000 ? "1 hour" : `${LINK_TTL / 3_600_000} hours`) : `${Math.round(LINK_TTL / 60_000)} minutes`;

/**
 * The Resend request body: a plain-text part and an HTML part. The link and the code each log in or, for a new email,
 * lead to the account setup. The code is in the subject, so a phone's notice shows it.
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

/* The app's dark palette as hex (mail programs don't read oklch): slate 950/900/800/400/300/100, sky 400, and the
   logo's seven scale-degree dots. */
const C = { ground: "#020617", card: "#0f172a", line: "#1e293b", muted: "#94a3b8", body: "#cbd5e1", ink: "#f1f5f9", accent: "#38bdf8" };
const DOTS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#6366f1", "#a855f7"];
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** The HTML part: tables and inline styles only, the one layout every mail program draws the same. */
function linkHtml(link: string, code: string): string {
  const href = esc(link);
  const logo = `${esc(new URL(link).origin)}/attunr-transparent.png`;
  const dots = DOTS.map((c) => `<td width="14%" height="4" style="background:${c};font-size:0;line-height:0;">&nbsp;</td>`).join("");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>Your attunr log-in link</title>
</head>
<body style="margin:0;padding:0;background:${C.ground};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">Your code is ${esc(code)}. It works for ${LINK_LIFE}, and only once.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.ground};">
<tr><td align="center" style="padding:40px 16px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;">
    <tr><td align="center" style="padding:0 0 28px;">
      <img src="${logo}" width="160" height="60" alt="attunr" style="display:block;border:0;width:160px;height:60px;color:${C.ink};font:600 28px ${FONT};">
    </td></tr>
    <tr><td style="background:${C.card};border:1px solid ${C.line};border-radius:16px;overflow:hidden;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>${dots}</tr></table>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td style="padding:32px 32px 8px;font:600 22px/1.3 ${FONT};color:${C.ink};">Log in to attunr</td></tr>
        <tr><td style="padding:0 32px 28px;font:400 15px/1.6 ${FONT};color:${C.body};">Press Log in below to finish logging in. If you don't have an account yet, you'll set one up next.</td></tr>
        <tr><td style="padding:0 32px 28px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
            <td style="background:${C.accent};border-radius:10px;">
              <a href="${href}" style="display:inline-block;padding:15px 32px;font:600 15px/1 ${FONT};color:${C.ground};text-decoration:none;border-radius:10px;">Log in</a>
            </td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:0 32px 8px;font:400 15px/1.6 ${FONT};color:${C.body};">Or type this code on the log-in page:</td></tr>
        <tr><td style="padding:0 32px 28px;font:600 32px/1.2 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;letter-spacing:6px;color:${C.ink};">${esc(code)}</td></tr>
        <tr><td style="padding:0 32px 28px;font:400 13px/1.6 ${FONT};color:${C.muted};">The link and the code work for ${LINK_LIFE}, and only once.</td></tr>
        <tr><td style="padding:20px 32px 28px;border-top:1px solid ${C.line};font:400 12px/1.6 ${FONT};color:${C.muted};">
          If Log in doesn't open, copy this link into your browser:<br>
          <a href="${href}" style="color:${C.accent};word-break:break-all;">${href}</a>
        </td></tr>
      </table>
    </td></tr>
    <tr><td align="center" style="padding:24px 16px 0;font:400 12px/1.6 ${FONT};color:${C.muted};">If you didn't ask for them, ignore this email. Nobody can log in without them.</td></tr>
  </table>
</td></tr>
</table>
</body>
</html>
`;
}

/** "sent", or "off" when there is no RESEND_API_KEY. Throws when Resend refuses the mail, with Resend's reason. */
export async function sendMail(mail: ReturnType<typeof linkEmail>, env: Env = process.env, fetcher: typeof fetch = fetch): Promise<"sent" | "off"> {
  const apiKey = env.RESEND_API_KEY?.trim();
  if (!apiKey) return "off";
  const res = await fetcher("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify(mail),
  });
  if (!res.ok) throw new Error(`resend ${res.status}: ${(await res.text().catch(() => "")).slice(0, 500)}`);
  return "sent";
}
