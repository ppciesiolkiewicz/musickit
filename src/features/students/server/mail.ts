import { CLAIM_TTL } from "./students";

/**
 * The email that carries a student's first log-in link. The student did not ask for it, so it says who it is from, what
 * attunr is, what the link does and how long it works. Sent through `sendMail` in `features/account/server/mail.ts`.
 */

type Env = Record<string, string | undefined>;

/** The page the link opens: one button, so a mail scanner opening the link does not spend it. */
export const claimUrl = (base: string, token: string): string => `${base}/claim?token=${encodeURIComponent(token)}`;

const LIFE = `${CLAIM_TTL / (24 * 60 * 60_000)} days`;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** The Resend request body, a plain-text part and an HTML part. `teacherName` is in the subject: who it is from is why it gets opened. */
export function claimEmail(to: string, studentName: string, teacherName: string, link: string, env: Env) {
  const intro = `${teacherName} made an account for you on attunr, an app for practising music with a plan for each week.`;
  const what = "Open this link to log in the first time:";
  const rest = `The link works for ${LIFE}, and only once. After that you log in with this email address.\nIf you don't know ${teacherName}, ignore this email. Nobody can log in without the link.`;
  return {
    from: env.AUTH_FROM_EMAIL?.trim() || env.CONTACT_FROM_EMAIL?.trim() || "attunr <hello@attunr.app>",
    to: [to],
    subject: `${teacherName} made you an attunr account`,
    text: `Hi ${studentName},\n\n${intro}\n\n${what}\n\n${link}\n\n${rest}\n`,
    html: claimHtml(studentName, teacherName, link, intro, what),
  };
}

/* The app's dark palette as hex, as in the log-in email. */
const C = { ground: "#020617", card: "#0f172a", line: "#1e293b", muted: "#94a3b8", body: "#cbd5e1", ink: "#f1f5f9", accent: "#38bdf8" };
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

function claimHtml(studentName: string, teacherName: string, link: string, intro: string, what: string): string {
  const href = esc(link);
  const logo = `${esc(new URL(link).origin)}/attunr-transparent.png`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>${esc(teacherName)} made you an attunr account</title>
</head>
<body style="margin:0;padding:0;background:${C.ground};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.ground};">
<tr><td align="center" style="padding:40px 16px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;">
    <tr><td align="center" style="padding:0 0 28px;">
      <img src="${logo}" width="160" height="60" alt="attunr" style="display:block;border:0;width:160px;height:60px;color:${C.ink};font:600 28px ${FONT};">
    </td></tr>
    <tr><td style="background:${C.card};border:1px solid ${C.line};border-radius:16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td style="padding:32px 32px 8px;font:600 22px/1.3 ${FONT};color:${C.ink};">Hi ${esc(studentName)},</td></tr>
        <tr><td style="padding:0 32px 16px;font:400 15px/1.6 ${FONT};color:${C.body};">${esc(intro)}</td></tr>
        <tr><td style="padding:0 32px 20px;font:400 15px/1.6 ${FONT};color:${C.body};">${esc(what)}</td></tr>
        <tr><td style="padding:0 32px 28px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
            <td style="background:${C.accent};border-radius:10px;">
              <a href="${href}" style="display:inline-block;padding:15px 32px;font:600 15px/1 ${FONT};color:${C.ground};text-decoration:none;border-radius:10px;">Log in</a>
            </td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:0 32px 28px;font:400 13px/1.6 ${FONT};color:${C.muted};">The link works for ${LIFE}, and only once. After that you log in with this email address.</td></tr>
        <tr><td style="padding:20px 32px 28px;border-top:1px solid ${C.line};font:400 12px/1.6 ${FONT};color:${C.muted};">
          If Log in doesn't open, copy this link into your browser:<br>
          <a href="${href}" style="color:${C.accent};word-break:break-all;">${href}</a>
        </td></tr>
      </table>
    </td></tr>
    <tr><td align="center" style="padding:24px 16px 0;font:400 12px/1.6 ${FONT};color:${C.muted};">If you don't know ${esc(teacherName)}, ignore this email. Nobody can log in without the link.</td></tr>
  </table>
</td></tr>
</table>
</body>
</html>
`;
}
