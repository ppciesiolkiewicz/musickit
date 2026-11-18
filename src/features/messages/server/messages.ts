/**
 * What the message routes do, over any repo: a user posts and reads their threads; we reply, close and reopen at
 * /dev/messages; the contact form adds its messages. Tested over the memory repo (messages.test.ts).
 */

import type { ContactMessage } from "@/features/contact/contact";
import { isUnread, parseBody, parseContext, preview, shouldEmail } from "../model/message";
import { messageEmail } from "./mail";
import type { MessagesRepo, ThreadRow } from "./repo";

export type Mail = { from: string; to: string[]; subject: string; text: string; reply_to?: string; html?: string };
export type Mailer = (mail: Mail) => Promise<unknown>;
type Env = Record<string, string | undefined>;
type Failed = { ok: false; status: 400 | 404; error: string };

const NOT_FOUND: Failed = { ok: false, status: 404, error: "That conversation wasn't found." };

async function ownThread(repo: MessagesRepo, userId: string, threadId: unknown): Promise<ThreadRow | null> {
  if (typeof threadId !== "string" || !threadId) return null;
  const t = await repo.thread(threadId).catch(() => null);
  return t && t.userId === userId ? t : null;
}

/**
 * A user's message: `{ body, context?, threadId?, newThread? }`. Goes into `threadId` (theirs only, reopened if we
 * closed it), or a new thread when `newThread` is set or they have none, else their newest thread. Emails us at most
 * once per thread in 10 minutes; a failed email is logged, the message is kept.
 */
export async function postMessage(repo: MessagesRepo, mailer: Mailer, account: { id: string; email: string; name: string }, raw: unknown, now: Date, env: Env): Promise<{ ok: true; threadId: string } | Failed> {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const body = parseBody(r.body);
  if (!body.ok) return { ok: false, status: 400, error: body.error };
  const context = parseContext(r.context);

  let thread: ThreadRow | null;
  if (r.threadId !== undefined && r.threadId !== null) {
    thread = await ownThread(repo, account.id, r.threadId);
    if (!thread) return NOT_FOUND;
  } else if (r.newThread === true) {
    thread = await repo.createThread({ userId: account.id, email: null, at: now });
  } else {
    thread = (await repo.threadsOf(account.id))[0] ?? (await repo.createThread({ userId: account.id, email: null, at: now }));
  }

  await repo.addMessage({ threadId: thread.id, fromAdmin: false, body: body.body, context, at: now });
  if (thread.status === "closed") await repo.updateThread(thread.id, { status: "open" });
  if (shouldEmail(thread.emailedAt, now)) {
    try {
      await mailer(messageEmail(account, body.body, context, thread.id, env));
      await repo.updateThread(thread.id, { emailedAt: now });
    } catch (e) {
      console.error("message email failed", e);
    }
  }
  return { ok: true, threadId: thread.id };
}

/** The user's threads for the bubble, newest first, and how many have a reply they haven't read. */
export async function userThreads(repo: MessagesRepo, userId: string) {
  const rows = await repo.threadsOf(userId);
  const threads = await Promise.all(
    rows.map(async (t) => {
      const last = await repo.lastMessage(t.id);
      return { id: t.id, lastAt: t.lastAt.toISOString(), preview: last ? preview(last.body) : "", unread: isUnread(t.lastAdminAt, t.userReadAt) };
    }),
  );
  return { threads, unread: threads.filter((t) => t.unread).length };
}

/** How many of the user's threads have a reply they haven't read: the bubble's dot, without the previews. */
export async function unreadCount(repo: MessagesRepo, userId: string): Promise<number> {
  return (await repo.threadsOf(userId)).filter((t) => isUnread(t.lastAdminAt, t.userReadAt)).length;
}

/** One of the user's threads, oldest message first; null when it isn't theirs. The context stays on our side. */
export async function userThread(repo: MessagesRepo, userId: string, threadId: unknown) {
  const t = await ownThread(repo, userId, threadId);
  if (!t) return null;
  const msgs = await repo.messagesOf(t.id);
  return { messages: msgs.map((m) => ({ fromAdmin: m.fromAdmin, body: m.body, at: m.at.toISOString() })) };
}

export async function markRead(repo: MessagesRepo, userId: string, threadId: unknown, now: Date): Promise<boolean> {
  const t = await ownThread(repo, userId, threadId);
  if (!t) return false;
  await repo.updateThread(t.id, { userReadAt: now });
  return true;
}

/** Our reply, from /dev/messages. A contact message from a visitor has no user to read it: we answer those by email. */
export async function adminReply(repo: MessagesRepo, threadId: unknown, rawBody: unknown, now: Date): Promise<{ ok: true } | Failed> {
  const t = typeof threadId === "string" ? await repo.thread(threadId).catch(() => null) : null;
  if (!t) return NOT_FOUND;
  if (!t.userId) return { ok: false, status: 400, error: "This came from the contact form. Answer it by email." };
  const body = parseBody(rawBody);
  if (!body.ok) return { ok: false, status: 400, error: body.error };
  await repo.addMessage({ threadId: t.id, fromAdmin: true, body: body.body, context: null, at: now });
  await repo.updateThread(t.id, { adminReadAt: now });
  return { ok: true };
}

export async function setStatus(repo: MessagesRepo, threadId: unknown, status: unknown): Promise<boolean> {
  if (status !== "open" && status !== "closed") return false;
  const t = typeof threadId === "string" ? await repo.thread(threadId).catch(() => null) : null;
  if (!t) return false;
  await repo.updateThread(t.id, { status });
  return true;
}

/**
 * A contact form message, stored for /dev/messages: always a new thread, the user's when they are signed in, else one
 * with only the email they typed. The contact route emails us itself, so nothing is sent here. Returns the thread id.
 */
export async function addContactMessage(repo: MessagesRepo, c: ContactMessage, userId: string | null): Promise<string> {
  const at = new Date(c.at);
  const t = await repo.createThread({ userId, email: userId ? null : c.email, at });
  await repo.addMessage({ threadId: t.id, fromAdmin: false, body: c.message, context: parseContext({ source: c.source, email: c.email }), at });
  return t.id;
}
