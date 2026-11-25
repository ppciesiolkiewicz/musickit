/**
 * The look every attunr email shares: the dark card with the logo above it and the seven scale-degree dots along its top.
 * Tables and inline styles only, the one layout every mail program draws the same. No server code here, so a page can
 * build an email too (/admin/admin/invites copies the teacher invite).
 */

/* The app's dark palette as hex (mail programs don't read oklch): slate 950/900/800/400/300/100, sky 400, and the
   logo's seven scale-degree dots. */
const C = { ground: "#020617", card: "#0f172a", line: "#1e293b", muted: "#94a3b8", body: "#cbd5e1", ink: "#f1f5f9", accent: "#38bdf8" };
const DOTS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#6366f1", "#a855f7"];
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

export const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** One row of the card: a heading, a paragraph, a button, a big code, a small line, or the link written out. Text is escaped here. */
export const row = {
  heading: (t: string) => `<tr><td style="padding:32px 32px 8px;font:600 22px/1.3 ${FONT};color:${C.ink};">${esc(t)}</td></tr>`,
  text: (t: string, bottom = 28) => `<tr><td style="padding:0 32px ${bottom}px;font:400 15px/1.6 ${FONT};color:${C.body};">${esc(t)}</td></tr>`,
  button: (label: string, href: string) => `<tr><td style="padding:0 32px 28px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
            <td style="background:${C.accent};border-radius:10px;">
              <a href="${esc(href)}" style="display:inline-block;padding:15px 32px;font:600 15px/1 ${FONT};color:${C.ground};text-decoration:none;border-radius:10px;">${esc(label)}</a>
            </td>
          </tr></table>
        </td></tr>`,
  code: (code: string) => `<tr><td style="padding:0 32px 28px;font:600 32px/1.2 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;letter-spacing:6px;color:${C.ink};">${esc(code)}</td></tr>`,
  small: (t: string) => `<tr><td style="padding:0 32px 28px;font:400 13px/1.6 ${FONT};color:${C.muted};">${esc(t)}</td></tr>`,
  link: (lead: string, href: string) => `<tr><td style="padding:20px 32px 28px;border-top:1px solid ${C.line};font:400 12px/1.6 ${FONT};color:${C.muted};">
          ${esc(lead)}<br>
          <a href="${esc(href)}" style="color:${C.accent};word-break:break-all;">${esc(href)}</a>
        </td></tr>`,
};

/** A whole email: `rows` (from `row`) inside the card, the logo from `origin` above it and `footer` under it. */
export function emailPage(p: { title: string; preheader: string; origin: string; rows: string[]; footer: string }): string {
  const logo = `${esc(p.origin)}/attunr-transparent.png`;
  const dots = DOTS.map((c) => `<td width="14%" height="4" style="background:${c};font-size:0;line-height:0;">&nbsp;</td>`).join("");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>${esc(p.title)}</title>
</head>
<body style="margin:0;padding:0;background:${C.ground};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(p.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.ground};">
<tr><td align="center" style="padding:40px 16px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;">
    <tr><td align="center" style="padding:0 0 28px;">
      <img src="${logo}" width="160" height="60" alt="attunr" style="display:block;border:0;width:160px;height:60px;color:${C.ink};font:600 28px ${FONT};">
    </td></tr>
    <tr><td style="background:${C.card};border:1px solid ${C.line};border-radius:16px;overflow:hidden;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>${dots}</tr></table>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        ${p.rows.join("\n        ")}
      </table>
    </td></tr>
    <tr><td align="center" style="padding:24px 16px 0;font:400 12px/1.6 ${FONT};color:${C.muted};">${esc(p.footer)}</td></tr>
  </table>
</td></tr>
</table>
</body>
</html>
`;
}

/** Who an invite is for: a teacher, or a player on their own plan. */
export type InviteKind = "teacher" | "personal";

const INVITE_WORDS: Record<InviteKind, { subject: string; preheader: string; heading: string; lead: string; what: string; how: string }> = {
  teacher: {
    subject: "Your invite to a free attunr teacher account",
    preheader: "A teacher account on attunr, free for a year.",
    heading: "Your attunr teacher account",
    lead: "You're invited to a teacher account on attunr, free for a year. No card needed.",
    what: "Every student you add gets an account and a plan for their first week.",
    how: "Open the invite and log in with your email or Google. If you're new, this also creates your account, and you join straight away.",
  },
  personal: {
    subject: "Your invite to a free attunr account",
    preheader: "An attunr account of your own, free for a year.",
    heading: "Your attunr account",
    lead: "You're invited to an attunr account of your own, free for a year. No card needed.",
    what: "attunr puts together a practice plan for you: a few short exercises each day for your instrument or your voice.",
    how: "Open the invite and log in with your email or Google. If you're new, this also creates your account. Then set it up and start your plan.",
  },
};

/**
 * An invite, teacher or personal, to paste into an email by hand (/admin/admin/invites, Copy email): its subject, a plain-text
 * part and the HTML part. Nothing sends it; we send it ourselves.
 */
export function inviteEmail(link: string, kind: InviteKind = "teacher"): { subject: string; text: string; html: string } {
  const { subject, preheader, heading, lead, what, how } = INVITE_WORDS[kind];
  const once = "The link works for one account, so keep it to yourself.";
  return {
    subject,
    text: `${lead}\n\n${what}\n\n${how}\n\n${link}\n\n${once}\n`,
    html: emailPage({
      title: subject,
      preheader,
      origin: new URL(link).origin,
      rows: [row.heading(heading), row.text(lead), row.text(what), row.text(how), row.button("Open invite", link), row.small(once), row.link("If Open invite doesn't work, copy this link into your browser:", link)],
      footer: "You got this email because someone at attunr invited you. If it's not for you, ignore it.",
    }),
  };
}
