import { devGate } from "@/features/devtools/gate";
import { isUnread } from "@/features/messages/model/message";
import { adminReply, setStatus } from "@/features/messages/server/messages";
import { messagesStore } from "@/features/messages/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "cache-control": "no-store" } });
const NO_DB = "No database: set DATABASE_URL.";

/**
 * /admin/messages (dev only for now): `?status=open|closed|all` lists threads, `?thread=<id>` one thread with every message's
 * context, marking it read on our side.
 */
export async function GET(req: Request) {
  const gate = devGate();
  if (gate) return gate;
  const store = messagesStore();
  if (!store) return json({ error: NO_DB }, 503);
  const q = new URL(req.url).searchParams;
  const id = q.get("thread");
  if (id) {
    const thread = await store.repo.thread(id).catch(() => null);
    if (!thread) return json({ error: "Not found." }, 404);
    const messages = await store.repo.messagesOf(thread.id);
    await store.repo.updateThread(thread.id, { adminReadAt: new Date() });
    return json({ thread, messages });
  }
  const s = q.get("status");
  const threads = await store.repo.allThreads({ status: s === "closed" || s === "open" ? s : s === "all" ? undefined : "open", limit: 200 });
  return json({ threads: threads.map((t) => ({ ...t, unread: isUnread(t.lastUserAt, t.adminReadAt) })) });
}

/** Our reply: JSON `{ threadId, body }`. */
export async function POST(req: Request) {
  const gate = devGate();
  if (gate) return gate;
  const store = messagesStore();
  if (!store) return json({ error: NO_DB }, 503);
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const r = await adminReply(store.repo, body?.threadId, body?.body, new Date());
  return r.ok ? json(r) : json({ error: r.error }, r.status);
}

/** Close or reopen: JSON `{ threadId, status }`. */
export async function PATCH(req: Request) {
  const gate = devGate();
  if (gate) return gate;
  const store = messagesStore();
  if (!store) return json({ error: NO_DB }, 503);
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  return (await setStatus(store.repo, body?.threadId, body?.status)) ? json({ ok: true }) : json({ error: "Not found." }, 404);
}
