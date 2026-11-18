/** What a message may carry, checked on the server: the text, where it was sent from, and when each side last read. */

import { EMAIL, MAX_MESSAGE } from "@/features/contact/contact";

/**
 * Where a message was sent from, read from the page without asking the user: the path, the page title, the headings
 * above what was on screen, the exercise/plan/section id when the URL names one, the text they had selected. `source`
 * and `email` are set by the server for the feedback page and the contact form.
 */
export type MessageContext = { path?: string; title?: string; under?: string[]; ref?: string; selection?: string; source?: string; email?: string };

export const MAX_SELECTION = 500;
/** We are emailed about a thread at most once in this long. */
export const EMAIL_GAP_MS = 10 * 60_000;

export function parseBody(raw: unknown): { ok: true; body: string } | { ok: false; error: string } {
  const body = typeof raw === "string" ? raw.trim() : "";
  if (!body) return { ok: false, error: "Write a message first." };
  if (body.length > MAX_MESSAGE) return { ok: false, error: "That message is too long." };
  return { ok: true, body };
}

const str = (v: unknown, max: number): string | undefined => {
  const s = typeof v === "string" ? v.trim().slice(0, max) : "";
  return s || undefined;
};

/** The usable part of a context the client sent, or null when nothing is. A path must be on this site. */
export function parseContext(raw: unknown): MessageContext | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const path = str(r.path, 300);
  const under = Array.isArray(r.under) ? r.under.map((u) => str(u, 80)).filter((u): u is string => !!u).slice(0, 4) : [];
  const email = str(r.email, 254)?.toLowerCase();
  const c: MessageContext = {
    path: path && path.startsWith("/") && !path.startsWith("//") && !path.includes("\\") ? path : undefined,
    title: str(r.title, 120),
    under: under.length ? under : undefined,
    ref: str(r.ref, 80),
    selection: str(r.selection, MAX_SELECTION),
    source: str(r.source, 80),
    email: email && EMAIL.test(email) ? email : undefined,
  };
  const kept = Object.fromEntries(Object.entries(c).filter(([, v]) => v !== undefined)) as MessageContext;
  return Object.keys(kept).length ? kept : null;
}

/** The first line of a message, for lists. */
export function preview(body: string): string {
  const line = body.trim().split("\n")[0].trim();
  return line.length > 80 ? `${line.slice(0, 79)}…` : line;
}

/** Whether the other side wrote after this side last read. */
export const isUnread = (lastFromOther: Date | null, readAt: Date | null): boolean => !!lastFromOther && (!readAt || lastFromOther > readAt);

export const shouldEmail = (emailedAt: Date | null, now: Date): boolean => !emailedAt || now.getTime() - emailedAt.getTime() >= EMAIL_GAP_MS;
