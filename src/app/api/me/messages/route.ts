import { NO_ACCOUNTS, json, readJson } from "@/features/account/server/http";
import { sendMail } from "@/features/account/server/mail";
import { postMessage, unreadCount, userThread, userThreads } from "@/features/messages/server/messages";
import { messagesStore } from "@/features/messages/server/store";
import { signedIn } from "@/features/userData/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The signed-in user's messages: `{ threads, unread }`; `?count=1` only `{ unread }`; `?thread=<id>` that thread's `{ messages }`. */
export async function GET(req: Request) {
  const me = await signedIn(req);
  if (me instanceof Response) return me;
  const store = messagesStore();
  if (!store) return json({ error: NO_ACCOUNTS }, 503, me.cookies);
  const q = new URL(req.url).searchParams;
  if (q.get("count")) return json({ unread: await unreadCount(store.repo, me.account.id) }, 200, me.cookies);
  const id = q.get("thread");
  if (id) {
    const thread = await userThread(store.repo, me.account.id, id);
    return thread ? json(thread, 200, me.cookies) : json({ error: "That conversation wasn't found." }, 404, me.cookies);
  }
  return json(await userThreads(store.repo, me.account.id), 200, me.cookies);
}

/** Send a message: JSON `{ body, context?, threadId?, newThread? }` → `{ ok, threadId }`. */
export async function POST(req: Request) {
  const me = await signedIn(req);
  if (me instanceof Response) return me;
  const store = messagesStore();
  if (!store) return json({ error: NO_ACCOUNTS }, 503, me.cookies);
  const body = await readJson(req);
  if (!body) return json({ error: "Bad request." }, 400, me.cookies);
  const r = await postMessage(store.repo, (m) => sendMail(m, process.env), me.account, body, new Date(), process.env);
  return r.ok ? json(r, 200, me.cookies) : json({ error: r.error }, r.status, me.cookies);
}
