import { NO_ACCOUNTS, json, readJson } from "@/features/account/server/http";
import { markRead } from "@/features/messages/server/messages";
import { messagesStore } from "@/features/messages/server/store";
import { signedIn } from "@/features/userData/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The user has read a thread: JSON `{ threadId }`. */
export async function POST(req: Request) {
  const me = await signedIn(req);
  if (me instanceof Response) return me;
  const store = messagesStore();
  if (!store) return json({ error: NO_ACCOUNTS }, 503, me.cookies);
  const body = await readJson(req);
  const ok = await markRead(store.repo, me.account.id, body?.threadId, new Date());
  return ok ? json({ ok: true }, 200, me.cookies) : json({ error: "That conversation wasn't found." }, 404, me.cookies);
}
