import { createHmac, timingSafeEqual } from "node:crypto";

const mac = (userId: string, secret: string) => createHmac("sha256", secret).update(`reminder-off:${userId}`).digest("base64url");

/** The token in a reminder email's unsubscribe link: the account id and its HMAC. It never expires. */
export const offToken = (userId: string, secret: string): string => `${userId}.${mac(userId, secret)}`;

/** The account id a token names, or null when it wasn't signed with `secret`. */
export function readOffToken(token: string, secret: string): string | null {
  const dot = token.lastIndexOf(".");
  if (dot <= 0 || !secret) return null;
  const userId = token.slice(0, dot);
  const got = Buffer.from(token.slice(dot + 1));
  const want = Buffer.from(mac(userId, secret));
  return got.length === want.length && timingSafeEqual(got, want) ? userId : null;
}

/** The page the email's link opens: one button, so a mail scanner opening it changes nothing. */
export const offPageUrl = (base: string, token: string) => `${base}/reminders/off?token=${encodeURIComponent(token)}`;
/** Where a mail program's one-click unsubscribe posts. */
export const offPostUrl = (base: string, token: string) => `${base}/api/reminders/off?token=${encodeURIComponent(token)}`;
